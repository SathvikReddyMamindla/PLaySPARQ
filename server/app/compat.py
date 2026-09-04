"""
SportSphere compatibility engine — Python port of PLAYSync's
multi-sport athlete matchmaking algorithm.

Scores a candidate against a search query across five dimensions:
  1. Geospatial proximity decay (Haversine)   S_geo
  2. Skill calibration delta                   S_skill
  3. Role complementarity / synergy            S_role
  4. Temporal availability overlap             S_time
  5. Community reliability & trust             S_trust
The numeric ranking is the source of truth; the AI layer only narrates it.
"""
from __future__ import annotations
import math

EARTH_RADIUS_KM = 6371.0

SKILL_LEVEL_SCALE = {
    "beginner": 1, "intermediate": 2, "advanced": 3, "pro": 4, "elite": 5,
}

DEFAULT_WEIGHTS = {"geo": 0.25, "skill": 0.30, "role": 0.15, "time": 0.15, "trust": 0.15}

# keyword synonyms -> canonical sport id
SPORT_ALIASES = {
    "football": "football", "soccer": "football",
    "cricket": "cricket", "badminton": "badminton",
    "basketball": "basketball", "hoops": "basketball",
    "swimming": "swimming", "swim": "swimming", "swimmer": "swimming",
    "tennis": "tennis", "athletics": "athletics", "running": "athletics",
    "run": "athletics", "runner": "athletics", "marathon": "athletics",
    "chess": "chess", "5k": "athletics", "10k": "athletics",
}

ROLE_SYNERGY_MATRIX = {
    "football": {
        "striker-midfielder": 1.0, "midfielder-striker": 1.0,
        "striker-winger": 0.95, "winger-striker": 0.95,
        "defender-goalkeeper": 0.95, "goalkeeper-defender": 0.95,
        "midfielder-defender": 0.90, "defender-midfielder": 0.90,
        "midfielder-midfielder": 0.85, "striker-striker": 0.80,
    },
    "cricket": {
        "bowler-batsman": 1.0, "batsman-bowler": 1.0,
        "all-rounder-batsman": 0.95, "all-rounder-bowler": 0.95,
        "wicketkeeper-bowler": 1.0, "bowler-wicketkeeper": 1.0,
        "batsman-batsman": 0.85, "bowler-bowler": 0.85,
    },
    "badminton": {
        "doubles front-doubles back": 1.0, "doubles back-doubles front": 1.0,
        "singles specialist-singles specialist": 1.0,
        "all-rounder-doubles front": 0.90, "all-rounder-doubles back": 0.90,
    },
}


def calculate_distance_km(lat1, lon1, lat2, lon2):
    if lat1 == lat2 and lon1 == lon2:
        return 0.0
    to_rad = math.radians
    dlat = to_rad(lat2 - lat1)
    dlon = to_rad(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.sin(dlon / 2) ** 2 * math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(EARTH_RADIUS_KM * c, 2)


def calculate_skill_score(user_level, candidate_level):
    if not user_level or not candidate_level:
        return 0.80
    l1 = SKILL_LEVEL_SCALE.get(str(user_level).lower(), 2)
    l2 = SKILL_LEVEL_SCALE.get(str(candidate_level).lower(), 2)
    delta = abs(l1 - l2)
    if delta == 0:
        return 1.0
    if delta == 1:
        return 0.75
    if delta == 2:
        return 0.35
    return 0.10


def _normalize_role(r):
    return str(r or "").lower().split("/")[0].strip()


def calculate_role_score(sport_id, user_role, candidate_role):
    if not sport_id or not user_role or not candidate_role:
        return 0.80
    rules = ROLE_SYNERGY_MATRIX.get((sport_id or "").lower())
    if not rules:
        return 0.85
    pair1 = f"{_normalize_role(user_role)}-{_normalize_role(candidate_role)}"
    pair2 = f"{_normalize_role(candidate_role)}-{_normalize_role(user_role)}"
    if pair1 in rules:
        return rules[pair1]
    if pair2 in rules:
        return rules[pair2]
    return 0.80


def calculate_time_overlap(user_slots=None, candidate_slots=None):
    user_slots = user_slots or []
    candidate_slots = candidate_slots or []
    if not user_slots or not candidate_slots:
        return 0.80
    set_a = {s.lower() for s in user_slots}
    set_b = {s.lower() for s in candidate_slots}
    inter = set_a & set_b
    union = set_a | set_b
    if not union:
        return 0.50
    return min(1.0, (len(inter) / len(union)) + (0.3 if inter else 0))


def calculate_trust_score(reliability_pct=95, rating=4.8):
    norm_rel = min(1.0, max(0.0, (reliability_pct or 0) / 100))
    norm_rating = min(1.0, max(0.0, (rating or 0) / 5.0))
    return 0.65 * norm_rel + 0.35 * norm_rating


def match_sport_for(candidate, sport_id):
    """Return the candidate's active sport entry best matching the requested sport."""
    sports = candidate.get("sports", [])
    if sport_id:
        want = (sport_id or "").lower()
        for s in sports:
            if SPORT_ALIASES.get((s.get("sport") or "").lower(), s.get("sport", "").lower()) == want:
                return s
        for s in sports:
            if s.get("sport", "").lower() == want:
                return s
    return sports[0] if sports else None


def evaluate_compatibility(query, candidate, weights=None):
    weights = {**DEFAULT_WEIGHTS, **(weights or {})}
    radius_km = float(query.get("radiusKm", query.get("radius_km", 10)) or 10)

    lat = query.get("lat", 17.4401)
    lng = query.get("lng", 78.3489)
    dist = calculate_distance_km(float(lat), float(lng),
                                 float(candidate.get("lat", 17.4401)),
                                 float(candidate.get("lng", 78.3489)))

    s_geo = max(0.0, 1 - (dist / (radius_km * 1.2)))

    user_skill = query.get("skillLevel", query.get("skill_level", "intermediate")) or "intermediate"
    sport_id = query.get("sportId", query.get("sport_id", ""))
    matched = match_sport_for(candidate, sport_id)
    candidate_skill = (matched or {}).get("skill_level") or candidate.get("skill_level")
    s_skill = calculate_skill_score(user_skill, candidate_skill)

    user_role = query.get("role", "")
    candidate_role = (matched or {}).get("role") or candidate.get("role") or ""
    s_role = calculate_role_score(sport_id, user_role, candidate_role)

    s_time = calculate_time_overlap(query.get("availabilitySlots", query.get("availability", [])),
                                    candidate.get("availability", []))

    s_trust = calculate_trust_score(candidate.get("reliability_rate", 95),
                                    candidate.get("rating", 4.8))

    score = (weights["geo"] * s_geo +
             weights["skill"] * s_skill +
             weights["role"] * s_role +
             weights["time"] * s_time +
             weights["trust"] * s_trust)
    pct = round(min(100, max(0, score * 100)))

    tier = "Good Match"
    if pct >= 90:
        tier = "Exceptional Match"
    elif pct >= 80:
        tier = "High Synergy"
    elif pct >= 70:
        tier = "Compatible Partner"

    tags = []
    if s_skill >= 0.95:
        tags.append("Exact Skill Level")
    elif s_skill >= 0.70:
        tags.append("Compatible Skill Range")
    if dist <= 3.0:
        tags.append(f"Hyperlocal ({dist} km)")
    else:
        tags.append(f"{dist} km away")
    if s_role >= 0.90:
        tags.append("High Role Complementarity")
    if (candidate.get("reliability_rate") or 0) >= 98:
        tags.append(f"{candidate['reliability_rate']}% Reliability Record")
    if s_time >= 0.70:
        tags.append("Overlapping Active Hours")

    return {
        "compatibilityScore": pct,
        "matchTier": tier,
        "distanceKm": dist,
        "breakdown": {
            "proximityScore": round(s_geo * 100),
            "skillCalibrationScore": round(s_skill * 100),
            "roleSynergyScore": round(s_role * 100),
            "scheduleOverlapScore": round(s_time * 100),
            "trustScore": round(s_trust * 100),
        },
        "reasonTags": tags,
        "matchedSport": matched,
    }


def sport_name(sport_id):
    from .store import SPORTS
    for s in SPORTS:
        if s["id"] == sport_id:
            return s["name"]
    return sport_id
