"""
SportSphere API — Python (FastAPI) backend.
Ports PLAYSync's Express matchmaking engine + discovery + connections + events,
and adds the AI layer (Featherless) + JWT auth.
"""
from __future__ import annotations
import os

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from . import ai
from .auth import (create_access_token, decode_token, get_current_profile,
                   get_current_user, hash_password, verify_password)
from .compat import (calculate_distance_km, evaluate_compatibility, match_sport_for,
                     sport_name)
from .schemas import (ConnectionRequestIn, ConnectionRespondIn, CreateProfileIn, EventIn,
                      LoginIn, MatchExplanationIn, MessageIn, ParseProfileIn, PerfSummaryIn,
                      RegisterIn, TrustNoteIn)
from .store import SPORTS, STORE

app = FastAPI(title="SportSphere API", version="0.1.0")

# CORS — allow Vite dev server, preview host, and local network IPs (for mobile devices).
origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:4173",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins.split(",") if o.strip()],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "ai_enabled": ai.ai_enabled(), "model": ai.MODEL,
            "mode": "in-memory"}



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
        "name": inp.displayName,
        "handle": "@" + inp.displayName.lower().replace(" ", "_"),
        "primary_sport": "Football",
        "skill_level": "intermediate",
    })
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
        # Lazy-create a profile if one was never seeded.
        profile = STORE.create_profile({
            "id": f"ath-{user['id'].split('-')[-1]}",
            "name": user["display_name"],
            "handle": "@" + user["display_name"].lower().replace(" ", "_"),
            "primary_sport": "Football",
            "skill_level": "intermediate",
        })
        user["profile_id"] = profile["id"]
        profile_id = profile["id"]
    return {"success": True, "user": _public_user(user), "profile_id": profile_id}


@app.post("/api/v1/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"success": True}


@app.get("/api/v1/auth/me")
def me(user=Depends(get_current_user)):
    return {"success": True, "user": _public_user(user),
            "profile_id": user.get("profile_id"),
            "profile": STORE.get_profile(user["profile_id"])}


@app.post("/api/v1/auth/demo")
def demo(response: Response):
    """One-click demo: create/return a demo user and log them in."""
    demo_user = STORE.get_user_by_email("demo@sportsphere.dev")
    if not demo_user:
        demo_user = STORE.create_user("demo@sportsphere.dev", hash_password("demo1234"), "Demo Player")
        profile = STORE.create_profile({
            "id": "ath-current-user", "name": "Demo Player", "handle": "@demo_player",
            "primary_sport": "Football", "skill_level": "intermediate",
            "neighborhood": "Kondapur", "bio": "Demo player exploring SportSphere.",
        })
        demo_user["profile_id"] = profile["id"]
    else:
        # Ensure the demo profile exists.
        if not STORE.get_profile("ath-current-user"):
            profile = STORE.create_profile({
                "id": "ath-current-user", "name": "Demo Player", "handle": "@demo_player",
                "primary_sport": "Football", "skill_level": "intermediate",
                "neighborhood": "Kondapur", "bio": "Demo player exploring SportSphere.",
            })
            demo_user["profile_id"] = profile["id"]
    token = create_access_token(demo_user["id"])
    _set_cookie(response, token)
    return {"success": True, "user": _public_user(demo_user), "profile_id": "ath-current-user"}


def _public_user(user):
    return {"id": user["id"], "email": user["email"], "display_name": user["display_name"],
            "profile_id": user.get("profile_id")}


def _set_cookie(response, token):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=int(os.getenv("JWT_EXPIRE_MINUTES", "10080")) * 60,
        samesite="lax",
        secure=False,  # dev only; set True behind HTTPS in prod
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
    return {"success": True, "parsed": parsed,
            "meta": {"source": parsed.get("_source"), "ai_enabled": ai.ai_enabled()}}


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
            "reasonTags": [],
            "compatibilityScore": 0, "breakdown": {},
        })
    expl = ai.match_explanations(requester, candidates)
    return {"success": True, "explanations": expl,
            "meta": {"ai_enabled": ai.ai_enabled()}}


@app.post("/api/v1/ai/trust-note")
def ai_trust_note(inp: TrustNoteIn):
    profile = STORE.get_profile(inp.profileId) if inp.profileId else None
    bio = profile.get("bio") if profile else inp.bio or ""
    name = profile.get("name") if profile else None
    result = ai.trust_note({"bio": bio, "name": name})
    return {"success": True, **result, "meta": {"ai_enabled": ai.ai_enabled()}}


@app.post("/api/v1/ai/performance-summary")
def ai_perf_summary(inp: PerfSummaryIn):
    profile = STORE.get_profile(inp.profileId) if inp.profileId else STORE.get_profile("ath-current-user")
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
# Profiles
# ---------------------------------------------------------------------------
@app.get("/api/v1/athletes")
def list_athletes():
    return {"success": True, "data": STORE.all_profiles()}


@app.get("/api/v1/athletes/{pid}")
def get_athlete(pid: str):
    p = STORE.get_profile(pid)
    if not p:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return {"success": True, "data": p}


@app.post("/api/v1/athletes")
def create_athlete(inp: CreateProfileIn, user=Depends(get_current_user)):
    data = inp.model_dump(exclude_none=True)
    data["id"] = user.get("profile_id") or f"ath-{user['id'].split('-')[-1]}"
    profile = STORE.create_profile(data)
    # Link to user if not already.
    if not user.get("profile_id"):
        user["profile_id"] = profile["id"]
    return {"success": True, "data": profile}


@app.put("/api/v1/athletes/{pid}/sports/{sport_id}")
def update_sport_telemetry(pid: str, sport_id: str, payload: dict):
    profile = STORE.get_profile(pid)
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete not found")
    for s in profile.get("sports", []):
        if s["sport"] == sport_id:
            s.update(payload)
            return {"success": True, "data": profile}
    profile.setdefault("sports", []).append({"sport": sport_id, **payload})
    return {"success": True, "data": profile}


# ---------------------------------------------------------------------------
# Discovery (with AI-ranked explanation attached per result)
# ---------------------------------------------------------------------------
@app.get("/api/v1/discovery/players")
def discover_players(request: Request, lat: float = 17.4401, lng: float = 78.3489, sportId: str = "all",
                     skillLevel: str = "all", radiusKm: float = 10, role: str = "",
                     search: str = "", sortBy: str = "compatibility", limit: int = 20,
                     profile_id: str = ""):
    query = {"lat": lat, "lng": lng, "sportId": sportId, "skillLevel": skillLevel,
             "radiusKm": radiusKm, "role": role, "search": search,
             "availabilitySlots": [], "limit": limit}

    # Automatically resolve caller profile from cookie if not explicitly passed
    caller_pid = profile_id
    if not caller_pid or caller_pid == "ath-current-user":
        try:
            token = request.cookies.get("access_token")
            if token:
                payload = decode_token(token)
                uid = payload.get("sub")
                u = STORE.get_user_by_id(uid)
                if u and u.get("profile_id"):
                    caller_pid = u["profile_id"]
        except Exception:
            pass

    connected_ids = STORE.connected_ids(caller_pid) if caller_pid else set()
    scored = []
    seen_ids = set()
    for p in STORE.all_profiles():
        pid = p.get("id")
        if not pid or pid == caller_pid or pid in seen_ids:
            continue
        seen_ids.add(pid)
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
        payload["is_connected"] = p["id"] in connected_ids
        players.append(payload)

    # Generate AI explanations in one batch for the top results.
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
    skills = [s["skill_level"] for s in p.get("sports", [])]
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
        "rating": p.get("rating", 4.5), "reliability_rate": reliability,
        "reliabilityRate": reliability,
        "availability": p.get("availability", []),
        "matches_played": p.get("matches_played", 0),
        "compatibilityScore": ev["compatibilityScore"], "matchTier": ev["matchTier"],
        "breakdown": ev["breakdown"], "reasonTags": ev["reasonTags"],
        "matched_sport": matched.get("sport", p.get("primary_sport", "")),
        "skill_scale": {"canonical": [1, 2, 3, 4], "normalized_to": matched.get("skill_level", p.get("skill_level"))},
        "tags": ev["reasonTags"], "stats": {"reliability": f"{reliability}%",
                                            "matches": p.get("matches_played", 0)},
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
def discover_events(lat: float = 17.4401, lng: float = 78.3489, radiusKm: float = 15,
                    sportId: str = "all"):
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

    # If a connection between these two athletes already exists, accept it immediately
    for c in STORE.connections.values():
        if (c["sender_id"] == user["id"] and c["recipient_id"] == inp.recipientId) or \
           (c["sender_id"] == inp.recipientId and c["recipient_id"] == user["id"]):
            c["status"] = "accepted"
            STORE.get_or_create_conversation(user["id"], inp.recipientId)
            return {"success": True, "connection": c, "auto_accepted": True}

    con = STORE.create_connection(user["id"], inp.recipientId, inp.sportId, inp.type, inp.message)
    con["status"] = "accepted"
    STORE.get_or_create_conversation(user["id"], inp.recipientId)

    return {"success": True, "connection": con, "auto_accepted": True}


@app.get("/api/v1/connections/status/{recipient_id}")
def connection_status(recipient_id: str, user=Depends(get_current_profile)):
    for c in STORE.connections.values():
        if c["sender_id"] == user["id"] and c["recipient_id"] == recipient_id:
            return {"success": True, "status": c["status"], "connection": c}
    return {"success": True, "status": "none", "connection": None}


@app.post("/api/v1/connections/respond")
def connection_respond(inp: ConnectionRespondIn, user=Depends(get_current_profile)):
    con = STORE.connections.get(inp.connectionId)
    if not con:
        raise HTTPException(status_code=404, detail="Connection not found")
    if con["recipient_id"] != user["id"] and con["sender_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your connection to respond")
    con["status"] = "accepted" if inp.accept else "declined"
    if inp.accept:
        STORE.get_or_create_conversation(con["sender_id"], con["recipient_id"])
    return {"success": True, "connection": con}


@app.get("/api/v1/connections")
def list_connections(user=Depends(get_current_profile)):
    cons = []
    for c in STORE.connections_for(user["id"]):
        e = dict(c)
        # Resolve the "other" athlete so the UI can show who it is + their sport.
        other_id = c["sender_id"] if c["recipient_id"] == user["id"] else c["recipient_id"]
        other = STORE.get_profile(other_id) or {}
        sport = (other.get("sports") or [{}])[0].get("sport", other.get("primary_sport", ""))
        e["other_id"] = other_id
        e["other_name"] = other.get("name", "Athlete")
        e["other_avatar"] = other.get("avatar", "")
        e["other_sport"] = sport
        e["is_incoming"] = (c["recipient_id"] == user["id"])
        cons.append(e)

    # Accepted friends, with their sport, for the map + chat.
    friends = []
    for pid in STORE.connected_ids(user["id"]):
        prof = STORE.get_profile(pid) or {}
        sport = (prof.get("sports") or [{}])[0].get("sport", prof.get("primary_sport", ""))
        conv = STORE.get_or_create_conversation(user["id"], pid)
        friends.append({
            "id": pid, "name": prof.get("name", "Athlete"), "avatar": prof.get("avatar", ""),
            "sport": sport, "skill_level": (prof.get("sports") or [{}])[0].get("skill_level", prof.get("skill_level")),
            "lat": prof.get("lat"), "lng": prof.get("lng"),
            "city": prof.get("city", "Hyderabad"), "neighborhood": prof.get("neighborhood", ""),
            "conversation_id": conv["id"],
        })
    return {"success": True, "data": {"connections": cons, "connected": list(STORE.connected_ids(user["id"])), "friends": friends}}


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
@app.get("/api/v1/chat/conversations")
def get_conversations(user=Depends(get_current_profile)):
    convs = []
    for c in STORE.conversations_for(user["id"]):
        other_id = next((p for p in c["participants"] if p != user["id"]), None)
        other = STORE.get_profile(other_id) or {}
        sport = (other.get("sports") or [{}])[0].get("sport", other.get("primary_sport", ""))
        unread = sum(1 for m in c.get("messages", []) if m.get("sender_id") != user["id"] and not m.get("read"))
        convs.append({"id": c["id"], "with_id": other_id, "with_name": other.get("name", "Athlete"),
                      "with_avatar": other.get("avatar", ""), "with_sport": sport,
                      "last_message": (c["messages"][-1]["body"] if c["messages"] else ""),
                      "unread": unread,
                      "updated_at": c.get("updated_at", c["created_at"])})
    convs.sort(key=lambda x: x["updated_at"], reverse=True)
    return {"success": True, "data": convs}


@app.get("/api/v1/chat/conversations/{cid}/messages")
def get_messages(cid: str, user=Depends(get_current_profile)):
    con = STORE.get_conversation(cid)
    if not con:
        return {"success": True, "messages": []}
    if user["id"] not in con["participants"]:
        raise HTTPException(status_code=403, detail="Not part of this conversation")
    # Automatically mark incoming messages as read when viewing
    STORE.mark_conversation_read(con["id"], user["id"])
    return {"success": True, "messages": con["messages"]}


@app.post("/api/v1/chat/conversations/{cid}/read")
def mark_read(cid: str, user=Depends(get_current_profile)):
    con = STORE.get_conversation(cid)
    marked = STORE.mark_conversation_read(con["id"] if con else cid, user["id"])
    return {"success": True, "marked": marked}


@app.post("/api/v1/chat/conversations/{cid}/messages")
def send_message(cid: str, inp: MessageIn, user=Depends(get_current_profile)):
    con = STORE.get_conversation(cid)
    if not con:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if user["id"] not in con["participants"]:
        raise HTTPException(status_code=403, detail="Not part of this conversation")
    msg = {"id": f"msg-{len(con['messages'])}", "sender_id": user["id"],
           "body": inp.body, "created_at": int(__import__("time").time() * 1000),
           "read": False}
    con["messages"].append(msg)
    con["updated_at"] = msg["created_at"]
    return {"success": True, "message": msg}



# ---------------------------------------------------------------------------
# Community Posts
# ---------------------------------------------------------------------------
@app.get("/api/v1/community/posts")
def list_community_posts():
    posts = STORE.get_community_posts()
    return {"success": True, "data": posts}


@app.post("/api/v1/community/posts")
def create_community_post(payload: dict, user=Depends(get_current_profile)):
    content = payload.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    post = STORE.create_community_post(user, payload)
    return {"success": True, "data": post}


@app.post("/api/v1/community/posts/{pid}/like")
def like_community_post(pid: str):
    post = STORE.like_community_post(pid)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"success": True, "data": post}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
@app.get("/api/v1/notifications")
def get_notifications(user=Depends(get_current_profile)):
    # 1. Unread chat messages
    unread_messages = []
    unread_count = 0
    for c in STORE.conversations_for(user["id"]):
        other_id = next((p for p in c["participants"] if p != user["id"]), None)
        other = STORE.get_profile(other_id) or {}
        for m in c.get("messages", []):
            if m.get("sender_id") != user["id"] and not m.get("read"):
                unread_count += 1
                unread_messages.append({
                    "id": m["id"],
                    "conversation_id": c["id"],
                    "sender_id": m["sender_id"],
                    "sender_name": other.get("name", "Athlete"),
                    "sender_avatar": other.get("avatar", ""),
                    "body": m["body"],
                    "created_at": m["created_at"],
                })

    # 2. Incoming pending connection requests
    pending_requests = []
    for c in STORE.connections_for(user["id"]):
        if c.get("recipient_id") == user["id"] and c.get("status") == "pending":
            sender = STORE.get_profile(c["sender_id"]) or {}
            pending_requests.append({
                "connection_id": c["id"],
                "sender_id": c["sender_id"],
                "sender_name": sender.get("name", "Athlete"),
                "sender_avatar": sender.get("avatar", ""),
                "sport_id": c.get("sport_id", ""),
                "message": c.get("message", ""),
                "created_at": c.get("created_at"),
            })

    return {
        "success": True,
        "data": {
            "unread_count": unread_count + len(pending_requests),
            "unread_messages": unread_messages,
            "pending_requests": pending_requests,
        }
    }


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------
@app.get("/api/v1/events")
def list_events():
    evs = []
    for e in STORE.events.values():
        e2 = dict(e)
        e2["joined"] = len(e.get("participants", []))
        evs.append(e2)
    # Newest-first so an event you just added appears at the top.
    evs.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return {"success": True, "data": evs}


@app.post("/api/v1/events/{eid}/pay")
def pay_and_join(eid: str, user=Depends(get_current_profile)):
    """Simulated payment gateway + join. Records a mock payment and adds the athlete."""
    if eid not in STORE.events:
        raise HTTPException(status_code=404, detail="Event not found")
    ev = STORE.events[eid]
    price = ev.get("price", "Free")
    amount = 0.0
    if not (price and str(price).lower() in ("free", "", "0", "rs.0", "₹0", "0 rs")):
        digits = "".join(c for c in str(price) if c.isdigit())
        amount = float(digits or 0)
    payment = STORE.record_payment(user["id"], eid, amount)
    STORE.add_participant(eid, user["id"], "joined")
    return {"success": True, "payment": payment, "event": _event_payload(eid)}


@app.get("/api/v1/me/events")
def my_events(user=Depends(get_current_profile)):
    """Summary of the current user's events: joined, money spent, payment history."""
    joined_ids = STORE.joined_event_ids(user["id"])
    events = [_event_payload(eid) for eid in joined_ids]
    payments = STORE.payments_for(user["id"])
    spend = STORE.total_spent(user["id"])
    return {"success": True, "data": {
        "events": events, "payments": payments,
        "money_spent": spend, "count": len(events),
    }}


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


# ---------------------------------------------------------------------------
# Generic error handler so JSON is always returned (frontend expects JSON)
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
def generic_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"success": False, "message": str(exc)})
