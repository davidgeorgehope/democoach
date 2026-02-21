from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models import ObjectionCreate, ObjectionUpdate, ObjectionBulkCreate, ObjectionGenerateRequest
from db import get_connection
from services.objection_service import generate_objections

router = APIRouter()


@router.get("")
async def list_objections(
    persona_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    difficulty: Optional[int] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_order: Optional[str] = Query("desc"),
):
    conn = get_connection()
    query = "SELECT * FROM objections WHERE 1=1"
    params = []

    if persona_id is not None:
        query += " AND persona_id = ?"
        params.append(persona_id)
    if category:
        query += " AND category = ?"
        params.append(category)
    if difficulty is not None:
        query += " AND difficulty = ?"
        params.append(difficulty)

    allowed_sort = {"created_at", "difficulty", "category", "times_used"}
    col = sort_by if sort_by in allowed_sort else "created_at"
    order = "ASC" if sort_order and sort_order.lower() == "asc" else "DESC"
    query += f" ORDER BY {col} {order}"

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("")
async def create_objection(data: ObjectionCreate):
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO objections (persona_id, trigger_context, objection_text, category, source, difficulty)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (data.persona_id, data.trigger_context, data.objection_text,
         data.category, data.source, data.difficulty),
    )
    conn.commit()
    obj = conn.execute("SELECT * FROM objections WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return {"objection": dict(obj)}


@router.post("/bulk")
async def bulk_create_objections(data: ObjectionBulkCreate):
    conn = get_connection()
    created = []
    for item in data.objections:
        cursor = conn.execute(
            """INSERT INTO objections (persona_id, trigger_context, objection_text, category, source, difficulty)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (item.persona_id, item.trigger_context, item.objection_text,
             item.category, item.source, item.difficulty),
        )
        obj = conn.execute("SELECT * FROM objections WHERE id = ?", (cursor.lastrowid,)).fetchone()
        created.append(dict(obj))
    conn.commit()
    conn.close()
    return {"objections": created}


@router.post("/generate")
async def generate_objections_endpoint(data: ObjectionGenerateRequest):
    try:
        objections = await generate_objections(
            demo_context=data.demo_context,
            persona_type=data.persona_type or "customer",
            count=data.count or 5,
        )
        return {"objections": objections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{objection_id}")
async def update_objection(objection_id: int, data: ObjectionUpdate):
    conn = get_connection()
    obj = conn.execute("SELECT * FROM objections WHERE id = ?", (objection_id,)).fetchone()
    if not obj:
        conn.close()
        raise HTTPException(status_code=404, detail="Objection not found")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [objection_id]
        conn.execute(f"UPDATE objections SET {set_clause} WHERE id = ?", values)
        conn.commit()

    obj = conn.execute("SELECT * FROM objections WHERE id = ?", (objection_id,)).fetchone()
    conn.close()
    return {"objection": dict(obj)}


@router.delete("/{objection_id}")
async def delete_objection(objection_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM objections WHERE id = ?", (objection_id,))
    conn.commit()
    conn.close()
    return {"success": True}
