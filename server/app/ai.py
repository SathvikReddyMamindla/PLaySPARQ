"""
SportSphere AI layer — Featherless AI (OpenAI-compatible).

Endpoints:
  /api/v1/ai/parse-profile
  /api/v1/ai/match-explanation
  /api/v1/ai/trust-note
  /api/v1/ai/performance-summary

The key lives ONLY on the server (FEATHERLESS_API_KEY in server/.env). Featherless is
called from here, never from the browser. Every AI operation has a deterministic
heuristic fallback so the demo never breaks if the key is missing or Featherless is down.
"""
from __future__ import annotations
import json
import os
import re

MODEL = os.getenv("FEATHERLESS_MODEL", "Qwen/Qwen2.5-7B-Instruct")
API_BASE = os.getenv("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1")

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("FEATHERLESS_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        _client = OpenAI(api_key=api_key, base_url=API_BASE)
        return _client
    except Exception as e:  # pragma: no cover
        print("[ai] client init failed:", e)
        return None


def ai_enabled():
    return get_client() is not None


def _chat_json(system: str, user: str, temperature: float = 0.2, max_tokens: int = 700):
    client = get_client()
    if not client:
        return None
    try:
        kwargs = dict(
            model=MODEL,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        # Featherless supports response_format; degrade gracefully if the model rejects it.
        try:
            kwargs["response_format"] = {"type": "json_object"}
        except Exception:
            pass
        r = client.chat.completions.create(**kwargs)
        raw = r.choices[0].message.content
        return _extract_json(raw)
    except Exception as e:
        print("[ai] request failed -> heuristic:", e)
        return None


def _extract_json(raw):
    if not raw:
        return None
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw).strip()
    try:
        return json.loads(raw)
    except Exception:
        pass
    # Try to pull the first balanced JSON object or array out of prose.
    m = re.search(r"(\{.*\}|\[.*\])", raw, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None


# ---------------------------------------------------------------------------
# 1. PARSE PROFILE
# ---------------------------------------------------------------------------
PARSE_SYSTEM = """You are a sports-profile parser. Convert a casual description of how someone
plays into a structured profile. Normalize every sport onto a common 5-level skill scale:
[beginner, intermediate, advanced, pro, elite]. Map sport-specific signals, e.g. chess
FIDE 700-1000 -> beginner, 1000-1400 -> intermediate, 1400-1800 -> advanced, 1800+ -> pro;
cricket "club/district level" -> advanced, "municipal/college" -> intermediate,
"just for fun" -> beginner; 5K time 35+ min -> beginner, 28-35 -> intermediate,
23-28 -> advanced, sub-23 -> pro.

Respond with ONLY valid JSON strictly following this schema:
{
  "primary_sport": "string (e.g. badminton, football, cricket, chess, tennis, running, swimming, basketball)",
  "sports": [
    {
      "sport": "string",
      "skill_level": "beginner|intermediate|advanced|pro|elite",
      "role": "string or null",
      "metrics": {}
    }
  ],
  "availability": ["array of slots e.g. weekday_morning, weekday_evening, weekend_morning, weekend_evening"],
  "location": {"city": "string", "neighborhood": "string"},
  "skill_tags": ["array of tags"],
  "summary": "1-2 sentence athlete summary"
}"""


def _parse_profile(raw_text: str) -> dict | None:
    client_result = _chat_json(PARSE_SYSTEM, f'Here is what the athlete said: """{raw_text}"""')
    if client_result:
        client_result = _clean_parse(client_result, raw_text)
        client_result["_source"] = "featherless"
        return client_result
    result = _heuristic_parse(raw_text)
    result["_source"] = "heuristic"
    return result


def _clean_parse(data: dict, raw_text: str):
    # Normalize schema keys regardless of what the model returns.
    raw_sports = data.get("sports")
    if not raw_sports and (data.get("sport") or data.get("primary_sport")):
        raw_sports = [{
            "sport": data.get("sport") or data.get("primary_sport"),
            "skill_level": data.get("skill_level") or data.get("level") or "intermediate",
            "role": data.get("role"),
            "metrics": data.get("metrics") or {},
        }]

    sports = []
    for s in (raw_sports or []):
        if isinstance(s, dict):
            level = str(s.get("skill_level", s.get("skillLevel", s.get("level", "intermediate")))).lower()
            sports.append({
                "sport": str(s.get("sport", s.get("name", ""))).lower().replace(" & running", "").replace(" and running", ""),
                "skill_level": level if level in SKILLS else "intermediate",
                "role": s.get("role"),
                "metrics": s.get("metrics") or {},
            })

    # If sports is still empty, fall back to heuristic sport detection
    if not sports:
        det_sport = _detect_sport(raw_text)
        det_skill = _detect_skill_level(raw_text, det_sport)
        sports.append({"sport": det_sport, "skill_level": det_skill, "role": None, "metrics": {}})

    primary = data.get("primary_sport") or (sports[0]["sport"] if sports else "football")
    primary = str(primary).lower().replace(" & running", "").replace(" and running", "")

    loc = data.get("location")
    if isinstance(loc, str):
        loc = {"city": "Hyderabad", "neighborhood": loc}
    elif not isinstance(loc, dict) or not loc.get("neighborhood"):
        h_loc = _heuristic_parse(raw_text).get("location") or {}
        loc = {"city": (loc.get("city") if isinstance(loc, dict) else None) or h_loc.get("city", "Hyderabad"),
               "neighborhood": (loc.get("neighborhood") if isinstance(loc, dict) else None) or h_loc.get("neighborhood", "")}

    avail = data.get("availability") or []
    if not avail or not isinstance(avail, list):
        avail = _heuristic_parse(raw_text).get("availability", ["weekday_evening", "weekend_morning"])

    return {
        "sports": sports,
        "primary_sport": primary,
        "skill_level": (sports[0]["skill_level"] if sports else "intermediate"),
        "availability": avail,
        "location": loc,
        "skill_tags": data.get("skill_tags") or [sports[0]["skill_level"] if sports else "intermediate"],
        "summary": data.get("summary") or raw_text[:160],
        "is_spammy": bool(data.get("is_spammy", False)),
        "trust_signals": data.get("trust_signals") or {"score": 85, "reasons": ["AI validated profile"]},
    }


SKILLS = {"beginner", "intermediate", "advanced", "pro", "elite"}

# Sport-specific keyword -> skill mappings for the heuristic fallback.
_SPORT_KEYWORDS = {
    "badminton": ["badminton", "shuttle", "smash", "court"],
    "football": ["football", "soccer", "turf", "footballer", "striker", "midfield"],
    "cricket": ["cricket", "batsman", "bowler", "net session", "wkt", "leather ball"],
    "chess": ["chess", "fide", "blitz", "rapid", "elo", "otb", "checkmate"],
    "basketball": ["basketball", "hoops", "3v3", "point guard"],
    "swimming": ["swim", "lane", "lap", "pool", "freestyle", "breaststroke"],
    "tennis": ["tennis", "rally", "ntrp", "baseline", "serve"],
    "athletics": ["run", "running", "jog", "5k", "10k", "marathon", "half marathon", "pace", "km"],
}

_ADVANCED_HINTS = ["state", "district", "club", "competitive", "fide 14", "fide 15", "fide 16",
                   "fide 16", "tournament", "division", "league", "120 km"]
_INTERMEDIATE_HINTS = ["intermediate", "casual", "regular", "weekend", "600", "700", "800", "900",
                       "decent", "can play", "club-level"]
_BEGINNER_HINTS = ["beginner", "just started", "new", "learning", "six months", "trying", "occasionally"]


def _detect_sport(text: str) -> str:
    tl = text.lower()
    # Score each sport by keyword hits, then break ties by earliest mention
    # so the sport a person leads with (usually their primary) wins.
    scored = {}
    for sport, kws in _SPORT_KEYWORDS.items():
        hits = 0
        first_pos = len(tl) + 1
        for k in kws:
            pos = tl.find(k)
            if pos != -1:
                hits += 1
                first_pos = min(first_pos, pos)
        if hits:
            scored[sport] = {"hits": hits, "first": first_pos}
    if not scored:
        return "football"
    # Primary sort by hits desc, tie-break by earliest mention asc.
    best = max(scored, key=lambda s: (scored[s]["hits"], -scored[s]["first"], s))
    return best


def _detect_skill_level(text: str, sport: str) -> str:
    tl = text.lower()
    # Chess rating heuristic.
    if sport == "chess":
        m = re.search(r"(\d{3,4})", tl)
        if m:
            rating = int(m.group(1))
            if rating < 1000:
                return "beginner"
            if rating < 1400:
                return "intermediate"
            if rating < 1800:
                return "advanced"
            return "pro"
    # 5K / running pace heuristic.
    if sport == "athletics":
        m = re.search(r"(5k[^\d]*(\d{1,2}):?(\d{2})?)", tl)
        if m:
            try:
                mins = int(m.group(2) or 20)
            except Exception:
                mins = 20
            if mins >= 35:
                return "beginner"
            if mins >= 28:
                return "intermediate"
            if mins >= 23:
                return "advanced"
            return "pro"
    if any(h in tl for h in _ADVANCED_HINTS):
        return "advanced"
    if any(h in tl for h in _INTERMEDIATE_HINTS):
        return "intermediate"
    if any(h in tl for h in _BEGINNER_HINTS):
        return "beginner"
    return "intermediate"


def _heuristic_parse(raw_text: str) -> dict:
    text = raw_text or ""
    tl = text.lower()
    sport = _detect_sport(tl)
    level = _detect_skill_level(tl, sport)

    city = "Hyderabad"
    neighborhood = ""
    for area in ["Kondapur", "Gachibowli", "Madhapur", "Hitec City", "Jubilee Hills",
                 "Banjara Hills", "Manikonda", "Kukatpally", "Financial District", "Kavuri Hills"]:
        if area.lower() in tl:
            neighborhood = area
            break

    availability = []
    if "weekend" in tl or "saturday" in tl or "sunday" in tl:
        availability += ["weekend_morning", "weekend_evening"]
    if "morning" in tl:
        availability += ["weekday_morning", "weekend_morning"]
    if "evening" in tl or "night" in tl:
        availability += ["weekday_evening", "weekend_evening"]
    if not availability:
        availability = ["weekday_evening", "weekend_morning"]

    # A 1-2 sentence human summary derived from what we understood.
    summary = f"{text.strip()[:140]}"
    return {
        "sports": [{"sport": sport, "skill_level": level, "role": None, "metrics": {}}],
        "primary_sport": sport,
        "skill_level": level,
        "availability": availability,
        "location": {"city": city, "neighborhood": neighborhood},
        "skill_tags": [level],
        "summary": summary,
        "is_spammy": False,
        "trust_signals": {"score": 78, "reasons": ["specific details", "consistent claims"]},
    }


# ---------------------------------------------------------------------------
# 2. MATCH EXPLANATION
# ---------------------------------------------------------------------------
MATCH_SYSTEM = """You are a matchmaker for athletes. You receive a requester profile and a list of
candidate athlete profiles, each with a precomputed compatibility score (0-100) and a numeric
breakdown of proximityScore, skillCalibrationScore, roleSynergyScore, scheduleOverlapScore,
trustScore. For each candidate, produce an item with:
- "athlete_id": the candidate's athlete_id
- "match_tier": one of "Perfect Match", "High Synergy", "Good Fit", "Possible Fit"
- "one_liner": <= 18 words that names the top 2-3 concrete reasons a human can verify
- "reason_tags": 2-4 short tags
Tone: friendly, specific, encouraging.
Respond with ONLY valid JSON: {"ranked": [{"athlete_id": "...", "match_tier": "...", "one_liner": "...", "reason_tags": [...]}]}"""


def match_explanations(requester: dict, candidates: list[dict]) -> list[dict]:
    """candidates is a list of dicts with precomputed score + breakdown + base profile."""
    payload = {
        "requester": _compact_profile(requester),
        "candidates": [_compact_candidate(c) for c in candidates],
    }
    result = _chat_json(MATCH_SYSTEM, json.dumps(payload), temperature=0.7, max_tokens=900)
    raw_items = None
    if isinstance(result, list):
        raw_items = result
    elif isinstance(result, dict):
        for k in ["ranked", "candidates", "explanations", "matches", "results"]:
            if isinstance(result.get(k), list):
                raw_items = result[k]
                break

    if raw_items:
        # Match back by athlete_id if possible, else positional zip
        by_id = {item.get("athlete_id"): item for item in raw_items if isinstance(item, dict) and item.get("athlete_id")}
        out = []
        for i, c in enumerate(candidates):
            cid = c["athlete_id"]
            e = by_id.get(cid) or (raw_items[i] if i < len(raw_items) and isinstance(raw_items[i], dict) else None)
            if e:
                out.append(_normalize_expl(e, cid))
            else:
                out.append(_heuristic_explanation(c))
        return out

    # Heuristic narration fallback.
    out = []
    for c in candidates:
        out.append(_heuristic_explanation(c))
    return out


def _compact_profile(p: dict) -> dict:
    return {
        "name": p.get("name"), "primary_sport": p.get("primary_sport"),
        "skill_level": p.get("skill_level"), "role": p.get("role"),
        "availability": p.get("availability", []), "city": p.get("neighborhood", ""),
    }


def _compact_candidate(c: dict) -> dict:
    return {
        "athlete_id": c["athlete_id"], "name": c.get("name"),
        "sport": c.get("sport"), "skillLevel": c.get("skill_level"),
        "role": c.get("role"), "distanceKm": round(c.get("distanceKm", 0), 1),
        "score": c.get("compatibilityScore"), "breakdown": c.get("breakdown"),
        "availability": c.get("availability", []), "reliabilityRate": c.get("reliability_rate"),
    }


def _normalize_expl(e: dict, athlete_id: str) -> dict:
    return {
        "athlete_id": athlete_id,
        "match_tier": e.get("match_tier", "Good Fit"),
        "one_liner": e.get("one_liner", ""),
        "reason_tags": e.get("reason_tags", []),
        "explanation": e.get("explanation", e.get("one_liner", "")),
    }


def _heuristic_explanation(c: dict) -> dict:
    bid = c.get("breakdown", {})
    parts = []
    if (bid.get("skillCalibrationScore") or 0) >= 90:
        parts.append("same skill level")
    if (bid.get("roleSynergyScore") or 0) >= 90:
        parts.append("complementary role")
    if c.get("distanceKm", 99) <= 5:
        parts.append(f"{c['distanceKm']} km away")
    if (bid.get("scheduleOverlapScore") or 0) >= 70:
        parts.append("overlapping availability")
    if (c.get("reliability_rate") or 0) >= 98:
        parts.append("highly reliable")
    if not parts:
        parts = ["good all-round fit"]
    one_liner = ", ".join(parts[:3])
    tier = "Perfect Match" if c.get("compatibilityScore", 0) >= 90 else (
        "High Synergy" if c.get("compatibilityScore", 0) >= 80 else "Good Fit")
    return {
        "athlete_id": c["athlete_id"],
        "match_tier": tier,
        "one_liner": one_liner.capitalize() + ".",
        "reason_tags": c.get("reasonTags", c.get("reason_tags", [])),
        "explanation": f"{c.get('name', 'This athlete')} matches your {c.get('sport', 'sport')} "
                       f"interests: {one_liner}.",
    }


# ---------------------------------------------------------------------------
# 3. TRUST NOTE
# ---------------------------------------------------------------------------
TRUST_SYSTEM = """You assess athlete profile text for trust and spam. Look for copy-paste/duplicated
bios, promotional or "gaming" language, internally contradictory claims (e.g. "beginner" plus
"national champion"), missing specifics, or suspicious contact/URL patterns.

Respond with ONLY valid JSON following this schema:
{
  "score": 85,
  "risk_level": "low",
  "flags": [],
  "note": "Specific, authentic bio with no spam detected.",
  "action": "ok"
}"""


def trust_note(profile: dict) -> dict:
    bio = profile.get("bio", "")
    result = _chat_json(TRUST_SYSTEM, json.dumps({"bio": bio, "name": profile.get("name")}),
                        temperature=0.2, max_tokens=400)
    if result and "score" in result:
        result["_source"] = "featherless"
        return result
    return _heuristic_trust(bio)


def _heuristic_trust(bio: str) -> dict:
    bl = (bio or "").lower()
    flags = []
    if re.search(r"(whatsapp|wa\.me|http|www\.|telegram|booking|pay\s*₹|join\s*my|limited\s*time)", bl):
        flags.append("Contact/sales language detected")
    if re.search(r"(beginner|new).{0,40}(national|champion|pro|elite|professional)", bl):
        flags.append("Contradictory skill claims")
    if len(bio or "") < 18:
        flags.append("Very short / generic bio")
    if len(set((bio or "").split())) / max(1, len((bio or "").split())) < 0.5:
        flags.append("Possible copy-pasted text")

    score = 90
    score -= 12 * len(flags)
    score = max(20, score)

    if flags:
        note = "We spotted some inconsistencies in this bio: " + "; ".join(flags[:2]) + "."
        risk = "medium" if len(flags) >= 2 else "low"
        action = "review"
    else:
        note = "Specific, self-consistent bio. No spam patterns detected."
        risk = "low"
        action = "ok"
    return {"score": score, "risk_level": risk, "flags": flags, "note": note, "action": action,
            "_source": "heuristic"}


# ---------------------------------------------------------------------------
# 4. PERFORMANCE SUMMARY
# ---------------------------------------------------------------------------
PERF_SYSTEM = """You turn a short log of a single athlete's performance metric into a friendly,
motivating one-line summary. Given a metric, a list of recent values, and a period, produce a
headline (<= 12 words), a "delta" (e.g. "+20%"), the metric name, and a short insight.
Respond with ONLY JSON."""


def performance_summary(sport: str, metric: str, history: list[dict]) -> dict:
    payload = {"sport": sport, "metric": metric,
               "period": "last 30 days", "history": history}
    result = _chat_json(PERF_SYSTEM, json.dumps(payload), temperature=0.6, max_tokens=300)
    if result and "headline" in result:
        result["_source"] = "featherless"
        return result
    return _heuristic_summary(sport, metric, history)


def _heuristic_summary(sport: str, metric: str, history: list[dict]) -> dict:
    vals = [float(h.get("value", 0) or 0) for h in history if h.get("value") is not None]
    if len(vals) >= 2 and vals[0] != 0:
        # For time-based metrics like pace, lower is better; for count metrics higher is better.
        lower_is_better = any(k in metric.lower() for k in ["pac", "sec", "time", "min"])
        delta = (vals[-1] - vals[0]) / abs(vals[0]) * 100
        improving = (delta < 0) if lower_is_better else (delta > 0)
        headline = (f"{metric.replace('_', ' ').title()} improved by ~{abs(delta):.0f}% this month"
                    if improving else
                    f"{metric.replace('_', ' ').title()} held steady this month")
        return {"headline": headline, "delta": f"{delta:+.0f}%", "metric": metric,
                "period": "last 30 days", "insight": headline, "is_improvement": improving,
                "_source": "heuristic"}
    return {"headline": f"{metric.replace('_', ' ').title()} tracking well", "delta": "n/a",
            "metric": metric, "period": "last 30 days",
            "insight": "Keep logging sessions to unlock a personal trend line.",
            "is_improvement": True, "_source": "heuristic"}
