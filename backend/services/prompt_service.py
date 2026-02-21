from db import get_connection


def build_system_prompt(persona_id: int, demo_context: str = "") -> str:
    """Build the full system prompt by injecting objections and demo context."""
    conn = get_connection()

    persona = conn.execute("SELECT * FROM personas WHERE id = ?", (persona_id,)).fetchone()
    if not persona:
        conn.close()
        raise ValueError(f"Persona {persona_id} not found")

    # Get objections for this persona
    objections = conn.execute(
        "SELECT * FROM objections WHERE persona_id = ? ORDER BY difficulty DESC",
        (persona_id,)
    ).fetchall()
    conn.close()

    template = persona["system_prompt"]

    # Build objection injection block
    if objections:
        lines = ["OBJECTIONS TO USE (deploy these naturally during the conversation):"]
        for obj in objections:
            lines.append(
                f"- [{obj['category'].upper()}] (difficulty {obj['difficulty']}/5) "
                f"\"{obj['objection_text']}\" "
                f"(trigger: {obj['trigger_context'] or 'any appropriate moment'})"
            )
        objection_block = "\n".join(lines)
    else:
        objection_block = (
            "No specific objections loaded. Generate contextually appropriate "
            "interruptions and challenges based on your persona and the demo content."
        )

    # Build demo context block
    if demo_context:
        context_block = f"DEMO CONTEXT (what the presenter will be showing):\n{demo_context}"
    else:
        context_block = ""

    # Replace placeholders
    prompt = template.replace("{INJECTED_OBJECTIONS}", objection_block)
    prompt = prompt.replace("{DEMO_CONTEXT}", context_block)

    return prompt
