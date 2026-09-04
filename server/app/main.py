"""
SportSphere API — Python (FastAPI) backend.
Ports PLAYSync's Express matchmaking engine + discovery + connections + events,
and adds JWT auth, connection-enforced chat, personalized recommendations,
tournament registrations with Razorpay payments & transparent fees,
discounts, central notifications center, rich profiles, and admin capabilities.
"""
from __future__ import annotations
import html
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path)
else:
    load_dotenv()

from fastapi import Depends, FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import ai
from .auth import (create_access_token, decode_token, get_current_profile,
                    get_current_user, hash_password, verify_password)
from .compat import (calculate_distance_km, evaluate_compatibility, match_sport_for,
                     sport_name)
from .migrations import run_migrations
from .payments import (calculate_pricing, create_order, generate_sandbox_signature,
                      get_gateway_mode, validate_discount, verify_payment_signature)
from .recommendations import (get_personalized_home_feed, get_recommended_players,
                             get_recommended_tournaments)
from .schemas import (AnnouncementIn, BlockUserIn, ConnectionRequestIn,
                     ConnectionRespondIn, CreateDiscountIn, CreateOrderIn,
                     CreateProfileIn, EventIn, LoginIn, MessageIn,
                     NotificationPreferencesIn, ParseProfileIn, PerfSummaryIn,
                     PrivacySettingsIn, ProfileUpdateIn, RefundIn, RegisterIn,
                     ReportIn, TournamentIn, TournamentRegisterIn,
                     TournamentUpdateIn, TrustNoteIn, ValidateDiscountIn,
                     VerifyPaymentIn)
from .store import SPORTS, STORE
from .websocket import WS_MANAGER


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite schema and populate seeds on startup
    run_migrations()
    yield


app = FastAPI(title="SportSphere API", version="2.0.0", lifespan=lifespan)

# CORS configuration
origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:4173",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Locate built frontend static files (supports local dev and containerized deployment)
DIST_DIR: Optional[Path] = None
for candidate in [
    Path(__file__).resolve().parent.parent.parent / "client" / "dist",
    Path(__file__).resolve().parent.parent / "client" / "dist",
    Path("/app/client/dist"),
    Path("./client/dist"),
    Path("./dist"),
]:
    if candidate.exists() and (candidate / "index.html").is_file():
        DIST_DIR = candidate
        break

if DIST_DIR and (DIST_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")


def sanitize_text(text: str) -> str:
    return html.escape(text.strip()) if text else ""


def require_admin(user=Depends(get_current_user)):
    if not user.get("is_admin") and user.get("email") != "admin@sportsphere.dev":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    return user


@app.get("/health")
def health():
    return {
        "status": "ok",
        "ai_enabled": ai.ai_enabled(),
        "model": ai.MODEL,
        "database": "sqlite_persistent",
        "gateway": get_gateway_mode(),
    }


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.post("/api/v1/auth/register")
def register(inp: RegisterIn, response: Response):
    if STORE.get_user_by_email(inp.email):
        raise HTTPException(status_code=409, detail="Email already registered")
    pwd = hash_password(inp.password)
    user = STORE.create_user(inp.email, pwd, inp.displayName)
    profile = STORE.create_profile({
        "id": f"ath-{user['id'].split('-')[-1]}",
        "user_id": user["id"],
        "name": inp.displayName,
        "handle": "@" + inp.displayName.lower().replace(" ", "_"),
        "primary_sport": "Football",
        "skill_level": "intermediate",
    })
    STORE.link_user_profile(user["id"], profile["id"])
    user["profile_id"] = profile["id"]
    token = create_access_token(user["id"])
    _set_cookie(response, token)
    return {"success": True, "user": _public_user(user), "profile_id": profile["id"]}


@app.post("/api/v1/auth/login")
def login(inp: LoginIn, response: Response):
    user = STORE.get_user_by_email(inp.email)
    if not user or not verify_password(inp.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"])
    _set_cookie(response, token)
    profile_id = user.get("profile_id")
    if not profile_id or not STORE.get_profile(profile_id):
        profile = STORE.create_profile({
            "id": f"ath-{user['id'].split('-')[-1]}",
            "user_id": user["id"],
            "name": user["display_name"],
            "handle": "@" + user["display_name"].lower().replace(" ", "_"),
            "primary_sport": "Football",
            "skill_level": "intermediate",
        })
        STORE.link_user_profile(user["id"], profile["id"])
        user["profile_id"] = profile["id"]
        profile_id = profile["id"]
    return {"success": True, "user": _public_user(user), "profile_id": profile_id}


@app.post("/api/v1/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"success": True}


@app.get("/api/v1/auth/me")
def me(user=Depends(get_current_user)):
    profile = STORE.get_profile(user["profile_id"]) if user.get("profile_id") else None
    unread_msgs = STORE.get_unread_message_count(profile["id"]) if profile else 0
    notifs = STORE.get_notifications(user["id"], limit=100)
    unread_notifs = sum(1 for n in notifs if not n.get("is_read"))
    return {
        "success": True,
        "user": _public_user(user),
        "profile_id": user.get("profile_id"),
        "profile": profile,
        "unread_messages": unread_msgs,
        "unread_notifications": unread_notifs,
    }


@app.post("/api/v1/auth/demo")
def demo(response: Response):
    demo_user = STORE.get_user_by_email("demo@sportsphere.dev")
    if not demo_user:
        demo_user = STORE.create_user("demo@sportsphere.dev", hash_password("demo1234"), "Demo Player")
    if not STORE.get_profile("ath-current-user"):
        STORE.create_profile({
            "id": "ath-current-user", "user_id": demo_user["id"], "name": "Demo Player", "handle": "@demo_player",
            "primary_sport": "Football", "skill_level": "intermediate",
            "neighborhood": "Kondapur", "bio": "Demo player exploring SportSphere.",
        })
    STORE.link_user_profile(demo_user["id"], "ath-current-user")
    demo_user["profile_id"] = "ath-current-user"
    token = create_access_token(demo_user["id"])
    _set_cookie(response, token)
    return {"success": True, "user": _public_user(demo_user), "profile_id": "ath-current-user"}


def _public_user(user):
    return {
        "id": user["id"],
        "email": user["email"],
        "display_name": user["display_name"],
        "profile_id": user.get("profile_id"),
        "is_admin": bool(user.get("is_admin")),
    }


def _set_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=int(os.getenv("JWT_EXPIRE_MINUTES", "10080")) * 60,
        samesite="lax",
        secure=False,
        path="/",
    )


# ---------------------------------------------------------------------------
# AI endpoints
# ---------------------------------------------------------------------------
@app.get("/api/v1/ai/status")
def ai_status():
    return {"ai_enabled": ai.ai_enabled(), "model": ai.MODEL, "base_url": ai.API_BASE}


@app.post("/api/v1/ai/parse-profile")
def ai_parse_profile(inp: ParseProfileIn):
    parsed = ai._parse_profile(inp.rawText)
    return {"success": True, "parsed": parsed, "meta": {"source": parsed.get("_source"), "ai_enabled": ai.ai_enabled()}}


@app.post("/api/v1/ai/match-explanation")
def ai_match_explanation(inp: MatchExplanationIn, user=Depends(get_current_profile)):
    requester_id = inp.requesterId or user["id"]
    requester = STORE.get_profile(requester_id) or user
    candidate_ids = inp.candidateIds or []
    candidates = []
    for cid in candidate_ids:
        prof = STORE.get_profile(cid)
        if not prof:
            continue
        sport_id = (requester.get("sports") or [{}])[0].get("sport", "football")
        matched = match_sport_for(prof, sport_id)
        candidates.append({
            "athlete_id": prof["id"], "name": prof["name"], "sport": (matched or {}).get("sport", sport_id),
            "skill_level": (matched or {}).get("skill_level", prof.get("skill_level")),
            "role": (matched or {}).get("role", prof.get("role")),
            "distanceKm": calculate_distance_km(
                requester.get("lat", 17.4401), requester.get("lng", 78.3489),
                prof.get("lat", 17.4401), prof.get("lng", 78.3489)),
            "availability": prof.get("availability", []),
            "reliability_rate": prof.get("reliability_rate", 95),
            "reasonTags": [], "compatibilityScore": 0, "breakdown": {},
        })
    expl = ai.match_explanations(requester, candidates)
    return {"success": True, "explanations": expl, "meta": {"ai_enabled": ai.ai_enabled()}}


@app.post("/api/v1/ai/trust-note")
def ai_trust_note(inp: TrustNoteIn):
    profile = STORE.get_profile(inp.profileId) if inp.profileId else None
    bio = profile.get("bio") if profile else inp.bio or ""
    name = profile.get("name") if profile else None
    result = ai.trust_note({"bio": bio, "name": name})
    return {"success": True, **result, "meta": {"ai_enabled": ai.ai_enabled()}}


@app.post("/api/v1/ai/performance-summary")
def ai_perf_summary(inp: PerfSummaryIn):
    sport = inp.sportId
    metric = sport
    history = STORE.stats_log.get(f"{inp.profileId or 'ath-current-user'}:{sport}", [])
    if not history:
        history = _demo_history(sport)
    result = ai.performance_summary(sport, metric, history)
    return {"success": True, **result, "meta": {"ai_enabled": ai.ai_enabled()}}


def _demo_history(sport):
    from .store import SPORT_METRICS
    metric = (SPORT_METRICS.get(sport) or ["performance"])[0]
    if metric in ("pace_50m_sec", "five_k_pace_min", "ten_k_pb_min") or "pac" in metric:
        base = 34.0
        vals = [base + i * 0.8 for i in range(4)]
    else:
        base = 60.0
        vals = [base - i * 3 for i in range(4)]
    return [{"value": v, "date": f"week-{i+1}"} for i, v in enumerate(vals)]


# ---------------------------------------------------------------------------
# Athlete Profiles
# ---------------------------------------------------------------------------
@app.get("/api/v1/athletes")
def list_athletes():
    return {"success": True, "data": STORE.all_profiles()}


@app.get("/api/v1/athletes/{pid}")
def get_athlete(pid: str, user=Depends(get_current_profile)):
    p = STORE.get_profile(pid)
    if not p:
        raise HTTPException(status_code=404, detail="Athlete not found")
    # Check if connected and blocked
    p["is_connected"] = STORE.are_connected(user["id"], pid)
    p["is_blocked"] = STORE.is_blocked(user["id"], pid)
    p["connection_count"] = len(STORE.connected_ids(pid))

    # Connection relationship status
    conn_status = "none"
    for c in STORE.connections_for(user["id"]):
        if (c["sender_id"] == user["id"] and c["recipient_id"] == pid) or \
           (c["recipient_id"] == user["id"] and c["sender_id"] == pid):
            conn_status = c["status"]
            break
    p["connection_status"] = conn_status

    # Tournament history & recent activity (respecting privacy settings)
    target_uid = p.get("user_id", f"user-{pid}")
    p["tournament_history"] = STORE.get_registrations(user_id=target_uid)
    if p.get("show_activity", True):
        p["recent_activity"] = STORE.get_activities(target_uid, limit=5)
    else:
        p["recent_activity"] = []

    # Structured match stats
    mp = p.get("matches_played", 0) or 0
    w = p.get("wins", 0) or 0
    l = p.get("losses", 0) or 0
    wr = round((w / mp * 100), 1) if mp > 0 else 0
    p["match_stats"] = {
        "matches_played": mp,
        "wins": w,
        "losses": l,
        "win_rate": wr,
    }
    return {"success": True, "data": p}


@app.post("/api/v1/athletes")
def create_athlete(inp: CreateProfileIn, user=Depends(get_current_user)):
    data = inp.model_dump(exclude_none=True)
    data["id"] = user.get("profile_id") or f"ath-{user['id'].split('-')[-1]}"
    data["user_id"] = user["id"]
    profile = STORE.create_profile(data)
    if not user.get("profile_id"):
        STORE.link_user_profile(user["id"], profile["id"])
        user["profile_id"] = profile["id"]
    return {"success": True, "data": profile}


@app.put("/api/v1/athletes/{pid}")
def update_athlete(pid: str, inp: ProfileUpdateIn, user=Depends(get_current_user)):
    p = STORE.get_profile(pid)
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")
    if p["id"] != user.get("profile_id") and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Cannot edit another user's profile")

    data = inp.model_dump(exclude_none=True)
    for k, v in data.items():
        p[k] = v
    STORE.save_profile(p)
    return {"success": True, "data": STORE.get_profile(pid)}


@app.put("/api/v1/athletes/{pid}/privacy")
def update_privacy(pid: str, inp: PrivacySettingsIn, user=Depends(get_current_user)):
    p = STORE.get_profile(pid)
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")
    if p["id"] != user.get("profile_id"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    p["discovery_enabled"] = inp.discovery_enabled
    p["show_activity"] = inp.show_activity
    p["show_stats"] = inp.show_stats
    STORE.save_profile(p)
    return {"success": True, "data": STORE.get_profile(pid)}


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------
@app.get("/api/v1/discovery/players")
def discover_players(lat: float = 17.4401, lng: float = 78.3489, sportId: str = "all",
                     skillLevel: str = "all", radiusKm: float = 10, role: str = "",
                     search: str = "", sortBy: str = "compatibility", limit: int = 30,
                     profile_id: str = ""):
    query = {"lat": lat, "lng": lng, "sportId": sportId, "skillLevel": skillLevel,
             "radiusKm": radiusKm, "role": role, "search": search,
             "availabilitySlots": [], "limit": limit}

    blocked_users = set(STORE.get_blocked_users(profile_id)) if profile_id else set()
    connected_users = STORE.connected_ids(profile_id) if profile_id else set()

    scored = []
    for p in STORE.all_profiles():
        if p.get("id") == profile_id:
            continue
        if p["id"] in blocked_users or (profile_id and STORE.is_blocked(profile_id, p["id"])):
            continue
        if not p.get("discovery_enabled", True):
            continue

        eval_res = evaluate_compatibility(query, p)
        if eval_res["distanceKm"] > radiusKm:
            continue
        if sportId and sportId != "all":
            matched = eval_res["matchedSport"] or {}
            if (matched or {}).get("sport", "").lower() != sportId.lower():
                continue
        if skillLevel and skillLevel != "all":
            matched = eval_res["matchedSport"] or {}
            if (matched or {}).get("skill_level", p.get("skill_level")) != skillLevel.lower():
                continue
        if search and search.strip():
            haystack = (p.get("name", "") + " " + p.get("neighborhood", "") + " " + p.get("bio", "")).lower()
            if search.strip().lower() not in haystack:
                continue
        scored.append({"profile": p, "eval": eval_res})

    if sortBy == "distance":
        scored.sort(key=lambda x: x["eval"]["distanceKm"])
    elif sortBy == "rating":
        scored.sort(key=lambda x: x["profile"].get("rating", 0), reverse=True)
    else:
        scored.sort(key=lambda x: x["eval"]["compatibilityScore"], reverse=True)

    players = []
    for entry in scored[:limit]:
        p, ev = entry["profile"], entry["eval"]
        payload = _player_payload(p, ev, lat, lng)
        payload["is_connected"] = p["id"] in connected_users
        players.append(payload)

    # Batch AI explanations
    candidates = [{"athlete_id": pl["id"], "name": pl["name"], "sport": pl.get("matched_sport", sportId),
                   "skill_level": pl["skill_level"], "role": pl.get("role"),
                   "distanceKm": pl["distanceKm"], "breakdown": pl["breakdown"],
                   "availability": pl["availability"], "reliability_rate": pl["reliability_rate"],
                   "compatibilityScore": pl["compatibilityScore"], "reasonTags": pl["reasonTags"]}
                  for pl in players]
    requester = {"name": "You", "primary_sport": sportId if sportId != "all" else "Football",
                 "skill_level": skillLevel if skillLevel != "all" else "intermediate",
                 "role": role, "availability": [], "city": ""}
    try:
        expl_map = {e["athlete_id"]: e for e in ai.match_explanations(requester, candidates)}
    except Exception:
        expl_map = {}
    for pl in players:
        pl["explanation"] = expl_map.get(pl["id"], {}).get("explanation", pl.get("one_liner", ""))
        pl["match_tier"] = expl_map.get(pl["id"], {}).get("match_tier", pl.get("matchTier", ""))

    return {"success": True,
            "data": {"query": {"anchor": {"lat": lat, "lng": lng}, "radiusKm": radiusKm,
                               "sport": sportId, "skillLevel": skillLevel, "totalFound": len(players)},
                     "players": players,
                     "meta": {"ai_enabled": ai.ai_enabled(), "model": ai.MODEL}}}


def _player_payload(p, ev, anchor_lat, anchor_lng):
    matched = ev["matchedSport"] or {}
    reliability = p.get("reliability_rate", 95)
    return {
        "id": p["id"], "name": p["name"], "handle": p.get("handle", "@athlete"),
        "avatar": p.get("avatar"), "primarySport": p.get("primary_sport"),
        "secondarySport": (p.get("sports") or [None])[1]["sport"] if len(p.get("sports", [])) > 1 else "",
        "skill_level": matched.get("skill_level", p.get("skill_level")),
        "skillLevel": matched.get("skill_level", p.get("skill_level")),
        "location": {"city": p.get("city", "Hyderabad"), "neighborhood": p.get("neighborhood", "")},
        "lat": p.get("lat", 17.4401),
        "lng": p.get("lng", 78.3489),
        "subLocation": p.get("neighborhood", ""),
        "distanceKm": ev["distanceKm"],
        "role": matched.get("role", p.get("role")),
        "bio": p.get("bio", ""),
        "rating": p.get("rating", 4.5),
        "reliability_rate": reliability,
        "reliabilityRate": reliability,
        "availability": p.get("availability", []),
        "matches_played": p.get("matches_played", 0),
        "compatibilityScore": ev["compatibilityScore"],
        "matchTier": ev["matchTier"],
        "breakdown": ev["breakdown"],
        "reasonTags": ev["reasonTags"],
        "matched_sport": matched.get("sport", p.get("primary_sport", "")),
        "tags": ev["reasonTags"],
    }


@app.get("/api/v1/discovery/teams")
def discover_teams(lat: float = 17.4401, lng: float = 78.3489, sportId: str = "all", radiusKm: float = 15):
    results = []
    for t in STORE.teams.values():
        d = calculate_distance_km(lat, lng, t["lat"], t["lng"])
        if d > radiusKm:
            continue
        if sportId and sportId != "all" and t["sport_id"] != sportId:
            continue
        t2 = dict(t)
        t2["distanceKm"] = d
        results.append(t2)
    return {"success": True, "data": {"teams": results}}


@app.get("/api/v1/discovery/events")
def discover_events(lat: float = 17.4401, lng: float = 78.3489, radiusKm: float = 15, sportId: str = "all"):
    results = []
    for e in STORE.events.values():
        d = calculate_distance_km(lat, lng, e["lat"], e["lng"])
        if d > radiusKm:
            continue
        if sportId and sportId != "all" and e["sport_id"] != sportId:
            continue
        e2 = dict(e)
        e2["distanceKm"] = round(d, 1)
        e2["joined"] = len(e.get("participants", []))
        results.append(e2)
    return {"success": True, "data": {"events": results}}


# ---------------------------------------------------------------------------
# Connections
# ---------------------------------------------------------------------------
@app.post("/api/v1/connections/request")
def connection_request(inp: ConnectionRequestIn, user=Depends(get_current_profile)):
    if inp.recipientId == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot connect with yourself")
    if STORE.is_blocked(user["id"], inp.recipientId):
        raise HTTPException(status_code=403, detail="Cannot connect with this user")
    con = STORE.create_connection(user["id"], inp.recipientId, inp.sportId, inp.type, inp.message)
    return {"success": True, "connection": con}


@app.get("/api/v1/connections/status/{recipient_id}")
def connection_status(recipient_id: str, user=Depends(get_current_profile)):
    for c in STORE.connections_for(user["id"]):
        if (c["sender_id"] == user["id"] and c["recipient_id"] == recipient_id) or \
           (c["recipient_id"] == user["id"] and c["sender_id"] == recipient_id):
            return {"success": True, "status": c["status"], "connection": c}
    return {"success": True, "status": "none", "connection": None}


@app.post("/api/v1/connections/respond")
def connection_respond(inp: ConnectionRespondIn, user=Depends(get_current_profile)):
    con = STORE.get_connection_by_id(inp.connectionId)
    if not con:
        raise HTTPException(status_code=404, detail="Connection not found")
    if con["recipient_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your connection to respond to")
    new_status = "accepted" if inp.accept else "declined"
    updated = STORE.update_connection_status(inp.connectionId, new_status)
    return {"success": True, "connection": updated}


@app.get("/api/v1/connections")
def list_connections(user=Depends(get_current_profile)):
    cons = STORE.connections_for(user["id"])
    return {"success": True, "data": {"connections": cons, "connected": list(STORE.connected_ids(user["id"]))}}


# ---------------------------------------------------------------------------
# Connection-Based Chat & Safety
# ---------------------------------------------------------------------------
@app.get("/api/v1/chat/conversations")
def get_conversations(user=Depends(get_current_profile)):
    convs = []
    unread_map = STORE.get_unread_per_conversation(user["id"])
    for c in STORE.conversations_for(user["id"]):
        other_id = next((p for p in c["participants"] if p != user["id"]), None)
        other = STORE.get_profile(other_id) or {}
        msgs = STORE.get_messages(c["id"])
        last_msg = msgs[-1]["body"] if msgs else ""
        convs.append({
            "id": c["id"],
            "with_id": other_id,
            "with_name": other.get("name", "Athlete"),
            "with_avatar": other.get("avatar", ""),
            "last_message": last_msg,
            "unread": unread_map.get(c["id"], 0),
            "updated_at": c.get("updated_at", c["created_at"]),
            "is_connected": STORE.are_connected(user["id"], other_id),
            "is_blocked": STORE.is_blocked(user["id"], other_id),
        })
    convs.sort(key=lambda x: x["updated_at"], reverse=True)
    return {"success": True, "data": convs}


@app.get("/api/v1/chat/conversations/{cid}/messages")
def get_messages(cid: str, user=Depends(get_current_profile)):
    con = STORE.get_conversation_by_id(cid)
    if not con:
        if "::" in cid:
            parts = cid.split("::")
            if len(parts) == 2 and user["id"] in parts:
                other_id = parts[0] if parts[1] == user["id"] else parts[1]
                if not STORE.are_connected(user["id"], other_id):
                    raise HTTPException(
                        status_code=403,
                        detail="Chat is enabled only after your connection request has been accepted.",
                    )
                con = STORE.get_or_create_conversation(user["id"], other_id)
        if not con:
            return {"success": True, "messages": []}
    if user["id"] not in con["participants"]:
        raise HTTPException(status_code=403, detail="Not part of this conversation")

    other_id = next((p for p in con["participants"] if p != user["id"]), None)
    # Check if blocked
    if other_id and STORE.is_blocked(user["id"], other_id):
        raise HTTPException(status_code=403, detail="This conversation is blocked")

    # Mark incoming messages read
    STORE.mark_conversation_read(cid, user["id"])
    msgs = STORE.get_messages(cid)
    return {"success": True, "messages": msgs}


@app.post("/api/v1/chat/conversations/{cid}/messages")
async def send_message(cid: str, inp: MessageIn, user=Depends(get_current_profile)):
    body = sanitize_text(inp.body)
    if not body:
        raise HTTPException(status_code=400, detail="Message body cannot be empty")

    con = STORE.get_conversation_by_id(cid)
    if not con:
        if "::" in cid:
            parts = cid.split("::")
            if len(parts) == 2 and user["id"] in parts:
                other_id = parts[0] if parts[1] == user["id"] else parts[1]
                if not STORE.are_connected(user["id"], other_id):
                    raise HTTPException(
                        status_code=403,
                        detail="Chat is enabled only after your connection request has been accepted.",
                    )
                con = STORE.get_or_create_conversation(user["id"], other_id)
        if not con:
            raise HTTPException(status_code=404, detail="Conversation not found")
    if user["id"] not in con["participants"]:
        raise HTTPException(status_code=403, detail="Not part of this conversation")

    other_id = next((p for p in con["participants"] if p != user["id"]), None)
    if not other_id:
        raise HTTPException(status_code=400, detail="Invalid conversation participants")

    # RULE ENFORCEMENT: A user can message another user ONLY after connection request has been accepted
    if not STORE.are_connected(user["id"], other_id):
        raise HTTPException(
            status_code=403,
            detail="Chat is enabled only after your connection request has been accepted.",
        )

    # BLOCK ENFORCEMENT: Cannot message if blocked
    if STORE.is_blocked(user["id"], other_id):
        raise HTTPException(status_code=403, detail="Cannot send message. Communication is blocked.")

    msg = STORE.add_message(cid, user["id"], other_id, body)
    # Broadcast via WebSocket if recipient is connected
    await WS_MANAGER.broadcast_chat_message(other_id, msg)
    return {"success": True, "message": msg}


@app.post("/api/v1/chat/conversations/{cid}/read")
async def mark_read(cid: str, user=Depends(get_current_profile)):
    STORE.mark_conversation_read(cid, user["id"])
    con = STORE.get_conversation_by_id(cid)
    if con:
        other_id = next((p for p in con["participants"] if p != user["id"]), None)
        if other_id:
            await WS_MANAGER.broadcast_read_status(other_id, cid)
    return {"success": True}


@app.post("/api/v1/users/{uid}/block")
def block_user(uid: str, user=Depends(get_current_profile)):
    if uid == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    STORE.block_user(user["id"], uid)
    return {"success": True, "message": f"User {uid} has been blocked."}


@app.post("/api/v1/users/{uid}/unblock")
def unblock_user(uid: str, user=Depends(get_current_profile)):
    STORE.unblock_user(user["id"], uid)
    return {"success": True, "message": f"User {uid} unblocked."}


@app.get("/api/v1/users/blocked")
def get_blocked(user=Depends(get_current_profile)):
    return {"success": True, "blocked_ids": STORE.get_blocked_users(user["id"])}


@app.post("/api/v1/users/{uid}/report")
def report_user(uid: str, inp: ReportIn, user=Depends(get_current_profile)):
    STORE.report_target(
        reporter_id=user["id"],
        reported_id=uid,
        target_type="user",
        target_id=inp.targetId,
        reason=sanitize_text(inp.reason),
        details=sanitize_text(inp.details or ""),
    )
    return {"success": True, "message": "Report submitted for administrator review. Thank you for keeping PLAYSync safe."}


@app.post("/api/v1/chat/messages/{mid}/report")
def report_message(mid: str, inp: ReportIn, user=Depends(get_current_profile)):
    STORE.report_target(
        reporter_id=user["id"],
        reported_id=inp.reportedId,
        target_type="message",
        target_id=mid,
        reason=sanitize_text(inp.reason),
        details=sanitize_text(inp.details or ""),
    )
    return {"success": True, "message": "Message reported for review."}


# ---------------------------------------------------------------------------
# Personalization & Recommendations
# ---------------------------------------------------------------------------
@app.get("/api/v1/recommendations/players")
def recommend_players(user=Depends(get_current_profile)):
    recommended = get_recommended_players(user, limit=12)
    return {"success": True, "data": recommended}


@app.get("/api/v1/recommendations/tournaments")
def recommend_tournaments(user=Depends(get_current_user)):
    profile = STORE.get_profile(user.get("profile_id")) or {"id": "ath-current-user"}
    tournaments = get_recommended_tournaments(profile, user["id"], limit=6)
    return {"success": True, "data": tournaments}


@app.get("/api/v1/personalization/home")
def personalized_home(user=Depends(get_current_user)):
    profile = STORE.get_profile(user.get("profile_id")) or {
        "id": "ath-current-user", "name": user["display_name"], "primary_sport": "Football"
    }
    feed = get_personalized_home_feed(user, profile)
    return {"success": True, "data": feed}


# ---------------------------------------------------------------------------
# Tournaments & Registrations
# ---------------------------------------------------------------------------
@app.get("/api/v1/tournaments")
def list_tournaments(sport_id: Optional[str] = None):
    return {"success": True, "data": STORE.get_tournaments(sport_id)}


@app.get("/api/v1/tournaments/{tid}")
def get_tournament(tid: str):
    t = STORE.get_tournament(tid)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"success": True, "data": t}


@app.post("/api/v1/tournaments/{tid}/register")
def direct_register(tid: str, inp: TournamentRegisterIn, user=Depends(get_current_user)):
    t = STORE.get_tournament(tid)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if STORE.is_registered(tid, user["id"]):
        raise HTTPException(status_code=400, detail="Already registered for this tournament")
    if t.get("entry_fee", 0.0) > 0:
        raise HTTPException(status_code=400, detail="This tournament requires payment checkout")

    reg = STORE.register_for_tournament(
        tournament_id=tid,
        user_id=user["id"],
        profile_id=user.get("profile_id") or f"ath-{user['id']}",
        team_name=sanitize_text(inp.teamName or ""),
    )
    return {"success": True, "registration": reg}


# ---------------------------------------------------------------------------
# Payments & Checkout (Razorpay)
# ---------------------------------------------------------------------------
@app.post("/api/v1/payments/create-order")
def create_payment_order(inp: CreateOrderIn, user=Depends(get_current_user)):
    try:
        order_data = create_order(
            tournament_id=inp.tournamentId,
            user_id=user["id"],
            discount_code=inp.discountCode,
        )
        return {"success": True, "data": order_data}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")


@app.post("/api/v1/payments/verify")
def verify_payment(inp: VerifyPaymentIn, user=Depends(get_current_user)):
    payment_record = STORE.get_payment_by_order_id(inp.orderId)
    if not payment_record:
        raise HTTPException(status_code=404, detail="Order not found")

    if payment_record["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized payment verification")

    # Idempotent: if already successful, return confirmation without duplicate charge
    if payment_record["status"] == "successful":
        regs = STORE.get_registrations(tournament_id=inp.tournamentId, user_id=user["id"])
        return {
            "success": True,
            "message": "Payment already confirmed.",
            "payment": payment_record,
            "registration": regs[0] if regs else None,
        }

    # Verify signature
    is_valid = verify_payment_signature(inp.orderId, inp.paymentId, inp.signature)
    if not is_valid:
        STORE.update_payment(inp.orderId, "failed", inp.paymentId, inp.signature)
        raise HTTPException(status_code=400, detail="Invalid cryptographic payment signature")

    # Mark payment successful
    STORE.update_payment(inp.orderId, "successful", inp.paymentId, inp.signature)
    updated_payment = STORE.get_payment_by_order_id(inp.orderId)

    # Record discount usage if applicable
    if updated_payment.get("discount_code"):
        disc = STORE.get_discount_by_code(updated_payment["discount_code"])
        if disc:
            STORE.record_discount_usage(disc["id"], user["id"], updated_payment["id"])

    # Confirm tournament registration
    reg = STORE.register_for_tournament(
        tournament_id=inp.tournamentId,
        user_id=user["id"],
        profile_id=user.get("profile_id") or f"ath-{user['id']}",
        payment_id=updated_payment["id"],
        team_name=sanitize_text(inp.teamName or ""),
    )

    return {
        "success": True,
        "message": "Payment verified and tournament registration confirmed!",
        "payment": updated_payment,
        "registration": reg,
    }


@app.get("/api/v1/payments/receipt/{pid}")
def get_receipt(pid: str, user=Depends(get_current_user)):
    pay = STORE.get_payment_by_id(pid)
    if not pay:
        raise HTTPException(status_code=404, detail="Payment receipt not found")
    if pay["user_id"] != user["id"] and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    tournament = STORE.get_tournament(pay["tournament_id"])
    regs = STORE.get_registrations(tournament_id=pay["tournament_id"], user_id=pay["user_id"])
    return {
        "success": True,
        "receipt": {
            "payment": pay,
            "tournament": tournament,
            "registration": regs[0] if regs else None,
            "billed_to": user["display_name"],
            "billed_email": user["email"],
        },
    }


# ---------------------------------------------------------------------------
# Discounts
# ---------------------------------------------------------------------------
@app.post("/api/v1/discounts/validate")
def check_discount(inp: ValidateDiscountIn, user=Depends(get_current_user)):
    ok, msg, disc, pricing = validate_discount(inp.code, inp.tournamentId, user["id"])
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "discount": disc, "pricing": pricing}


@app.get("/api/v1/discounts/available")
def list_discounts():
    return {"success": True, "data": STORE.all_discounts(active_only=True)}


# ---------------------------------------------------------------------------
# Central Notification Center
# ---------------------------------------------------------------------------
@app.get("/api/v1/notifications")
def get_notifications(category: Optional[str] = None, user=Depends(get_current_user)):
    notifs = STORE.get_notifications(user["id"], category=category)
    return {"success": True, "data": notifs}


@app.patch("/api/v1/notifications/{nid}/read")
def read_notification(nid: str, user=Depends(get_current_user)):
    STORE.mark_notification_read(nid, user["id"])
    return {"success": True}


@app.post("/api/v1/notifications/mark-all-read")
def read_all_notifications(user=Depends(get_current_user)):
    STORE.mark_all_notifications_read(user["id"])
    return {"success": True}


@app.get("/api/v1/notifications/preferences")
def get_preferences(user=Depends(get_current_user)):
    prefs = STORE.get_notification_preferences(user["id"])
    return {"success": True, "data": prefs}


@app.put("/api/v1/notifications/preferences")
def update_preferences(inp: NotificationPreferencesIn, user=Depends(get_current_user)):
    STORE.update_notification_preferences(user["id"], inp.model_dump())
    return {"success": True, "data": STORE.get_notification_preferences(user["id"])}


# ---------------------------------------------------------------------------
# Tournament Notification Dispatchers
# ---------------------------------------------------------------------------
def _dispatch_new_tournament_notifications(t: dict):
    sport_id = (t.get("sport_id") or "").lower()
    t_lat = float(t.get("lat") or 17.4401)
    t_lng = float(t.get("lng") or 78.3489)
    title = t.get("title", "New Tournament")
    venue = t.get("venue", "Hyderabad")
    deadline = t.get("registration_deadline", "soon")

    for p in STORE.all_profiles():
        uid = p.get("user_id", f"user-{p['id']}")
        prefs = STORE.get_notification_preferences(uid)
        if not prefs.get("tournament_alerts", True):
            continue

        athlete_sports = [s.get("sport", "").lower() for s in p.get("sports", [])]
        if not athlete_sports and p.get("primary_sport"):
            athlete_sports = [p["primary_sport"].lower()]

        sport_match = (sport_id in athlete_sports) or ("all" in athlete_sports) or (not sport_id)
        dist = calculate_distance_km(t_lat, t_lng, float(p.get("lat", 17.4401)), float(p.get("lng", 78.3489)))
        is_nearby = dist <= 25.0

        if sport_match or is_nearby:
            if sport_match and is_nearby:
                notif_title = f"🏆 New {sport_id.capitalize()} Tournament Nearby"
                notif_msg = f"{title} matching your profile is now open at {venue} ({dist:.1f} km away). Register before {deadline}!"
            elif sport_match:
                notif_title = f"🏆 New {sport_id.capitalize()} Tournament Open"
                notif_msg = f"A new {sport_id.capitalize()} tournament matching your profile is now open: {title}."
            else:
                notif_title = "📍 Tournament Happening Near You"
                notif_msg = f"{title} is taking place near your area ({venue}, {dist:.1f} km away)."

            STORE.create_notification(
                user_id=uid,
                category="tournaments",
                title=notif_title,
                message=notif_msg,
                related_entity_id=t["id"],
                action_url="/app/tournaments",
            )


def _dispatch_tournament_update_notifications(old_t: Optional[dict], new_t: dict):
    if not old_t or not new_t:
        return
    tid = new_t["id"]
    title = new_t.get("title", "Tournament")
    status = new_t.get("status", "open")
    old_status = old_t.get("status", "open")

    regs = STORE.get_registrations(tournament_id=tid)
    notified_users = set()

    for r in regs:
        uid = r["user_id"]
        if uid in notified_users:
            continue
        notified_users.add(uid)

        if status == "cancelled" and old_status != "cancelled":
            n_title = f"⚠️ Tournament Cancelled: {title}"
            n_msg = f"We regret to inform you that {title} has been cancelled. Any payments are queued for refund."
        else:
            n_title = f"ℹ️ Tournament Update: {title}"
            n_msg = f"{title} details have been updated. Date: {new_t.get('starts_at')}, Venue: {new_t.get('venue')}."

        STORE.create_notification(
            user_id=uid,
            category="tournaments",
            title=n_title,
            message=n_msg,
            related_entity_id=tid,
            action_url="/app/tournaments",
        )


# ---------------------------------------------------------------------------
# Admin Capabilities
# ---------------------------------------------------------------------------
@app.post("/api/v1/admin/tournaments")
def admin_create_tournament(inp: TournamentIn, admin=Depends(require_admin)):
    t = STORE.create_tournament(inp.model_dump())
    _dispatch_new_tournament_notifications(t)
    return {"success": True, "data": t}


@app.put("/api/v1/admin/tournaments/{tid}")
def admin_update_tournament(tid: str, inp: TournamentUpdateIn, admin=Depends(require_admin)):
    old_t = STORE.get_tournament(tid)
    t = STORE.update_tournament(tid, inp.model_dump(exclude_none=True))
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    _dispatch_tournament_update_notifications(old_t, t)
    return {"success": True, "data": t}


@app.post("/api/v1/tournaments/{tid}/remind")
def remind_tournament_deadline(tid: str, admin=Depends(require_admin)):
    t = STORE.get_tournament(tid)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    sent_count = 0
    for p in STORE.all_profiles():
        uid = p.get("user_id", f"user-{p['id']}")
        if STORE.is_registered(tid, uid):
            continue
        prefs = STORE.get_notification_preferences(uid)
        if not prefs.get("tournament_alerts", True):
            continue
        STORE.create_notification(
            user_id=uid,
            category="tournaments",
            title=f"⏰ Registration Closing Soon: {t['title']}",
            message=f"Registration for {t['title']} closes {t.get('registration_deadline', 'soon')}. Secure your spot now!",
            related_entity_id=tid,
            action_url="/app/tournaments",
        )
        sent_count += 1
    return {"success": True, "sent_count": sent_count}


@app.get("/api/v1/admin/registrations")
def admin_registrations(admin=Depends(require_admin)):
    return {"success": True, "data": STORE.get_registrations()}


@app.post("/api/v1/admin/discounts")
def admin_create_discount(inp: CreateDiscountIn, admin=Depends(require_admin)):
    d = STORE.create_discount(inp.model_dump())
    return {"success": True, "data": d}


@app.patch("/api/v1/admin/discounts/{did}/toggle")
def admin_toggle_discount(did: str, admin=Depends(require_admin)):
    disc = STORE.get_discount_by_code(did) or STORE.get_tournament(did)  # handle code or id
    from .db import DB
    row = DB.fetchone("SELECT active FROM discounts WHERE id = ? OR code = ?", (did, did))
    if not row:
        raise HTTPException(status_code=404, detail="Discount not found")
    new_status = 0 if row["active"] else 1
    DB.execute("UPDATE discounts SET active = ? WHERE id = ? OR code = ?", (new_status, did, did))
    return {"success": True, "active": bool(new_status)}


@app.get("/api/v1/admin/payments")
def admin_payments(admin=Depends(require_admin)):
    return {"success": True, "data": STORE.all_payments()}


@app.post("/api/v1/admin/payments/{pid}/refund")
def admin_refund(pid: str, inp: RefundIn, admin=Depends(require_admin)):
    refunded = STORE.refund_payment(pid)
    if not refunded:
        raise HTTPException(status_code=404, detail="Payment not found")
    # Also notify user
    STORE.create_notification(
        user_id=refunded["user_id"],
        category="system",
        title="💳 Payment Refund Processed",
        message=f"Refund of ₹{refunded['total_amount']} has been initiated: {inp.reason or 'Admin processed refund'}.",
        related_entity_id=refunded["id"],
    )
    return {"success": True, "payment": refunded}


@app.post("/api/v1/admin/announcements")
async def admin_announcement(inp: AnnouncementIn, admin=Depends(require_admin)):
    t = STORE.get_tournament(inp.tournamentId)
    title = sanitize_text(inp.title)
    msg = sanitize_text(inp.message)

    # Broadcast notification to matched athletes
    sport = inp.sportId or (t["sport_id"] if t else None)
    for p in STORE.all_profiles():
        user_id = p.get("user_id", f"user-{p['id']}")
        # check preferences
        prefs = STORE.get_notification_preferences(user_id)
        if not prefs.get("tournament_alerts", True):
            continue
        STORE.create_notification(
            user_id=user_id,
            category="tournaments",
            title=title,
            message=msg,
            related_entity_id=inp.tournamentId,
            action_url="/app/tournaments",
        )
        await WS_MANAGER.broadcast_notification(p["id"], {"title": title, "message": msg})
    return {"success": True, "message": "Announcement broadcast successfully."}


@app.get("/api/v1/admin/reports")
def admin_reports(status: Optional[str] = None, admin=Depends(require_admin)):
    return {"success": True, "data": STORE.get_reports(status)}


@app.post("/api/v1/admin/reports/{rid}/resolve")
def admin_resolve_report(rid: str, admin=Depends(require_admin)):
    STORE.resolve_report(rid, status="resolved")
    return {"success": True}


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
@app.websocket("/api/v1/ws/chat/{profile_id}")
async def chat_websocket(websocket: WebSocket, profile_id: str):
    await WS_MANAGER.connect(profile_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Heartbeats or incoming client ping
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        WS_MANAGER.disconnect(profile_id, websocket)


# ---------------------------------------------------------------------------
# Events (pickup games)
# ---------------------------------------------------------------------------
@app.get("/api/v1/events")
def list_events():
    evs = []
    for e in STORE.events.values():
        e2 = dict(e)
        e2["joined"] = len(e.get("participants", []))
        evs.append(e2)
    return {"success": True, "data": evs}


@app.post("/api/v1/events")
def create_event(inp: EventIn, user=Depends(get_current_profile)):
    data = inp.model_dump()
    data["host_id"] = user["id"]
    event = STORE.create_event(data)
    return {"success": True, "data": _event_payload(event["id"])}


@app.post("/api/v1/events/{eid}/join")
def join_event(eid: str, user=Depends(get_current_profile)):
    if eid not in STORE.events:
        raise HTTPException(status_code=404, detail="Event not found")
    STORE.add_participant(eid, user["id"])
    return {"success": True, "data": _event_payload(eid)}


@app.post("/api/v1/events/{eid}/leave")
def leave_event(eid: str, user=Depends(get_current_profile)):
    if eid not in STORE.events:
        raise HTTPException(status_code=404, detail="Event not found")
    STORE.remove_participant(eid, user["id"])
    return {"success": True, "data": _event_payload(eid)}


@app.get("/api/v1/events/{eid}")
def get_event(eid: str):
    if eid not in STORE.events:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"success": True, "data": _event_payload(eid)}


def _event_payload(eid):
    e = dict(STORE.events[eid])
    e["joined"] = len(e.get("participants", []))
    return e


# ---------------------------------------------------------------------------
# Sports catalog
# ---------------------------------------------------------------------------
@app.get("/api/v1/sports")
def list_sports():
    return {"success": True, "data": SPORTS}


@app.get("/api/v1/sports/{sid}/schema")
def get_schema(sid: str):
    from .store import SPORT_METRICS
    return {"success": True, "data": {"sport": sid, "metrics": SPORT_METRICS.get(sid, [])}}


@app.exception_handler(Exception)
def generic_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"success": False, "message": exc.detail})
    return JSONResponse(status_code=500, content={"success": False, "message": str(exc)})


# SPA fallback router for unified frontend delivery
if DIST_DIR and (DIST_DIR / "index.html").is_file():
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "health" or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        target_file = DIST_DIR / full_path
        if full_path and target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(DIST_DIR / "index.html")
