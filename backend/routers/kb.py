from fastapi import APIRouter, HTTPException, UploadFile, File
from services.agent_service import get_agent_id
from config import settings

router = APIRouter()


@router.get("")
async def list_kb_documents():
    """List knowledge base documents from ElevenLabs."""
    agent_id = get_agent_id()
    if not agent_id:
        return []

    try:
        from elevenlabs.client import ElevenLabs
        client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)
        agent = client.conversational_ai.agents.get(agent_id=agent_id)
        # Return KB docs if available in agent config
        kb_docs = []
        if hasattr(agent, 'conversation_config') and agent.conversation_config:
            config = agent.conversation_config
            if hasattr(config, 'agent') and hasattr(config.agent, 'prompt'):
                if hasattr(config.agent.prompt, 'knowledge_base'):
                    for doc in config.agent.prompt.knowledge_base:
                        kb_docs.append({
                            "id": doc.id if hasattr(doc, 'id') else None,
                            "name": doc.name if hasattr(doc, 'name') else "Unknown",
                        })
        return kb_docs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_kb_document(file: UploadFile = File(...)):
    """Upload a file to the ElevenLabs knowledge base."""
    agent_id = get_agent_id()
    if not agent_id:
        raise HTTPException(status_code=400, detail="No agent configured")

    try:
        import httpx
        content = await file.read()

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.elevenlabs.io/v1/convai/agents/{agent_id}/add-to-knowledge-base",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                files={"file": (file.filename, content, file.content_type or "application/octet-stream")},
                data={"name": file.filename or "Uploaded document"},
            )
            if resp.status_code not in (200, 201):
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return {"document": resp.json()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{doc_id}")
async def remove_kb_document(doc_id: str):
    """Remove a document from the knowledge base."""
    agent_id = get_agent_id()
    if not agent_id:
        raise HTTPException(status_code=400, detail="No agent configured")

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"https://api.elevenlabs.io/v1/convai/agents/{agent_id}/knowledge-base/{doc_id}",
                headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            )
            if resp.status_code not in (200, 204):
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
