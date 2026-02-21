from fastapi import APIRouter, HTTPException
from models import PersonaCreate, PersonaUpdate, Persona
from db import get_connection

router = APIRouter()


@router.get("")
async def list_personas():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM personas ORDER BY is_default DESC, name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("")
async def create_persona(data: PersonaCreate):
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO personas (name, description, type, system_prompt, voice_id, voice_name, avatar_color)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (data.name, data.description, data.type, data.system_prompt,
         data.voice_id, data.voice_name, data.avatar_color),
    )
    conn.commit()
    persona = conn.execute("SELECT * FROM personas WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return {"persona": dict(persona)}


@router.get("/{persona_id}")
async def get_persona(persona_id: int):
    conn = get_connection()
    persona = conn.execute("SELECT * FROM personas WHERE id = ?", (persona_id,)).fetchone()
    conn.close()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return dict(persona)


@router.patch("/{persona_id}")
async def update_persona(persona_id: int, data: PersonaUpdate):
    conn = get_connection()
    persona = conn.execute("SELECT * FROM personas WHERE id = ?", (persona_id,)).fetchone()
    if not persona:
        conn.close()
        raise HTTPException(status_code=404, detail="Persona not found")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [persona_id]
        conn.execute(
            f"UPDATE personas SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            values,
        )
        conn.commit()

    persona = conn.execute("SELECT * FROM personas WHERE id = ?", (persona_id,)).fetchone()
    conn.close()
    return {"persona": dict(persona)}


@router.delete("/{persona_id}")
async def delete_persona(persona_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM personas WHERE id = ?", (persona_id,))
    conn.commit()
    conn.close()
    return {"success": True}


@router.post("/{persona_id}/preview")
async def preview_voice(persona_id: int):
    """Generate a short TTS preview for the persona's voice."""
    conn = get_connection()
    persona = conn.execute("SELECT * FROM personas WHERE id = ?", (persona_id,)).fetchone()
    conn.close()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    try:
        from elevenlabs.client import ElevenLabs
        from config import settings
        from fastapi.responses import StreamingResponse
        import io

        client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
        audio = client.text_to_speech.convert(
            voice_id=persona["voice_id"],
            text=f"Hi, I'm {persona['name']}. Let's practice handling some tough objections.",
            model_id=settings.TTS_MODEL,
        )
        audio_bytes = b"".join(audio)
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
