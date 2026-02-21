from fastapi import APIRouter, HTTPException
from services.agent_service import get_agent_status, get_signed_url

router = APIRouter()


@router.get("/status")
async def agent_status():
    return get_agent_status()


@router.post("/token")
async def get_token():
    try:
        signed_url = await get_signed_url()
        return {"signed_url": signed_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
