"""
SportSphere in-memory data store + seed data, with optional SQLite persistence.

Ports the PLAYSync mock database (ATHLETES_DB, TEAMS_DB, EVENTS_DB) to Python and
extends it with sport-specific telemetry so the cross-sport normalization + AI
re-ranking has real, varied data to work with.

The store is the live in-memory source of truth (so routes can read/mutate dicts
directly). When `SPORTSPHERE_DB` is set (default `./sportsphere.db`), the state is
written through to SQLite after every mutating request and rehydrated on startup, so
accounts, connections, conversations, messages, events and payments survive restarts.
"""
from __future__ import annotations
import json
import os
import sqlite3
import time
import uuid

DB_PATH = os.getenv("SPORTSPHERE_DB", os.path.join(os.path.dirname(__file__), "..", "sportsphere.db"))


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _now_ms() -> int:
    return int(time.time() * 1000)


# ---------------------------------------------------------------------------
# Base catalog
# ---------------------------------------------------------------------------
SPORTS = [
    {"id": "football", "name": "Football", "emoji": "⚽"},
    {"id": "cricket", "name": "Cricket", "emoji": "🏏"},
    {"id": "badminton", "name": "Badminton", "emoji": "🏸"},
    {"id": "basketball", "name": "Basketball", "emoji": "🏀"},
    {"id": "swimming", "name": "Swimming", "emoji": "🏊"},
    {"id": "tennis", "name": "Tennis", "emoji": "🎾"},
    {"id": "athletics", "name": "Athletics & Running", "emoji": "🏃"},
    {"id": "chess", "name": "Chess", "emoji": "♟️"},
]

SKILL_LEVELS = ["beginner", "intermediate", "advanced", "pro", "elite"]
AVAILABILITY_SLOTS = [
    "weekday_morning", "weekday_evening", "weekday_afternoon",
    "friday_night", "saturday_morning", "saturday_evening",
    "sunday_morning", "weekend_morning", "weekend_afternoon", "weekend_evening",
]

# Sport-specific telemetry keys, used by the AI parser + performance summaries.
SPORT_METRICS = {
    "chess": ["fide_rating", "platform_rating", "blitz_rating"],
    "athletics": ["five_k_pace_min", "weekly_mileage_km", "ten_k_pb_min"],
    "swimming": ["pace_50m_sec", "weekly_volume_km", "primary_stroke"],
    "cricket": ["batting_average", "bowling_speed_kmph", "matches_played"],
    "football": ["minutes_per_match", "position", "preferred_foot"],
    "badminton": ["win_rate", "preferred_format", "play_style"],
    "basketball": ["position", "playing_style", "matches_played"],
    "tennis": ["ntrp_level", "dominant_hand", "preferred_surface"],
}


# ---------------------------------------------------------------------------
# Seed athletes (port + extend PLAYSync mockDatabase)
# ---------------------------------------------------------------------------
def _seed_profiles():
    profiles = [
        {
            "id": "ath-1", "name": "Arjun Mehta", "handle": "@arjun_playmaker",
            "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Madhapur", "lat": 17.4483, "lng": 78.3915,
            "primary_sport": "Football", "skill_level": "intermediate", "role": "Central Midfielder",
            "bio": "Looking for 7v7 turf matches on weekday evenings. High work rate, box-to-box playmaker.",
            "rating": 4.8, "reliability_rate": 99, "matches_played": 64,
            "availability": ["weekday_evening", "weekend_morning", "weekend_evening"],
            "sports": [
                {"sport": "football", "skill_level": "intermediate", "role": "Midfielder",
                 "metrics": {"position": "Central Midfielder", "preferred_foot": "Right", "match_format": "7v7 Turf"}},
                {"sport": "athletics", "skill_level": "intermediate", "role": "5K Runner",
                 "metrics": {"primary_event": "5K", "target_pace": "5:15 min/km", "personal_best": "25m 40s"}},
            ],
        },
        {
            "id": "ath-2", "name": "Vikram Kumar", "handle": "@vikram_striker",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Jubilee Hills", "lat": 17.4319, "lng": 78.4073,
            "primary_sport": "Football", "skill_level": "intermediate", "role": "Striker",
            "bio": "Clinical finisher looking for regular 5v5/7v7 squads. High stamina and runs the channels.",
            "rating": 4.9, "reliability_rate": 96, "matches_played": 92,
            "availability": ["weekday_evening", "friday_night", "weekend_evening"],
            "sports": [
                {"sport": "football", "skill_level": "intermediate", "role": "Striker",
                 "metrics": {"position": "Center Forward / Striker", "preferred_foot": "Right (Strong)", "match_format": "7v7 Turf"}},
                {"sport": "cricket", "skill_level": "beginner", "role": "Top-order Batter",
                 "metrics": {"batting_style": "Right Hand", "matches_played": 14}},
            ],
        },
        {
            "id": "ath-3", "name": "Karthik Rao", "handle": "@karthik_cb",
            "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Kondapur", "lat": 17.4615, "lng": 78.3614,
            "primary_sport": "Football", "skill_level": "intermediate", "role": "Defender",
            "bio": "Solid defender with good passing range. Always on time, looking for competitive amateur teams.",
            "rating": 4.7, "reliability_rate": 100, "matches_played": 45,
            "availability": ["weekend_morning", "weekend_evening"],
            "sports": [
                {"sport": "football", "skill_level": "intermediate", "role": "Defender",
                 "metrics": {"position": "Center Back / Sweeper", "preferred_foot": "Both", "match_format": "7v7 / 11v11"}},
            ],
        },
        {
            "id": "ath-4", "name": "Ananya Deshmukh", "handle": "@ananya_badminton",
            "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Hitec City", "lat": 17.4435, "lng": 78.3772,
            "primary_sport": "Badminton", "skill_level": "advanced", "role": "Singles Specialist",
            "bio": "State-level tournament player looking for high-intensity sparring partners in Hitec City.",
            "rating": 5.0, "reliability_rate": 100, "matches_played": 120,
            "availability": ["weekday_morning", "weekend_morning"],
            "sports": [
                {"sport": "badminton", "skill_level": "advanced", "role": "Singles Specialist",
                 "metrics": {"preferred_format": "Singles / Mixed Doubles", "play_style": "Aggressive attacking & fast drop shots", "win_rate": "82%"}},
                {"sport": "tennis", "skill_level": "intermediate", "role": "Baseliner",
                 "metrics": {"ntrp_level": 3.5, "dominant_hand": "Right"}},
            ],
        },
        {
            "id": "ath-5", "name": "Rohan Verma", "handle": "@rohan_pace",
            "avatar": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Banjara Hills", "lat": 17.4156, "lng": 78.4354,
            "primary_sport": "Cricket", "skill_level": "advanced", "role": "Fast Bowler",
            "bio": "Leather ball club cricketer clocking 125+ km/h. Looking for weekend net sessions and matches.",
            "rating": 4.9, "reliability_rate": 98, "matches_played": 110,
            "availability": ["saturday_morning", "sunday_morning"],
            "sports": [
                {"sport": "cricket", "skill_level": "advanced", "role": "Fast Bowler",
                 "metrics": {"bowling_style": "Right-arm Fast Medium (125 km/h)", "batting_style": "Lower Order Hitter", "matches_played": 110}},
            ],
        },
        {
            "id": "ath-6", "name": "Pooja Iyer", "handle": "@pooja_marathon",
            "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Financial District", "lat": 17.4143, "lng": 78.3392,
            "primary_sport": "Athletics & Running", "skill_level": "intermediate", "role": "10K Runner",
            "bio": "Targeting sub-50 min 10K. Looking for running buddies for 5:30 min/km pace long runs.",
            "rating": 4.8, "reliability_rate": 97, "matches_played": 58,
            "availability": ["weekday_morning", "sunday_morning"],
            "sports": [
                {"sport": "athletics", "skill_level": "intermediate", "role": "10K Runner",
                 "metrics": {"primary_event": "10K / Half Marathon", "target_pace": "5:30 min/km", "personal_best": "10K: 52m 14s"}},
                {"sport": "swimming", "skill_level": "beginner", "role": "Freestyle Lap Swimmer",
                 "metrics": {"primary_stroke": "Freestyle", "pace_50m_sec": "38s"}},
            ],
        },
        {
            "id": "ath-7", "name": "Divya Nambiar", "handle": "@divya_swim",
            "avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Gachibowli", "lat": 17.4401, "lng": 78.3489,
            "primary_sport": "Swimming", "skill_level": "intermediate", "role": "Freestyle & Butterfly",
            "bio": "Swims 2.5km sessions 4x weekly at Gachibowli stadium pool. Looking for disciplined lane partners.",
            "rating": 4.9, "reliability_rate": 100, "matches_played": 75,
            "availability": ["weekday_morning", "saturday_morning"],
            "sports": [
                {"sport": "swimming", "skill_level": "intermediate", "role": "Freestyle & Butterfly",
                 "metrics": {"primary_stroke": "Freestyle", "pace_50m_sec": "29.5s", "weekly_volume_km": 10}},
            ],
        },
        {
            "id": "ath-8", "name": "Sameer Sen", "handle": "@sameer_pg",
            "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Kavuri Hills", "lat": 17.4377, "lng": 78.3976,
            "primary_sport": "Basketball", "skill_level": "advanced", "role": "Point Guard",
            "bio": "Pass-first playmaker looking for 3v3 and 5v5 pickup runs on outdoor and indoor courts.",
            "rating": 4.9, "reliability_rate": 99, "matches_played": 84,
            "availability": ["weekday_evening", "weekend_evening"],
            "sports": [
                {"sport": "basketball", "skill_level": "advanced", "role": "Point Guard",
                 "metrics": {"position": "Point Guard", "style": "High IQ Court Vision & Drive"}},
            ],
        },
        {
            "id": "ath-9", "name": "Varun Teja", "handle": "@varun_tennis",
            "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Manikonda", "lat": 17.4250, "lng": 78.3650,
            "primary_sport": "Tennis", "skill_level": "beginner", "role": "Rally Partner",
            "bio": "Started tennis 6 months ago. Looking for patient rally partners to practice topspin and match play.",
            "rating": 4.6, "reliability_rate": 95, "matches_played": 19,
            "availability": ["weekend_afternoon"],
            "sports": [
                {"sport": "tennis", "skill_level": "beginner", "role": "Rally Partner",
                 "metrics": {"ntrp_level": 2.5, "dominant_hand": "Right"}},
            ],
        },
        {
            "id": "ath-10", "name": "Ishaan Bose", "handle": "@ishaan_chess",
            "avatar": "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=300&q=80",
            "city": "Hyderabad", "neighborhood": "Gachibowli", "lat": 17.4401, "lng": 78.3489,
            "primary_sport": "Chess", "skill_level": "advanced", "role": "Positional Player",
            "bio": "FIDE ~1650. Prefer slow positional battles. Look for OTB blitz and rapid sparring in Gachibowli.",
            "rating": 4.8, "reliability_rate": 97, "matches_played": 130,
            "availability": ["weekday_evening", "weekend_evening"],
            "sports": [
                {"sport": "chess", "skill_level": "advanced", "role": "Positional Player",
                 "metrics": {"fide_rating": 1650, "time_control": "Rapid 10+0 / Blitz 3+2"}},
            ],
        },
    ]
    return profiles


def _seed_teams():
    return [
        {
            "id": "team-1", "name": "Hyderabad Strikers FC", "sport_id": "football",
            "city": "Hyderabad", "neighborhood": "Madhapur", "lat": 17.4483, "lng": 78.3915,
            "open_roles": ["Goalkeeper", "Winger"], "skill_level": "intermediate",
            "schedule": "Friday Nights 8:30 PM at AstroPark Turf", "roster_count": 8, "target_roster": 10,
        },
        {
            "id": "team-2", "name": "Gachibowli Titans CC", "sport_id": "cricket",
            "city": "Hyderabad", "neighborhood": "Gachibowli", "lat": 17.4401, "lng": 78.3489,
            "open_roles": ["Fast Bowler", "Top-order Batter"], "skill_level": "intermediate",
            "schedule": "Sunday Mornings 7:30 AM at Gymkhana Turf", "roster_count": 9, "target_roster": 11,
        },
        {
            "id": "team-3", "name": "Kondapur Badminton Club", "sport_id": "badminton",
            "city": "Hyderabad", "neighborhood": "Kondapur", "lat": 17.4615, "lng": 78.3614,
            "open_roles": ["Doubles Front", "Doubles Back"], "skill_level": "intermediate",
            "schedule": "Weekday Evenings at SportsArena Kondapur", "roster_count": 5, "target_roster": 6,
        },
    ]


def _seed_events():
    return [
        {
            "id": "evt-1", "title": "Friday Night 7v7 Turf Match", "sport_id": "football",
            "venue": "AstroPark Arena, Madhapur", "city": "Hyderabad", "neighborhood": "Madhapur",
            "lat": 17.4483, "lng": 78.3915, "starts_at": "Friday 8:30 PM",
            "capacity": 14, "skill_level": "intermediate", "price": "₹250", "description": "Structured 7v7 on 4G turf. All levels welcome, evening slots.",
        },
        {
            "id": "evt-2", "title": "Sunday 10K Community LSD Run", "sport_id": "athletics",
            "venue": "Botanical Garden Trail, Gachibowli", "city": "Hyderabad", "neighborhood": "Gachibowli",
            "lat": 17.4401, "lng": 78.3489, "starts_at": "Sunday 6:00 AM",
            "capacity": 30, "skill_level": "all", "price": "Free", "description": "Long slow distance run at conversational pace with pacer groups.",
        },
        {
            "id": "evt-3", "title": "Weekend Badminton Open Court", "sport_id": "badminton",
            "venue": "SportsArena, Kondapur", "city": "Hyderabad", "neighborhood": "Kondapur",
            "lat": 17.4615, "lng": 78.3614, "starts_at": "Saturday 6:30 PM",
            "capacity": 8, "skill_level": "intermediate", "price": "₹120", "description": "Round-robin doubles and singles sparring on wooden courts.",
        },
    ]


def _seed_community_posts():
    return [
        {
            "id": "post-1", "author_id": "ath-1", "author": "Rahul Sharma", "handle": "@rahul_striker",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            "sport": "Football", "sportEmoji": "⚽", "sportColor": "pitch", "timestamp": "2 hours ago",
            "location": "AstroPark Arena, Hyderabad",
            "content": "Great evening match with the Hyderabad community! 7v7 went down to a penalty shootout under the floodlights. Shoutout to @vikram_k for the stoppage-time equalizer! 🔥",
            "likesCount": 38, "commentsCount": 12, "hasImage": True,
            "postImage": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
            "badge": "Match MVP", "created_at": _now_ms() - 7200000,
        },
        {
            "id": "post-2", "author_id": "ath-4", "author": "Ananya Rao", "handle": "@ananya_smash",
            "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
            "sport": "Badminton", "sportEmoji": "🏸", "sportColor": "volt", "timestamp": "4 hours ago",
            "location": "SmashZone Hitec City",
            "content": "Personal best today 🏸 Clocked a 312 km/h smash during morning drill sets with our newly formed doubles ladder. If anyone is looking for competitive 6:00 AM sparring in Hitec City, shoot me a connect!",
            "likesCount": 54, "commentsCount": 19, "hasImage": False, "badge": "Sparring Request",
            "created_at": _now_ms() - 14400000,
        },
        {
            "id": "post-3", "author_id": "ath-5", "author": "Kiran Reddy", "handle": "@kiran_cricket99",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
            "sport": "Cricket", "sportEmoji": "🏏", "sportColor": "ember", "timestamp": "5 hours ago",
            "location": "Gymkhana Turf 2, Hyderabad",
            "content": "Looking for 2 more players for Saturday morning! 8:00 AM start, 16-over turf box match with leather ball. Need 1 medium pacer and 1 top-order bat. Ping here or hit connect!",
            "likesCount": 29, "commentsCount": 8, "hasImage": False, "badge": "Team Looking (2 Spots)",
            "created_at": _now_ms() - 18000000,
        },
        {
            "id": "post-4", "author_id": "ath-6", "author": "Pooja Iyer", "handle": "@pooja_runs",
            "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
            "sport": "Athletics & Running", "sportEmoji": "🏃", "sportColor": "ember", "timestamp": "7 hours ago",
            "location": "Botanical Garden Trail",
            "content": "Sunday 14K LSD run unlocked! 12 runners joined through SportSphere across 3 different pacing groups (5:00, 5:45, and 6:30 min/km). Next weekend we do the Durgam Cheruvu bridge loop.",
            "likesCount": 71, "commentsCount": 23, "hasImage": True,
            "postImage": "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=800&q=80",
            "badge": "Community Run", "created_at": _now_ms() - 25200000,
        },
    ]


class Store:
    """In-memory data store. Clean, volatile repository keeping state during runtime."""

    def __init__(self, **kwargs):
        self.profiles: dict[str, dict] = {}
        self.users: dict[str, dict] = {}
        self.teams: dict[str, dict] = {}
        self.events: dict[str, dict] = {}
        self.connections: dict[str, dict] = {}
        self.conversations: dict[str, dict] = {}
        self.stats_log: dict[str, list] = {}
        self.payments: dict[str, dict] = {}
        self.community_posts: dict[str, dict] = {}
        self._pair_to_conv_id: dict[tuple[str, str], str] = {}

        # Seed data directly into memory
        for p in _seed_profiles():
            self.profiles[p["id"]] = p
        for t in _seed_teams():
            self.teams[t["id"]] = t
        for e in _seed_events():
            e["participants"] = [{"profile_id": "ath-1", "status": "host"}]
            e.setdefault("created_at", _now_ms() - (10 - int(e["id"].split("-")[-1])) * 3600_000)
            self.events[e["id"]] = e
        for cp in _seed_community_posts():
            self.community_posts[cp["id"]] = cp

    def persist(self):
        """No-op for pure in-memory operation."""
        pass


    # --- profiles ---
    def get_profile(self, pid):
        return self.profiles.get(pid)

    def all_profiles(self):
        return list(self.profiles.values())

    def create_profile(self, data=None):
        profile = dict(data or {})
        # Honour a caller-supplied id; otherwise generate a fresh one.
        pid = profile.get("id") or _new_id("ath")
        profile["id"] = pid
        profile.setdefault("id", pid)
        profile.setdefault("handle", "@athlete")
        profile.setdefault("avatar", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80")
        profile.setdefault("city", "Hyderabad")
        profile.setdefault("neighborhood", "")
        profile.setdefault("lat", 17.4401)
        profile.setdefault("lng", 78.3489)
        profile.setdefault("primary_sport", "Football")
        profile.setdefault("skill_level", "intermediate")
        profile.setdefault("role", "")
        profile.setdefault("bio", "")
        profile.setdefault("rating", 4.5)
        profile.setdefault("reliability_rate", 95)
        profile.setdefault("matches_played", 0)
        profile.setdefault("availability", [])
        profile.setdefault("sports", [])
        profile.setdefault("trust_score", None)
        profile.setdefault("trust_note", None)
        self.profiles[pid] = profile
        return profile

    # --- users ---
    def get_user_by_id(self, uid):
        return self.users.get(uid)

    def get_user_by_email(self, email):
        for u in self.users.values():
            if u["email"].lower() == email.lower():
                return u
        return None

    def create_user(self, email, password_hash, display_name):
        uid = _new_id("user")
        self.users[uid] = {
            "id": uid, "email": email, "password_hash": password_hash,
            "display_name": display_name, "profile_id": None, "created_at": _now_ms(),
        }
        return self.users[uid]

    # --- connections ---
    def create_connection(self, sender_id, recipient_id, sport_id, ctype, message):
        cid = _new_id("con")
        self.connections[cid] = {
            "id": cid, "sender_id": sender_id, "recipient_id": recipient_id,
            "sport_id": sport_id, "type": ctype, "message": message,
            "status": "pending", "created_at": _now_ms(),
        }
        return self.connections[cid]

    def connections_for(self, profile_id):
        return [c for c in self.connections.values()
                if c["sender_id"] == profile_id or c["recipient_id"] == profile_id]

    def connected_ids(self, profile_id):
        """Set of profile ids this athlete is 'accepted' with."""
        out = set()
        for c in self.connections.values():
            if c["status"] != "accepted":
                continue
            if c["sender_id"] == profile_id:
                out.add(c["recipient_id"])
            elif c["recipient_id"] == profile_id:
                out.add(c["sender_id"])
        return out

    # --- conversations / messages ---
    def get_or_create_conversation(self, a, b):
        pair = tuple(sorted([a, b]))
        cid = self._pair_to_conv_id.get(pair)
        if cid and cid in self.conversations:
            return self.conversations[cid]
        # Check if legacy key exists
        legacy_key = f"{pair[0]}::{pair[1]}"
        if legacy_key in self.conversations:
            self._pair_to_conv_id[pair] = legacy_key
            return self.conversations[legacy_key]

        new_cid = _new_id("conv")
        self.conversations[new_cid] = {
            "id": new_cid, "participants": [a, b], "messages": [], "created_at": _now_ms(),
        }
        self._pair_to_conv_id[pair] = new_cid
        return self.conversations[new_cid]

    def get_conversation(self, cid):
        if not cid:
            return None
        if cid in self.conversations:
            return self.conversations[cid]
        # Fallback if cid was passed in legacy ath-X::ath-Y form or pair
        if "::" in cid:
            parts = cid.split("::")
            if len(parts) == 2:
                pair = tuple(sorted(parts))
                existing_cid = self._pair_to_conv_id.get(pair)
                if existing_cid and existing_cid in self.conversations:
                    return self.conversations[existing_cid]
        return None

    def conversations_for(self, profile_id):
        conv = []
        for c in self.conversations.values():
            if profile_id in c.get("participants", []):
                conv.append(c)
        return conv


    # --- events ---
    def add_participant(self, event_id, profile_id, status="joined"):
        ev = self.events[event_id]
        ev.setdefault("participants", [])
        for p in ev["participants"]:
            if p["profile_id"] == profile_id:
                p["status"] = status
                return
        ev["participants"].append({"profile_id": profile_id, "status": status})

    def remove_participant(self, event_id, profile_id):
        ev = self.events[event_id]
        ev["participants"] = [p for p in ev.get("participants", []) if p["profile_id"] != profile_id]

    def create_event(self, data):
        eid = _new_id("evt")
        event = {
            "id": eid, "title": data.get("title", "Untitled Event"),
            "sport_id": data.get("sport_id", "football"), "venue": data.get("venue", ""),
            "city": data.get("city", "Hyderabad"), "neighborhood": data.get("neighborhood", ""),
            "lat": data.get("lat", 17.4401), "lng": data.get("lng", 78.3489),
            "starts_at": data.get("starts_at", "Friday 8:30 PM"),
            "capacity": data.get("capacity", 10), "skill_level": data.get("skill_level", "all"),
            "price": data.get("price", "Free"), "description": data.get("description", ""),
            "participants": [{"profile_id": data.get("host_id"), "status": "host"}],
            "created_at": _now_ms(),
        }
        self.events[eid] = event
        return event

    # --- payments ---
    def record_payment(self, profile_id, event_id, amount, method="card"):
        pid = _new_id("pay")
        self.payments[pid] = {
            "id": pid, "profile_id": profile_id, "event_id": event_id,
            "amount": amount, "method": method, "status": "success",
            "created_at": _now_ms(),
        }
        return self.payments[pid]

    def payments_for(self, profile_id):
        return [p for p in self.payments.values() if p["profile_id"] == profile_id]

    def total_spent(self, profile_id):
        return sum(p["amount"] for p in self.payments_for(profile_id))

    def joined_event_ids(self, profile_id):
        return {e["id"] for e in self.events.values()
                if any(p["profile_id"] == profile_id for p in e.get("participants", []))}

    # --- seed / profile ownership helpers ---
    def owned_profile_ids(self):
        """Set of profile ids owned by a registered user (vs. seeded demo athletes)."""
        return {u["profile_id"] for u in self.users.values() if u.get("profile_id")}

    def is_seed_profile(self, pid):
        return pid not in self.owned_profile_ids()

    # --- community posts ---
    def get_community_posts(self):
        posts = list(self.community_posts.values())
        posts.sort(key=lambda p: p.get("created_at", 0), reverse=True)
        return posts

    def create_community_post(self, author_profile, data):
        pid = _new_id("post")
        sport_name = data.get("sport") or author_profile.get("primary_sport", "Football")
        from .compat import SPORT_ALIASES
        emoji_map = {"football": "⚽", "cricket": "🏏", "badminton": "🏸", "basketball": "🏀", "swimming": "🏊", "tennis": "🎾", "athletics": "🏃", "chess": "♟️"}
        norm_sport = SPORT_ALIASES.get(str(sport_name).lower(), str(sport_name).lower())
        post = {
            "id": pid,
            "author_id": author_profile.get("id"),
            "author": author_profile.get("name", "Athlete"),
            "handle": author_profile.get("handle", "@athlete"),
            "avatar": author_profile.get("avatar") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            "sport": sport_name,
            "sportEmoji": emoji_map.get(norm_sport, "🎯"),
            "sportColor": "volt" if norm_sport == "badminton" else ("pitch" if norm_sport == "football" else "ember"),
            "timestamp": "Just now",
            "location": data.get("location") or author_profile.get("neighborhood") or author_profile.get("city", "Hyderabad"),
            "content": data.get("content", "").strip(),
            "likesCount": 0,
            "commentsCount": 0,
            "hasImage": bool(data.get("postImage")),
            "postImage": data.get("postImage"),
            "badge": data.get("badge") or "Community Post",
            "created_at": _now_ms(),
        }
        self.community_posts[pid] = post
        return post

    def like_community_post(self, post_id):
        post = self.community_posts.get(post_id)
        if post:
            post["likesCount"] = post.get("likesCount", 0) + 1
            return post
        return None

    # --- conversation read state ---
    def mark_conversation_read(self, cid, reader_id):
        con = self.conversations.get(cid)
        if not con:
            return 0
        marked = 0
        for m in con.get("messages", []):
            if m.get("sender_id") != reader_id and not m.get("read"):
                m["read"] = True
                marked += 1
        return marked


STORE = Store()
