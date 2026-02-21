from fastapi import APIRouter, HTTPException
from services.agent_service import get_agent_status, get_signed_url
from config import settings

router = APIRouter()


@router.get("/status")
async def agent_status():
    return get_agent_status()


@router.get("/models")
async def get_models():
    """Get available LLM and TTS models."""
    return {
        "llm_models": settings.SUPPORTED_LLMS,
        "tts_models": settings.SUPPORTED_TTS,
        "defaults": {
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
