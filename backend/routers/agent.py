from fastapi import APIRouter, HTTPException
from services.agent_service import get_agent_status, get_signed_url
from services.openai_realtime_service import get_ephemeral_token
from config import settings

router = APIRouter()


@router.get("/status")
async def agent_status():
    return get_agent_status()


@router.post("/openai-token")
async def get_openai_realtime_token():
    """Get an ephemeral token for OpenAI Realtime API."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")
    try:
        return await get_ephemeral_token()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def get_models():
    """Get available providers, LLM and TTS models."""
    return {
        "providers": settings.SUPPORTED_PROVIDERS,
        "llm_models": settings.SUPPORTED_LLMS,
        "tts_models": settings.SUPPORTED_TTS,
        "defaults": {
            "provider": settings.DEFAULT_PROVIDER,
            "llm": settings.DEFAULT_LLM,
            "tts": settings.TTS_MODEL,
        }
    }


@router.post("/token")
async def get_token():
    try:
        signed_url = await get_signed_url()
        return {"signed_url": signed_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
