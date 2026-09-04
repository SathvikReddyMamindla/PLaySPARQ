"""
SportSphere personalized recommendations engine.
Calculates rule-based transparent matchmaking scores (0-100), filters out
blocked/connected/hidden profiles, and generates personalized dashboard content.
"""
from __future__ import annotations
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from .compat import calculate_distance_km, calculate_skill_score, calculate_time_overlap, match_sport_for
from .store import STORE


def get_mutual_connections(profile_a_id: str, profile_b_id: str) -> Set[str]:
    """Calculates intersection of accepted connections between two profiles."""
    conns_a = STORE.connected_ids(profile_a_id)
    conns_b = STORE.connected_ids(profile_b_id)
    return conns_a & conns_b


def score_player_recommendation(requester: Dict[str, Any], candidate: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transparent rule-based scoring:
      Sport match:               up to 30 pts
      Skill calibration match:   up to 20 pts
      Location / proximity:      up to 20 pts
      Availability overlap:      up to 15 pts
      Playing preferences & style: up to 10 pts
      Mutual connections:        up to 5 pts
    Total: 0 - 100
    """
    req_sports = [s.get("sport", "").lower() for s in requester.get("sports", [])]
    if not req_sports and requester.get("primary_sport"):
        req_sports = [requester["primary_sport"].lower()]

    cand_sports = [s.get("sport", "").lower() for s in candidate.get("sports", [])]
    if not cand_sports and candidate.get("primary_sport"):
        cand_sports = [candidate["primary_sport"].lower()]

    common_sports = set(req_sports) & set(cand_sports)
    primary_common = next(iter(common_sports), candidate.get("primary_sport", "Football").lower())

    # 1. Sport match (30 pts)
    if common_sports:
        s_sport = 30.0 if requester.get("primary_sport", "").lower() in cand_sports else 22.0
    else:
        s_sport = 5.0

    # 2. Skill match (20 pts)
    matched_req_sport = match_sport_for(requester, primary_common)
    matched_cand_sport = match_sport_for(candidate, primary_common)
    req_skill = (matched_req_sport or {}).get("skill_level", requester.get("skill_level", "intermediate"))
    cand_skill = (matched_cand_sport or {}).get("skill_level", candidate.get("skill_level", "intermediate"))
    skill_factor = calculate_skill_score(req_skill, cand_skill)
    s_skill = skill_factor * 20.0

    # 3. Location proximity (20 pts)
    lat1 = requester.get("lat", 17.4401)
    lng1 = requester.get("lng", 78.3489)
    lat2 = candidate.get("lat", 17.4401)
    lng2 = candidate.get("lng", 78.3489)
    dist_km = calculate_distance_km(lat1, lng1, lat2, lng2)

    if dist_km <= 3.0:
        s_loc = 20.0
    elif dist_km <= 7.0:
        s_loc = 16.0
    elif dist_km <= 15.0:
        s_loc = 10.0
    elif dist_km <= 25.0:
        s_loc = 5.0
    else:
        s_loc = 2.0

    # 4. Availability overlap (15 pts)
    avail_factor = calculate_time_overlap(requester.get("availability", []), candidate.get("availability", []))
    s_avail = avail_factor * 15.0

    # 5. Playing preferences & style synergy (10 pts)
    req_pref = (requester.get("preferred_match_type", "") + " " + requester.get("playing_style", "")).lower()
    cand_pref = (candidate.get("preferred_match_type", "") + " " + candidate.get("playing_style", "")).lower()
    if req_pref and cand_pref and any(w in cand_pref for w in req_pref.split() if len(w) > 3):
        s_pref = 10.0
    elif candidate.get("preferred_match_type"):
        s_pref = 7.0
    else:
        s_pref = 5.0

    # 6. Mutual connections (5 pts)
    mutuals = get_mutual_connections(requester["id"], candidate["id"])
    s_mutual = min(5.0, len(mutuals) * 2.5)

    total = round(min(100.0, max(0.0, s_sport + s_skill + s_loc + s_avail + s_pref + s_mutual)))

    # Generate transparent explanations ("Why you're seeing this player")
    reasons = []
    if common_sports:
        reasons.append(f"Both play {primary_common.capitalize()}")
    if skill_factor >= 0.9:
        reasons.append(f"Matching skill level ({cand_skill.capitalize()})")
    elif skill_factor >= 0.7:
        reasons.append(f"Compatible skill tier ({cand_skill.capitalize()})")
    if dist_km <= 3.0:
        reasons.append(f"Hyperlocal match ({dist_km} km away in {candidate.get('neighborhood', 'your area')})")
    elif dist_km <= 10.0:
        reasons.append(f"Nearby ({dist_km} km in {candidate.get('neighborhood', candidate.get('city', 'Hyderabad'))})")
    if avail_factor >= 0.7:
        reasons.append("Overlapping active hours & weekend slots")
    if len(mutuals) > 0:
        reasons.append(f"{len(mutuals)} mutual connection{'s' if len(mutuals) > 1 else ''}")
    if (candidate.get("reliability_rate") or 0) >= 98:
        reasons.append(f"{candidate['reliability_rate']}% verified reliability rating")

    return {
        "candidate": candidate,
        "compatibility_score": total,
        "matched_sport": primary_common,
        "distance_km": dist_km,
        "mutual_count": len(mutuals),
        "reasons": reasons,
        "breakdown": {
            "sport_match": round(s_sport, 1),
            "skill_match": round(s_skill, 1),
            "location_match": round(s_loc, 1),
            "availability_match": round(s_avail, 1),
            "preferences_match": round(s_pref, 1),
            "mutual_connections": round(s_mutual, 1),
        },
    }


def get_recommended_players(requester_profile: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
    """
    Returns filtered and scored athlete recommendations:
      - Excludes self
      - Excludes blocked users (mutual)
      - Excludes already connected athletes
      - Excludes athletes with discovery disabled
    """
    req_id = requester_profile["id"]
    blocked_ids = set(STORE.get_blocked_users(req_id))
    connected_ids = STORE.connected_ids(req_id)

    candidates = []
    for p in STORE.all_profiles():
        cid = p["id"]
        if cid == req_id:
            continue
        if cid in blocked_ids:
            continue
        if STORE.is_blocked(req_id, cid):
            continue
        if cid in connected_ids:
            continue
        if not p.get("discovery_enabled", True):
            continue

        scored = score_player_recommendation(requester_profile, p)
        candidates.append(scored)

    candidates.sort(key=lambda x: x["compatibility_score"], reverse=True)
    return candidates[:limit]


def get_recommended_tournaments(user_profile: Dict[str, Any], user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Recommends open tournaments matching athlete's sports, skill tier, and location.
    """
    user_sports = {s.get("sport", "").lower() for s in user_profile.get("sports", [])}
    if user_profile.get("primary_sport"):
        user_sports.add(user_profile["primary_sport"].lower())

    lat = user_profile.get("lat", 17.4401)
    lng = user_profile.get("lng", 78.3489)
    tournaments = STORE.get_tournaments()

    registered_ids = {r["tournament_id"] for r in STORE.get_registrations(user_id=user_id)}

    scored = []
    for t in tournaments:
        score = 50.0
        sport_match = t["sport_id"].lower() in user_sports
        if sport_match:
            score += 30.0
        if t["skill_level"] == "all" or t["skill_level"] == user_profile.get("skill_level"):
            score += 10.0
        dist = calculate_distance_km(lat, lng, t.get("lat", 17.4401), t.get("lng", 78.3489))
        if dist <= 10:
            score += 10.0
        t_copy = dict(t)
        t_copy["distance_km"] = dist
        t_copy["is_registered"] = t["id"] in registered_ids
        t_copy["recommendation_score"] = int(score)
        scored.append(t_copy)

    scored.sort(key=lambda x: (not x["is_registered"], x["recommendation_score"]), reverse=True)
    return scored[:limit]


def get_time_greeting(name: str) -> str:
    # Use UTC offset for IST (UTC+5:30)
    hour = (datetime.now(timezone.utc).hour + 5) % 24
    if hour < 12:
        greeting = "Good morning"
    elif hour < 17:
        greeting = "Good afternoon"
    else:
        greeting = "Good evening"
    return f"{greeting}, {name.split()[0]} 👋"


def get_personalized_home_feed(user: Dict[str, Any], profile: Dict[str, Any]) -> Dict[str, Any]:
    """Generates the unified personalized homepage payload."""
    greeting = get_time_greeting(profile.get("name") or user.get("display_name", "Athlete"))
    recommended_players = get_recommended_players(profile, limit=6)
    recommended_tournaments = get_recommended_tournaments(profile, user["id"], limit=4)
    activities = STORE.get_activities(user["id"], limit=8)
    discounts = STORE.all_discounts(active_only=True)

    # Upcoming registrations
    registrations = STORE.get_registrations(user_id=user["id"])
    upcoming_tournaments = []
    for r in registrations:
        t = STORE.get_tournament(r["tournament_id"])
        if t:
            upcoming_tournaments.append({
                "registration_id": r["id"],
                "tournament": t,
                "team_name": r.get("team_name", ""),
                "registered_at": r["registered_at"],
            })

    return {
        "greeting": greeting,
        "user": {"id": user["id"], "display_name": user["display_name"]},
        "profile": profile,
        "recommended_players": [
            {
                "id": p["candidate"]["id"],
                "name": p["candidate"]["name"],
                "handle": p["candidate"].get("handle", "@athlete"),
                "avatar": p["candidate"].get("avatar"),
                "primary_sport": p["candidate"].get("primary_sport"),
                "matched_sport": p["matched_sport"],
                "skill_level": p["candidate"].get("skill_level"),
                "neighborhood": p["candidate"].get("neighborhood", ""),
                "city": p["candidate"].get("city", "Hyderabad"),
                "compatibility_score": p["compatibility_score"],
                "distance_km": p["distance_km"],
                "reasons": p["reasons"],
                "breakdown": p["breakdown"],
                "rating": p["candidate"].get("rating", 4.5),
                "reliability_rate": p["candidate"].get("reliability_rate", 95),
            }
            for p in recommended_players
        ],
        "tournaments": recommended_tournaments,
        "upcoming_tournaments": upcoming_tournaments,
        "recent_activities": activities,
        "special_offers": discounts[:3],
    }
