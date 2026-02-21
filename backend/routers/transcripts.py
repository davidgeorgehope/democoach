from fastapi import APIRouter, HTTPException, UploadFile, File
from db import get_connection
from services.transcript_service import parse_transcript_file, extract_objections_from_transcript

router = APIRouter()


@router.get("")
async def list_transcripts():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM transcripts ORDER BY imported_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/upload")
async def upload_transcript(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8", errors="replace")
    parsed = parse_transcript_file(text, file.filename or "upload.txt")

    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO transcripts (name, source_file, content) VALUES (?, ?, ?)",
        (file.filename or "Uploaded transcript", file.filename, parsed),
    )
    conn.commit()
    transcript = conn.execute("SELECT * FROM transcripts WHERE id = ?", (cursor.lastrowid,)).fetchone()
    conn.close()
    return {"transcript": dict(transcript)}


@router.post("/{transcript_id}/extract")
async def extract_objections(transcript_id: int):
    conn = get_connection()
    transcript = conn.execute("SELECT * FROM transcripts WHERE id = ?", (transcript_id,)).fetchone()
    if not transcript:
        conn.close()
        raise HTTPException(status_code=404, detail="Transcript not found")

    try:
        objections = await extract_objections_from_transcript(transcript["content"])
        # Mark as extracted
        conn.execute(
            "UPDATE transcripts SET objections_extracted = 1 WHERE id = ?",
            (transcript_id,),
        )
        conn.commit()
        conn.close()
        return {"objections": objections}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{transcript_id}")
async def delete_transcript(transcript_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM transcripts WHERE id = ?", (transcript_id,))
    conn.commit()
    conn.close()
    return {"success": True}
