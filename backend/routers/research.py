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


@router.post("/persona/{persona_id}")
async def research_persona(persona_id: int):
    """Auto-research a persona based on its company/industry/product fields."""
    conn = get_connection()
    persona = conn.execute("SELECT * FROM personas WHERE id = ?", (persona_id,)).fetchone()
    conn.close()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    results = {}
    research_ids = []

    # Run company research if persona has company info
    if persona["company_name"]:
        try:
            company_results = await research_company(persona["company_name"], persona["industry"] or "")
            conn = get_connection()
            cursor = conn.execute(
                """INSERT INTO research (research_type, query, results_json)
                   VALUES ('company', ?, ?)""",
                (persona["company_name"], json.dumps(company_results)),
            )
            conn.commit()
            research_ids.append(cursor.lastrowid)
            conn.close()
            results["company"] = {"id": research_ids[-1], **company_results}
        except Exception as e:
            results["company"] = {"error": str(e)}

    # Run competitive research if persona has product info
    if persona["product_name"]:
        try:
            competitive_results = await research_competitive(persona["product_name"], persona["competitors"] or "")
            conn = get_connection()
            cursor = conn.execute(
                """INSERT INTO research (research_type, query, results_json)
                   VALUES ('competitive', ?, ?)""",
                (persona["product_name"], json.dumps(competitive_results)),
            )
            conn.commit()
            research_ids.append(cursor.lastrowid)
            conn.close()
            results["competitive"] = {"id": research_ids[-1], **competitive_results}
        except Exception as e:
            results["competitive"] = {"error": str(e)}

    return {"research_ids": research_ids, **results}


@router.post("/company")
async def do_company_research(data: CompanyResearchRequest):
    try:
        results = await research_company(data.company_name, data.industry or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research failed: {e}")

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

    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO research (session_id, research_type, query, results_json)
           VALUES (?, 'competitive', ?, ?)""",
        (data.session_id, data.product_name, json.dumps(results)),
    )
    conn.commit()
    research_id = cursor.lastrowid
    conn.close()

    return {"id": research_id, **results}
