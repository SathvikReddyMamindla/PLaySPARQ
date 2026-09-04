"""
SportSphere request/response schemas.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
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


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    handle: Optional[str] = None
    avatar: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    primary_sport: Optional[str] = None
    skill_level: Optional[str] = None
    role: Optional[str] = None
    bio: Optional[str] = None
    preferred_match_type: Optional[str] = None
    playing_style: Optional[str] = None
    availability: Optional[List[str]] = None
    sports: Optional[List[dict]] = None
    goals: Optional[List[str]] = None
    achievements: Optional[List[str]] = None
    badges: Optional[List[str]] = None
    discovery_enabled: Optional[bool] = None
    show_activity: Optional[bool] = None
    show_stats: Optional[bool] = None


class PrivacySettingsIn(BaseModel):
    discovery_enabled: Optional[bool] = True
    show_activity: Optional[bool] = True
    show_stats: Optional[bool] = True


class ConnectionRequestIn(BaseModel):
    recipientId: str
    sportId: str = "football"
    type: str = "match_invite"
    message: str = ""


class ConnectionRespondIn(BaseModel):
    connectionId: str
    accept: bool


class MessageIn(BaseModel):
    body: str


class BlockUserIn(BaseModel):
    userId: str


class ReportIn(BaseModel):
    reportedId: str
    targetType: str = "user"
    targetId: Optional[str] = None
    reason: str
    details: Optional[str] = ""


class NotificationPreferencesIn(BaseModel):
    email_notifications: Optional[bool] = True
    in_app_notifications: Optional[bool] = True
    tournament_alerts: Optional[bool] = True
    connection_alerts: Optional[bool] = True
    recommendation_alerts: Optional[bool] = True
    discount_alerts: Optional[bool] = True


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


class TournamentIn(BaseModel):
    title: str
    sport_id: str
    description: Optional[str] = ""
    venue: str
    city: Optional[str] = "Hyderabad"
    neighborhood: Optional[str] = ""
    lat: Optional[float] = 17.4401
    lng: Optional[float] = 78.3489
    banner_image: Optional[str] = ""
    format: Optional[str] = "Knockout"
    skill_level: Optional[str] = "all"
    starts_at: str
    ends_at: str
    registration_deadline: str
    max_participants: Optional[int] = 16
    entry_fee: Optional[float] = 0.0
    convenience_fee: Optional[float] = 20.0
    tax_rate: Optional[float] = 0.18
    rules: Optional[List[str]] = []
    prizes: Optional[List[str]] = []
    organizer_name: Optional[str] = "SportSphere Official"


class TournamentUpdateIn(BaseModel):
    title: Optional[str] = None
    sport_id: Optional[str] = None
    description: Optional[str] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    banner_image: Optional[str] = None
    format: Optional[str] = None
    skill_level: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    registration_deadline: Optional[str] = None
    max_participants: Optional[int] = None
    entry_fee: Optional[float] = None
    convenience_fee: Optional[float] = None
    tax_rate: Optional[float] = None
    status: Optional[str] = None
    rules: Optional[List[str]] = None
    prizes: Optional[List[str]] = None
    organizer_name: Optional[str] = None


class TournamentRegisterIn(BaseModel):
    tournamentId: str
    teamName: Optional[str] = ""


class CreateOrderIn(BaseModel):
    tournamentId: str
    discountCode: Optional[str] = None
    teamName: Optional[str] = ""


class VerifyPaymentIn(BaseModel):
    orderId: str
    paymentId: str
    signature: str
    tournamentId: str
    teamName: Optional[str] = ""


class RefundIn(BaseModel):
    paymentId: str
    reason: Optional[str] = ""


class ValidateDiscountIn(BaseModel):
    code: str
    tournamentId: str


class CreateDiscountIn(BaseModel):
    code: str
    discount_type: str = "fixed"
    discount_value: float
    min_order_value: Optional[float] = 0.0
    max_discount: Optional[float] = None
    valid_from: Optional[int] = None
    valid_until: Optional[int] = None
    usage_limit: Optional[int] = 1000
    per_user_limit: Optional[int] = 1
    eligible_users: Optional[str] = "all"


class AnnouncementIn(BaseModel):
    tournamentId: str
    title: str
    message: str
    sportId: Optional[str] = None


class MetaOut(BaseModel):
    ai_source: Optional[str] = None
    ai_model: Optional[str] = None
    ai_enabled: bool = False
