import httpx
from config import settings

OPENAI_REALTIME_MODEL = "gpt-realtime"


async def get_ephemeral_token():
    """Get an ephemeral token for OpenAI Realtime API WebRTC connection."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.openai.com/v1/realtime/sessions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_REALTIME_MODEL,
                "voice": "ash",
            },
            timeout=30.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "token": data.get("client_secret", {}).get("value"),
                "expires_at": data.get("client_secret", {}).get("expires_at"),
                "model": OPENAI_REALTIME_MODEL,
            }
        raise ValueError(f"Failed to get ephemeral token: {resp.status_code} {resp.text[:200]}")
