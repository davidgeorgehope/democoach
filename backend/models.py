from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# --- Persona Models ---

class PersonaCreate(BaseModel):
    name: str
    description: str
    type: str = "customer"
    system_prompt: str
    voice_id: str
    voice_name: Optional[str] = None
    avatar_color: Optional[str] = "#F46800"
    tags: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    product_name: Optional[str] = None
    competitors: Optional[str] = None


class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    system_prompt: Optional[str] = None
    voice_id: Optional[str] = None
    voice_name: Optional[str] = None
    avatar_color: Optional[str] = None
    tags: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    product_name: Optional[str] = None
    competitors: Optional[str] = None


class Persona(BaseModel):
    id: int
    name: str
    description: str
    type: str
    system_prompt: str
    voice_id: str
    voice_name: Optional[str] = None
    avatar_color: str = "#F46800"
    tags: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    product_name: Optional[str] = None
    competitors: Optional[str] = None
    is_default: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# --- Objection Models ---

class ObjectionCreate(BaseModel):
    persona_id: Optional[int] = None
    trigger_context: Optional[str] = None
    objection_text: str
    category: str
    source: Optional[str] = None
    difficulty: Optional[int] = 3


class ObjectionUpdate(BaseModel):
    objection_text: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[int] = None
    trigger_context: Optional[str] = None


class ObjectionBulkCreate(BaseModel):
    objections: List[ObjectionCreate]


class ObjectionGenerateRequest(BaseModel):
    demo_context: str
    persona_type: Optional[str] = "customer"
    count: Optional[int] = 5


class Objection(BaseModel):
    id: int
    persona_id: Optional[int] = None
    trigger_context: Optional[str] = None
    objection_text: str
    category: str
    source: Optional[str] = None
    difficulty: int = 3
    times_used: int = 0
    created_at: Optional[str] = None


class ExtractedObjection(BaseModel):
    objection_text: str
    trigger_context: Optional[str] = None
    category: str
    difficulty: int = 3
    reasoning: Optional[str] = None


# --- Session Models ---

class SessionStartRequest(BaseModel):
    persona_id: int
    demo_context: Optional[str] = ""
    duration_minutes: Optional[int] = 15
    llm_model: Optional[str] = None
    tts_model: Optional[str] = None
    research_ids: Optional[List[int]] = None


class SessionMarkRequest(BaseModel):
    timestamp_seconds: int
    agent_text: Optional[str] = None
    user_text: Optional[str] = None
    notes: Optional[str] = None


class SessionUpdateRequest(BaseModel):
    overall_rating: Optional[int] = None
    notes: Optional[str] = None


class Session(BaseModel):
    id: int
    persona_id: Optional[int] = None
    demo_context: Optional[str] = None
    status: str = "active"
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    duration_seconds: Optional[int] = None
    elevenlabs_conversation_id: Optional[str] = None
    transcript_json: Optional[str] = None
    overall_rating: Optional[int] = None
    notes: Optional[str] = None


class SessionEvent(BaseModel):
    id: int
    session_id: int
    event_type: str
    timestamp_seconds: Optional[int] = None
    agent_text: Optional[str] = None
    user_text: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None


# --- Transcript Models ---

class Transcript(BaseModel):
    id: int
    name: str
    source_file: Optional[str] = None
    content: str
    objections_extracted: bool = False
    imported_at: Optional[str] = None
