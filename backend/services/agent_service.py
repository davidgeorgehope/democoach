import httpx
import json
from config import settings
from db import get_config, set_config

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/convai"

DEFAULT_PROMPT = "You are a helpful assistant for practicing sales demos."


def _headers():
    return {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }


async def ensure_agent_exists():
    """Create ElevenLabs agent on first startup, or verify existing one."""
    agent_id = get_config("agent_id")
    if agent_id:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{ELEVENLABS_BASE}/agents/{agent_id}",
                    headers=_headers(),
                    timeout=15.0,
                )
                if resp.status_code == 200:
                    return agent_id
        except Exception:
            pass

    # Create new agent
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{ELEVENLABS_BASE}/agents/create",
                headers=_headers(),
                json={
                    "name": "Reframe Trainer",
                    "conversation_config": {
                        "agent": {
                            "prompt": {
                                "prompt": DEFAULT_PROMPT,
                            },
                            "language": "en",
                            "first_message": "Hello! I'm ready to begin the session.",
                        },
                        "tts": {
                            "voice_id": settings.DEFAULT_CUSTOMER_VOICE,
                        },
                    },
                },
                timeout=30.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                agent_id = data["agent_id"]
                set_config("agent_id", agent_id)
                print(f"Created ElevenLabs agent: {agent_id}")
                return agent_id
            else:
                print(f"Warning: Agent creation failed: {resp.status_code} {resp.text[:300]}")
    except Exception as e:
        print(f"Warning: Could not create ElevenLabs agent: {e}")
    return None


def get_agent_id():
    return get_config("agent_id")


async def update_agent_for_session(prompt: str, voice_id: str, llm_model: str = None, tts_model: str = None):
    """Update the agent's prompt, voice, LLM, and TTS model for a specific session."""
    agent_id = get_agent_id()
    if not agent_id:
        raise ValueError("No agent configured. Check ElevenLabs API key.")

    llm_model = llm_model or settings.DEFAULT_LLM
    tts_model = tts_model or settings.TTS_MODEL

    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{ELEVENLABS_BASE}/agents/{agent_id}",
            headers=_headers(),
            json={
                "conversation_config": {
                    "agent": {
                        "prompt": {
                            "prompt": prompt,
                            "llm": llm_model,
                            "temperature": settings.AGENT_TEMPERATURE,
                        },
                        "language": "en",
                    },
                    "tts": {
                        "voice_id": voice_id,
                        "model_id": tts_model,
                    },
                },
            },
            timeout=30.0,
        )
        if resp.status_code not in (200, 204):
            raise ValueError(f"Failed to update agent: {resp.status_code} {resp.text[:200]}")


async def get_signed_url():
    """Generate a signed URL for the frontend to connect to the agent."""
    agent_id = get_agent_id()
    if not agent_id:
        raise ValueError("No agent configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ELEVENLABS_BASE}/conversation/get-signed-url",
            params={"agent_id": agent_id},
            headers=_headers(),
            timeout=15.0,
        )
        if resp.status_code == 200:
            return resp.json()["signed_url"]
        raise ValueError(f"Failed to get signed URL: {resp.status_code} {resp.text[:200]}")


async def get_conversation_transcript(conversation_id: str):
    """Retrieve transcript from ElevenLabs after a conversation ends."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{ELEVENLABS_BASE}/conversations/{conversation_id}",
                headers=_headers(),
                timeout=15.0,
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"Warning: Could not retrieve transcript: {e}")
    return None


def get_agent_status():
    """Get current agent configuration status."""
    agent_id = get_agent_id()
    if not agent_id:
        return {"agent_id": None, "status": "not_configured"}

    try:
        resp = httpx.get(
            f"{ELEVENLABS_BASE}/agents/{agent_id}",
            headers=_headers(),
            timeout=10.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "agent_id": agent_id,
                "status": "active",
                "name": data.get("name", "Reframe Trainer"),
            }
    except Exception:
        pass
    return {"agent_id": agent_id, "status": "error"}
