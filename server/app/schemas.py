"""SportSphere request/response schemas."""
from __future__ import annotations
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=6)
    displayName: str


class LoginIn(BaseModel):
    email: str
    password: str


class ParseProfileIn(BaseModel):
    rawText: str


class MatchExplanationIn(BaseModel):
    requesterId: Optional[str] = None
    candidateIds: Optional[List[str]] = None


class TrustNoteIn(BaseModel):
    profileId: Optional[str] = None
    bio: Optional[str] = None


class PerfSummaryIn(BaseModel):
    sportId: str
    profileId: Optional[str] = None


class CreateProfileIn(BaseModel):
    name: Optional[str] = None
    handle: Optional[str] = None
    avatar: Optional[str] = None
    city: Optional[str] = "Hyderabad"
    neighborhood: Optional[str] = ""
    lat: Optional[float] = 17.4401
    lng: Optional[float] = 78.3489
    primary_sport: Optional[str] = "Football"
    skill_level: Optional[str] = "intermediate"
    role: Optional[str] = ""
    bio: Optional[str] = ""
    availability: Optional[List[str]] = []
    sports: Optional[List[dict]] = []


class ConnectionRequestIn(BaseModel):
    recipientId: str
    sportId: str = "football"
    type: str = "match_invite"
    message: str = ""


class ConnectionRespondIn(BaseModel):
    connectionId: str
    accept: bool


class EventIn(BaseModel):
    sport_id: str
    title: str
    venue: str = ""
    city: str = "Hyderabad"
    neighborhood: str = ""
    lat: float = 17.4401
    lng: float = 78.3489
    starts_at: str = "Friday 8:30 PM"
    capacity: int = 10
    skill_level: str = "all"
    price: str = "Free"
    description: str = ""


class MessageIn(BaseModel):
    body: str


class MetaOut(BaseModel):
    ai_source: Optional[str] = None
    ai_model: Optional[str] = None
    ai_enabled: bool = False
