from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db import get_connection
from services.research_service import research_company, research_competitive
import json

router = APIRouter()


class CompanyResearchRequest(BaseModel):
    company_name: str
    industry: Optional[str] = ""
    session_id: Optional[int] = None


class CompetitiveResearchRequest(BaseModel):
    product_name: str
    competitors: Optional[str] = ""
    session_id: Optional[int] = None


@router.post("/company")
async def do_company_research(data: CompanyResearchRequest):
    try:
        results = await research_company(data.company_name, data.industry or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research failed: {e}")

    # Store in DB
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO research (session_id, research_type, query, results_json)
           VALUES (?, 'company', ?, ?)""",
        (data.session_id, data.company_name, json.dumps(results)),
    )
    conn.commit()
    research_id = cursor.lastrowid
    conn.close()

    return {"id": research_id, **results}


@router.post("/competitive")
async def do_competitive_research(data: CompetitiveResearchRequest):
    try:
        results = await research_competitive(data.product_name, data.competitors or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research failed: {e}")

    # Store in DB
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO research (session_id, research_type, query, results_json)
           VALUES (?, 'competitive', ?, ?)""",
        (data.session_id, data.company_name if hasattr(data, 'company_name') else data.product_name, json.dumps(results)),
    )
    conn.commit()
    research_id = cursor.lastrowid
    conn.close()

    return {"id": research_id, **results}
