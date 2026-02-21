from fastapi import APIRouter, HTTPException
from models import SessionStartRequest, SessionMarkRequest, SessionUpdateRequest
from db import get_connection
from services.prompt_service import build_system_prompt
from services.agent_service import update_agent_for_session, get_signed_url, get_conversation_transcript
import json

router = APIRouter()


@router.post("/start")
async def start_session(data: SessionStartRequest):
    conn = get_connection()
    persona = conn.execute("SELECT * FROM personas WHERE id = ?", (data.persona_id,)).fetchone()
    if not persona:
        conn.close()
        raise HTTPException(status_code=404, detail="Persona not found")

    # Build dynamic prompt
    prompt = build_system_prompt(data.persona_id, data.demo_context or "")

    # Update agent with session-specific config
    try:
        await update_agent_for_session(prompt, persona["voice_id"], data.llm_model, data.tts_model)
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to configure agent: {e}")

    # Generate signed URL
    try:
        signed_url = await get_signed_url()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Failed to get signed URL: {e}")

    # Create session record
    cursor = conn.execute(
        """INSERT INTO sessions (persona_id, demo_context, status)
           VALUES (?, ?, 'active')""",
        (data.persona_id, data.demo_context),
    )
    conn.commit()
    session_id = cursor.lastrowid
    session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()

    return {
        "session_id": session_id,
        "signed_url": signed_url,
        "persona": dict(persona),
        "duration_minutes": data.duration_minutes,
    }


@router.post("/{session_id}/end")
async def end_session(session_id: int, conversation_id: str = None):
    conn = get_connection()
    session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    # Try to retrieve transcript from ElevenLabs
    transcript_json = None
    if conversation_id:
        transcript_data = await get_conversation_transcript(conversation_id)
        if transcript_data:
            transcript_json = json.dumps(transcript_data)

    # Calculate duration
    conn.execute(
        """UPDATE sessions SET
           status = 'completed',
           ended_at = CURRENT_TIMESTAMP,
           duration_seconds = CAST((julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 86400 AS INTEGER),
           elevenlabs_conversation_id = COALESCE(?, elevenlabs_conversation_id),
           transcript_json = COALESCE(?, transcript_json)
           WHERE id = ?""",
        (conversation_id, transcript_json, session_id),
    )
    conn.commit()
    session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return {"session": dict(session)}


@router.post("/{session_id}/mark")
async def mark_moment(session_id: int, data: SessionMarkRequest):
    conn = get_connection()
    session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    cursor = conn.execute(
        """INSERT INTO session_events (session_id, event_type, timestamp_seconds, agent_text, user_text, notes)
           VALUES (?, 'note', ?, ?, ?, ?)""",
        (session_id, data.timestamp_seconds, data.agent_text, data.user_text, data.notes),
    )
    conn.commit()
    event = conn.execute("SELECT * FROM session_events WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return {"event": dict(event)}


@router.patch("/{session_id}")
async def update_session(session_id: int, data: SessionUpdateRequest):
    conn = get_connection()
    session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [session_id]
        conn.execute(f"UPDATE sessions SET {set_clause} WHERE id = ?", values)
        conn.commit()

    session = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return {"session": dict(session)}


@router.get("/stats")
async def session_stats():
    conn = get_connection()
    stats = conn.execute("""
        SELECT
            COUNT(*) as total_sessions,
            AVG(overall_rating) as avg_rating,
            AVG(duration_seconds) as avg_duration,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions
        FROM sessions
    """).fetchone()
    conn.close()
    return dict(stats)


@router.get("")
async def list_sessions():
    conn = get_connection()
    rows = conn.execute("""
        SELECT s.*, p.name as persona_name
        FROM sessions s
        LEFT JOIN personas p ON s.persona_id = p.id
        ORDER BY s.started_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{session_id}")
async def get_session(session_id: int):
    conn = get_connection()
    session = conn.execute("""
        SELECT s.*, p.name as persona_name
        FROM sessions s
        LEFT JOIN personas p ON s.persona_id = p.id
        WHERE s.id = ?
    """, (session_id,)).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")

    events = conn.execute(
        "SELECT * FROM session_events WHERE session_id = ? ORDER BY timestamp_seconds",
        (session_id,)
    ).fetchall()
    conn.close()

    return {"session": dict(session), "events": [dict(e) for e in events]}
