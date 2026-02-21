import json
from pathlib import Path
from config import settings
from db import get_connection


async def generate_coaching_report(session_id: int) -> dict:
    """Generate an AI coaching report for a completed session using Claude Opus."""
    conn = get_connection()

    # Fetch session
    session = conn.execute("""
        SELECT s.*, p.name as persona_name, p.type as persona_type
        FROM sessions s
        LEFT JOIN personas p ON s.persona_id = p.id
        WHERE s.id = ?
    """, (session_id,)).fetchone()
    if not session:
        conn.close()
        raise ValueError(f"Session {session_id} not found")

    # Parse transcript
    transcript_text = ""
    if session["transcript_json"]:
        try:
            parsed = json.loads(session["transcript_json"])
            entries = parsed.get("transcript", parsed) if isinstance(parsed, dict) else parsed
            if isinstance(entries, list):
                for entry in entries:
                    role = entry.get("role", entry.get("speaker", "unknown"))
                    text = entry.get("message", entry.get("text", ""))
                    label = "Presenter" if role in ("user", "human") else session["persona_name"] or "Agent"
                    transcript_text += f"{label}: {text}\n"
        except json.JSONDecodeError:
            pass

    if not transcript_text.strip():
        conn.close()
        raise ValueError("No transcript available for this session")

    # Fetch research data for this session
    research_rows = conn.execute(
        "SELECT * FROM research WHERE session_id = ?", (session_id,)
    ).fetchall()
    research_context = ""
    if research_rows:
        research_lines = ["## Research Intelligence"]
        for r in research_rows:
            try:
                results = json.loads(r["results_json"])
                research_lines.append(f"\n### {r['research_type'].title()} Research: {r['query']}")
                research_lines.append(results.get("content", ""))
            except (json.JSONDecodeError, KeyError):
                pass
        research_context = "\n".join(research_lines)

    # Fetch KB documents for accuracy checking
    kb_context = ""
    try:
        from services.agent_service import get_agent_id
        from elevenlabs.client import ElevenLabs

        agent_id = get_agent_id()
        if agent_id and settings.ELEVENLABS_API_KEY:
            client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
            agent = client.conversational_ai.agents.get(agent_id=agent_id)
            kb_docs = []
            if hasattr(agent, 'conversation_config') and agent.conversation_config:
                config = agent.conversation_config
                if hasattr(config, 'agent') and hasattr(config.agent, 'prompt'):
                    if hasattr(config.agent.prompt, 'knowledge_base'):
                        for doc in config.agent.prompt.knowledge_base:
                            name = doc.name if hasattr(doc, 'name') else "Unknown"
                            content = doc.content if hasattr(doc, 'content') else ""
                            if content:
                                kb_docs.append(f"### {name}\n{content[:3000]}")
            if kb_docs:
                kb_context = "## Product Documentation (Knowledge Base)\nFlag any statements by the presenter that contradict or misrepresent information in the product documentation below.\n\n" + "\n\n".join(kb_docs)
    except Exception:
        pass  # KB access is optional

    conn.close()

    # Load and fill prompt template
    prompt_template = (Path(__file__).parent.parent / "prompts" / "evaluation.txt").read_text()
    duration_str = f"{session['duration_seconds'] // 60}m {session['duration_seconds'] % 60}s" if session["duration_seconds"] else "Unknown"

    prompt = prompt_template.replace("{PERSONA_NAME}", session["persona_name"] or "Unknown")
    prompt = prompt.replace("{PERSONA_TYPE}", session["persona_type"] or "unknown")
    prompt = prompt.replace("{DEMO_CONTEXT}", session["demo_context"] or "Not specified")
    prompt = prompt.replace("{DURATION}", duration_str)
    prompt = prompt.replace("{RESEARCH_CONTEXT}", research_context)
    prompt = prompt.replace("{KB_CONTEXT}", kb_context)
    prompt = prompt.replace("{TRANSCRIPT}", transcript_text)

    # Call Claude Opus
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    import anthropic
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = response.content[0].text

    # Parse the JSON response
    try:
        # Try direct parse
        report = json.loads(raw_text)
    except json.JSONDecodeError:
        # Try extracting from markdown code block
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1
        if start >= 0 and end > start:
            report = json.loads(raw_text[start:end])
        else:
            raise ValueError("Failed to parse coaching report from LLM response")

    # Store in DB
    conn = get_connection()
    conn.execute("""
        INSERT OR REPLACE INTO coaching_reports
        (session_id, overall_score, scores_json, strengths_json, improvements_json,
         moments_json, summary, kb_flags_json, raw_response, model_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        report.get("overall_score", 5),
        json.dumps(report.get("scores", {})),
        json.dumps(report.get("strengths", [])),
        json.dumps(report.get("improvements", [])),
        json.dumps(report.get("moments", [])),
        report.get("summary", ""),
        json.dumps(report.get("kb_flags", [])),
        raw_text,
        "claude-opus-4-6",
    ))
    conn.commit()

    # Fetch the stored report
    stored = conn.execute(
        "SELECT * FROM coaching_reports WHERE session_id = ?", (session_id,)
    ).fetchone()
    conn.close()

    return _format_report(stored)


def get_report(session_id: int) -> dict | None:
    """Fetch an existing coaching report for a session."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM coaching_reports WHERE session_id = ?", (session_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return _format_report(row)


def _format_report(row) -> dict:
    """Format a coaching_reports DB row into a response dict."""
    return {
        "id": row["id"],
        "session_id": row["session_id"],
        "overall_score": row["overall_score"],
        "scores": json.loads(row["scores_json"]),
        "strengths": json.loads(row["strengths_json"]),
        "improvements": json.loads(row["improvements_json"]),
        "moments": json.loads(row["moments_json"]),
        "summary": row["summary"],
        "kb_flags": json.loads(row["kb_flags_json"]) if row["kb_flags_json"] else [],
        "model_used": row["model_used"],
        "created_at": row["created_at"],
    }
