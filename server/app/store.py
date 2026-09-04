"""
SportSphere persistent repository + seed catalog.
Synchronizes all profile, user, connection, chat, tournament, payment,
discount, and notification entities with SQLite persistence (db.py).
"""
from __future__ import annotations
import json
import time
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

from .db import DB, get_connection, now_ms, new_id

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


def _seed_profiles():
    return [
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


def _row_to_profile(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    p = dict(row)
    for field in ("availability", "sports", "goals", "achievements", "badges"):
        val = p.get(field)
        if isinstance(val, str):
            try:
                p[field] = json.loads(val)
            except Exception:
                p[field] = []
        elif val is None:
            p[field] = []
    p["discovery_enabled"] = bool(p.get("discovery_enabled", 1))
    p["show_activity"] = bool(p.get("show_activity", 1))
    p["show_stats"] = bool(p.get("show_stats", 1))
    return p


class Store:
    """Persistent SQLite-backed repository maintaining full compatibility with the existing API."""

    def __init__(self):
        self.stats_log: dict[str, list] = {}

    # --- profiles ---
    def get_profile(self, pid: str) -> Optional[Dict[str, Any]]:
        row = DB.fetchone("SELECT * FROM athlete_profiles WHERE id = ?", (pid,))
        return _row_to_profile(row)

    def all_profiles(self) -> List[Dict[str, Any]]:
        rows = DB.fetchall("SELECT * FROM athlete_profiles")
        return [_row_to_profile(r) for r in rows if r]

    def create_profile(self, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        profile = dict(data or {})
        pid = profile.get("id") or new_id("ath")
        now = now_ms()
        existing = self.get_profile(pid)
        if existing:
            # Update existing
            for k, v in profile.items():
                existing[k] = v
            self.save_profile(existing)
            return existing

        profile["id"] = pid
        profile.setdefault("user_id", f"user-{pid}")
        profile.setdefault("name", "Athlete")
        profile.setdefault("handle", f"@{pid}")
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
        profile.setdefault("wins", 0)
        profile.setdefault("losses", 0)
        profile.setdefault("preferred_match_type", "Casual & Competitive")
        profile.setdefault("playing_style", "")
        profile.setdefault("availability", [])
        profile.setdefault("sports", [])
        profile.setdefault("goals", [])
        profile.setdefault("achievements", [])
        profile.setdefault("badges", ["Verified Athlete"])
        profile.setdefault("trust_score", 4.5)
        profile.setdefault("trust_note", None)
        profile.setdefault("discovery_enabled", 1)
        profile.setdefault("show_activity", 1)
        profile.setdefault("show_stats", 1)
        profile.setdefault("created_at", now)
        profile.setdefault("updated_at", now)

        DB.execute(
            """
            INSERT OR REPLACE INTO athlete_profiles (
                id, user_id, name, handle, avatar, city, neighborhood, lat, lng,
                primary_sport, skill_level, role, bio, rating, reliability_rate,
                matches_played, wins, losses, preferred_match_type, playing_style,
                availability, sports, goals, achievements, badges, trust_score, trust_note,
                discovery_enabled, show_activity, show_stats, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                profile["id"], profile["user_id"], profile["name"], profile["handle"], profile["avatar"],
                profile["city"], profile["neighborhood"], profile["lat"], profile["lng"],
                profile["primary_sport"], profile["skill_level"], profile["role"], profile["bio"],
                profile["rating"], profile["reliability_rate"], profile["matches_played"],
                profile["wins"], profile["losses"], profile["preferred_match_type"], profile["playing_style"],
                json.dumps(profile["availability"]), json.dumps(profile["sports"]), json.dumps(profile["goals"]),
                json.dumps(profile["achievements"]), json.dumps(profile["badges"]),
                profile["trust_score"], profile["trust_note"],
                1 if profile["discovery_enabled"] else 0,
                1 if profile["show_activity"] else 0,
                1 if profile["show_stats"] else 0,
                profile["created_at"], profile["updated_at"],
            ),
        )
        return self.get_profile(pid)

    def save_profile(self, profile: Dict[str, Any]):
        now = now_ms()
        DB.execute(
            """
            UPDATE athlete_profiles SET
                name = ?, handle = ?, avatar = ?, city = ?, neighborhood = ?, lat = ?, lng = ?,
                primary_sport = ?, skill_level = ?, role = ?, bio = ?, rating = ?, reliability_rate = ?,
                matches_played = ?, wins = ?, losses = ?, preferred_match_type = ?, playing_style = ?,
                availability = ?, sports = ?, goals = ?, achievements = ?, badges = ?, trust_score = ?, trust_note = ?,
                discovery_enabled = ?, show_activity = ?, show_stats = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                profile.get("name", "Athlete"), profile.get("handle", ""), profile.get("avatar"),
                profile.get("city", "Hyderabad"), profile.get("neighborhood", ""),
                profile.get("lat", 17.4401), profile.get("lng", 78.3489),
                profile.get("primary_sport", "Football"), profile.get("skill_level", "intermediate"),
                profile.get("role", ""), profile.get("bio", ""),
                profile.get("rating", 4.5), profile.get("reliability_rate", 95),
                profile.get("matches_played", 0), profile.get("wins", 0), profile.get("losses", 0),
                profile.get("preferred_match_type", ""), profile.get("playing_style", ""),
                json.dumps(profile.get("availability", [])), json.dumps(profile.get("sports", [])),
                json.dumps(profile.get("goals", [])), json.dumps(profile.get("achievements", [])),
                json.dumps(profile.get("badges", [])), profile.get("trust_score"), profile.get("trust_note"),
                1 if profile.get("discovery_enabled", True) else 0,
                1 if profile.get("show_activity", True) else 0,
                1 if profile.get("show_stats", True) else 0,
                now,
                profile["id"],
            ),
        )

    # --- users ---
    def get_user_by_id(self, uid: str) -> Optional[Dict[str, Any]]:
        row = DB.fetchone("SELECT * FROM users WHERE id = ?", (uid,))
        return dict(row) if row else None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        row = DB.fetchone("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
        return dict(row) if row else None

    def create_user(self, email: str, password_hash: str, display_name: str, is_admin: int = 0) -> Dict[str, Any]:
        uid = new_id("user")
        now = now_ms()
        DB.execute(
            """
            INSERT INTO users (id, email, password_hash, display_name, profile_id, is_admin, created_at)
            VALUES (?, ?, ?, ?, NULL, ?, ?)
            """,
            (uid, email.strip(), password_hash, display_name.strip(), is_admin, now),
        )
        return self.get_user_by_id(uid)

    def link_user_profile(self, user_id: str, profile_id: str):
        DB.execute("UPDATE users SET profile_id = ? WHERE id = ?", (profile_id, user_id))

    # --- connections ---
    def create_connection(self, sender_id: str, recipient_id: str, sport_id: str, ctype: str, message: str) -> Dict[str, Any]:
        cid = new_id("con")
        now = now_ms()
        DB.execute(
            """
            INSERT INTO connections (id, sender_id, recipient_id, sport_id, type, message, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (cid, sender_id, recipient_id, sport_id, ctype, message, now, now),
        )
        # Add notification for recipient
        sender = self.get_profile(sender_id)
        sender_name = sender.get("name", "An athlete") if sender else "An athlete"
        self.create_notification(
            user_id=f"user-{recipient_id}" if not recipient_id.startswith("user-") else recipient_id,
            category="connections",
            title="🤝 New Connection Request",
            message=f"{sender_name} sent you a connection invite for {sport_id}.",
            related_entity_id=cid,
            action_url="/app/connections",
        )
        return self.get_connection_by_id(cid)

    def get_connection_by_id(self, cid: str) -> Optional[Dict[str, Any]]:
        row = DB.fetchone("SELECT * FROM connections WHERE id = ?", (cid,))
        return dict(row) if row else None

    def connections_for(self, profile_id: str) -> List[Dict[str, Any]]:
        rows = DB.fetchall(
            """
            SELECT * FROM connections
            WHERE sender_id = ? OR recipient_id = ?
            ORDER BY created_at DESC
            """,
            (profile_id, profile_id),
        )
        return [dict(r) for r in rows]

    def connected_ids(self, profile_id: str) -> Set[str]:
        rows = DB.fetchall(
            """
            SELECT sender_id, recipient_id FROM connections
            WHERE status = 'accepted' AND (sender_id = ? OR recipient_id = ?)
            """,
            (profile_id, profile_id),
        )
        out = set()
        for r in rows:
            if r["sender_id"] == profile_id:
                out.add(r["recipient_id"])
            else:
                out.add(r["sender_id"])
        return out

    def are_connected(self, profile_a: str, profile_b: str) -> bool:
        if profile_a == profile_b:
            return True
        row = DB.fetchone(
            """
            SELECT id FROM connections
            WHERE status = 'accepted'
              AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
            """,
            (profile_a, profile_b, profile_b, profile_a),
        )
        return row is not None

    def update_connection_status(self, cid: str, status: str) -> Optional[Dict[str, Any]]:
        now = now_ms()
        DB.execute("UPDATE connections SET status = ?, updated_at = ? WHERE id = ?", (status, now, cid))
        con = self.get_connection_by_id(cid)
        if con and status == "accepted":
            self.get_or_create_conversation(con["sender_id"], con["recipient_id"])
            sender = self.get_profile(con["sender_id"])
            recipient = self.get_profile(con["recipient_id"])
            recipient_name = recipient.get("name", "Your match") if recipient else "Your match"
            self.create_notification(
                user_id=f"user-{con['sender_id']}",
                category="connections",
                title="✅ Connection Accepted",
                message=f"{recipient_name} accepted your connection! You can now start chatting.",
                related_entity_id=cid,
                action_url=f"/app/chat",
            )
        return con

    # --- conversations & messages ---
    def conversation_key(self, a: str, b: str) -> str:
        s = sorted([a, b])
        return f"{s[0]}::{s[1]}"

    def get_or_create_conversation(self, a: str, b: str) -> Dict[str, Any]:
        cid = self.conversation_key(a, b)
        row = DB.fetchone("SELECT * FROM conversations WHERE id = ?", (cid,))
        now = now_ms()
        if not row:
            s = sorted([a, b])
            DB.execute(
                "INSERT INTO conversations (id, participant1_id, participant2_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (cid, s[0], s[1], now, now),
            )
            row = DB.fetchone("SELECT * FROM conversations WHERE id = ?", (cid,))
        conv = dict(row)
        conv["participants"] = [conv["participant1_id"], conv["participant2_id"]]
        return conv

    def get_conversation_by_id(self, cid: str) -> Optional[Dict[str, Any]]:
        row = DB.fetchone("SELECT * FROM conversations WHERE id = ?", (cid,))
        if not row:
            return None
        c = dict(row)
        c["participants"] = [c["participant1_id"], c["participant2_id"]]
        return c

    def conversations_for(self, profile_id: str) -> List[Dict[str, Any]]:
        rows = DB.fetchall(
            """
            SELECT * FROM conversations
            WHERE participant1_id = ? OR participant2_id = ?
            ORDER BY updated_at DESC
            """,
            (profile_id, profile_id),
        )
        out = []
        for r in rows:
            c = dict(r)
            c["participants"] = [c["participant1_id"], c["participant2_id"]]
            out.append(c)
        return out

    def get_messages(self, conversation_id: str) -> List[Dict[str, Any]]:
        rows = DB.fetchall(
            """
            SELECT * FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
            """,
            (conversation_id,),
        )
        return [dict(r) for r in rows]

    def add_message(self, conversation_id: str, sender_id: str, recipient_id: str, body: str) -> Dict[str, Any]:
        mid = new_id("msg")
        now = now_ms()
        DB.execute(
            """
            INSERT INTO messages (id, conversation_id, sender_id, recipient_id, body, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)
            """,
            (mid, conversation_id, sender_id, recipient_id, body, now),
        )
        DB.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
        msg = dict(DB.fetchone("SELECT * FROM messages WHERE id = ?", (mid,)))
        # Log unread notification for recipient
        sender = self.get_profile(sender_id)
        sender_name = sender.get("name", "Athlete") if sender else "Athlete"
        self.create_notification(
            user_id=f"user-{recipient_id}" if not recipient_id.startswith("user-") else recipient_id,
            category="messages",
            title=f"💬 New message from {sender_name}",
            message=body[:80] + ("…" if len(body) > 80 else ""),
            related_entity_id=conversation_id,
            action_url=f"/app/chat/{conversation_id}",
        )
        return msg

    def mark_conversation_read(self, conversation_id: str, reader_profile_id: str):
        now = now_ms()
        DB.execute(
            """
            UPDATE messages
            SET is_read = 1, read_at = ?
            WHERE conversation_id = ? AND recipient_id = ? AND is_read = 0
            """,
            (now, conversation_id, reader_profile_id),
        )

    def get_unread_message_count(self, recipient_profile_id: str) -> int:
        row = DB.fetchone(
            "SELECT COUNT(*) as cnt FROM messages WHERE recipient_id = ? AND is_read = 0",
            (recipient_profile_id,),
        )
        return row["cnt"] if row else 0

    def get_unread_per_conversation(self, recipient_profile_id: str) -> Dict[str, int]:
        rows = DB.fetchall(
            """
            SELECT conversation_id, COUNT(*) as cnt
            FROM messages
            WHERE recipient_id = ? AND is_read = 0
            GROUP BY conversation_id
            """,
            (recipient_profile_id,),
        )
        return {r["conversation_id"]: r["cnt"] for r in rows}

    # --- safety (block / report) ---
    def block_user(self, blocker_id: str, blocked_id: str):
        bid = new_id("blk")
        DB.execute(
            "INSERT OR IGNORE INTO blocked_users (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)",
            (bid, blocker_id, blocked_id, now_ms()),
        )

    def unblock_user(self, blocker_id: str, blocked_id: str):
        DB.execute("DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?", (blocker_id, blocked_id))

    def is_blocked(self, id_a: str, id_b: str) -> bool:
        row = DB.fetchone(
            """
            SELECT id FROM blocked_users
            WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
            """,
            (id_a, id_b, id_b, id_a),
        )
        return row is not None

    def get_blocked_users(self, blocker_id: str) -> List[str]:
        rows = DB.fetchall("SELECT blocked_id FROM blocked_users WHERE blocker_id = ?", (blocker_id,))
        return [r["blocked_id"] for r in rows]

    def report_target(self, reporter_id: str, reported_id: str, target_type: str, target_id: Optional[str], reason: str, details: str):
        rid = new_id("rpt")
        DB.execute(
            """
            INSERT INTO reported_users (id, reporter_id, reported_id, target_type, target_id, reason, details, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """,
            (rid, reporter_id, reported_id, target_type, target_id, reason, details, now_ms()),
        )

    def get_reports(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        if status:
            rows = DB.fetchall("SELECT * FROM reported_users WHERE status = ? ORDER BY created_at DESC", (status,))
        else:
            rows = DB.fetchall("SELECT * FROM reported_users ORDER BY created_at DESC")
        return [dict(r) for r in rows]

    def resolve_report(self, report_id: str, status: str = "resolved"):
        DB.execute("UPDATE reported_users SET status = ? WHERE id = ?", (status, report_id))

    # --- notifications ---
    def create_notification(self, user_id: str, category: str, title: str, message: str,
                            related_entity_id: Optional[str] = None, action_url: Optional[str] = None) -> Dict[str, Any]:
        nid = new_id("notif")
        now = now_ms()
        DB.execute(
            """
            INSERT INTO notifications (id, user_id, category, title, message, is_read, related_entity_id, action_url, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
            """,
            (nid, user_id, category, title, message, related_entity_id, action_url, now),
        )
        return dict(DB.fetchone("SELECT * FROM notifications WHERE id = ?", (nid,)))

    def get_notifications(self, user_id: str, category: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        # Also check profile id alias
        clean_uid = user_id.replace("ath-", "user-") if user_id.startswith("ath-") else user_id
        if category and category != "all":
            rows = DB.fetchall(
                """
                SELECT * FROM notifications
                WHERE (user_id = ? OR user_id = ?) AND category = ?
                ORDER BY created_at DESC LIMIT ?
                """,
                (user_id, clean_uid, category, limit),
            )
        else:
            rows = DB.fetchall(
                """
                SELECT * FROM notifications
                WHERE user_id = ? OR user_id = ?
                ORDER BY created_at DESC LIMIT ?
                """,
                (user_id, clean_uid, limit),
            )
        return [dict(r) for r in rows]

    def mark_notification_read(self, nid: str, user_id: str):
        clean_uid = user_id.replace("ath-", "user-") if user_id.startswith("ath-") else user_id
        DB.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id = ?)",
            (nid, user_id, clean_uid),
        )

    def mark_all_notifications_read(self, user_id: str):
        clean_uid = user_id.replace("ath-", "user-") if user_id.startswith("ath-") else user_id
        DB.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id = ?",
            (user_id, clean_uid),
        )

    def get_notification_preferences(self, user_id: str) -> Dict[str, Any]:
        clean_uid = user_id.replace("ath-", "user-") if user_id.startswith("ath-") else user_id
        row = DB.fetchone("SELECT * FROM notification_preferences WHERE user_id = ? OR user_id = ?", (user_id, clean_uid))
        if not row:
            return {
                "user_id": user_id,
                "email_notifications": True,
                "in_app_notifications": True,
                "tournament_alerts": True,
                "connection_alerts": True,
                "recommendation_alerts": True,
                "discount_alerts": True,
            }
        d = dict(row)
        return {k: bool(v) if k != "user_id" and k != "updated_at" else v for k, v in d.items()}

    def update_notification_preferences(self, user_id: str, data: Dict[str, Any]):
        clean_uid = user_id.replace("ath-", "user-") if user_id.startswith("ath-") else user_id
        now = now_ms()
        DB.execute(
            """
            INSERT INTO notification_preferences (
                user_id, email_notifications, in_app_notifications, tournament_alerts,
                connection_alerts, recommendation_alerts, discount_alerts, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                email_notifications = excluded.email_notifications,
                in_app_notifications = excluded.in_app_notifications,
                tournament_alerts = excluded.tournament_alerts,
                connection_alerts = excluded.connection_alerts,
                recommendation_alerts = excluded.recommendation_alerts,
                discount_alerts = excluded.discount_alerts,
                updated_at = excluded.updated_at
            """,
            (
                clean_uid,
                1 if data.get("email_notifications", True) else 0,
                1 if data.get("in_app_notifications", True) else 0,
                1 if data.get("tournament_alerts", True) else 0,
                1 if data.get("connection_alerts", True) else 0,
                1 if data.get("recommendation_alerts", True) else 0,
                1 if data.get("discount_alerts", True) else 0,
                now,
            ),
        )

    # --- tournaments ---
    def get_tournaments(self, sport_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if sport_id and sport_id != "all":
            rows = DB.fetchall("SELECT * FROM tournaments WHERE sport_id = ? ORDER BY starts_at ASC", (sport_id,))
        else:
            rows = DB.fetchall("SELECT * FROM tournaments ORDER BY starts_at ASC")
        out = []
        for r in rows:
            t = dict(r)
            for f in ("rules", "prizes"):
                if isinstance(t.get(f), str):
                    try:
                        t[f] = json.loads(t[f])
                    except Exception:
                        t[f] = []
            out.append(t)
        return out

    def get_tournament(self, tournament_id: str) -> Optional[Dict[str, Any]]:
        row = DB.fetchone("SELECT * FROM tournaments WHERE id = ?", (tournament_id,))
        if not row:
            return None
        t = dict(row)
        for f in ("rules", "prizes"):
            if isinstance(t.get(f), str):
                try:
                    t[f] = json.loads(t[f])
                except Exception:
                    t[f] = []
        return t

    def create_tournament(self, data: Dict[str, Any]) -> Dict[str, Any]:
        tid = new_id("tourn")
        now = now_ms()
        DB.execute(
            """
            INSERT INTO tournaments (
                id, title, sport_id, description, venue, city, neighborhood,
                lat, lng, banner_image, format, skill_level, starts_at, ends_at,
                registration_deadline, max_participants, current_participants,
                entry_fee, convenience_fee, tax_rate, status, rules, prizes, organizer_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                tid, data["title"], data.get("sport_id", "football"), data.get("description", ""),
                data.get("venue", "City Arena"), data.get("city", "Hyderabad"), data.get("neighborhood", ""),
                float(data.get("lat", 17.4401)), float(data.get("lng", 78.3489)),
                data.get("banner_image", ""), data.get("format", "Knockout"),
                data.get("skill_level", "all"), data.get("starts_at", "Saturday 10:00 AM"),
                data.get("ends_at", "Saturday 6:00 PM"), data.get("registration_deadline", "Friday 8:00 PM"),
                int(data.get("max_participants", 16)), 0,
                float(data.get("entry_fee", 0.0)), float(data.get("convenience_fee", 20.0)),
                float(data.get("tax_rate", 0.18)), data.get("status", "open"),
                json.dumps(data.get("rules", [])), json.dumps(data.get("prizes", [])),
                data.get("organizer_name", "SportSphere Official"), now,
            ),
        )
        return self.get_tournament(tid)

    def update_tournament(self, tid: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        cur = self.get_tournament(tid)
        if not cur:
            return None
        cur.update(data)
        DB.execute(
            """
            UPDATE tournaments SET
                title = ?, sport_id = ?, description = ?, venue = ?, city = ?, neighborhood = ?,
                lat = ?, lng = ?, banner_image = ?, format = ?, skill_level = ?, starts_at = ?,
                ends_at = ?, registration_deadline = ?, max_participants = ?, current_participants = ?,
                entry_fee = ?, convenience_fee = ?, tax_rate = ?, status = ?, rules = ?, prizes = ?,
                organizer_name = ?
            WHERE id = ?
            """,
            (
                cur["title"], cur["sport_id"], cur["description"], cur["venue"], cur["city"], cur["neighborhood"],
                cur["lat"], cur["lng"], cur["banner_image"], cur["format"], cur["skill_level"], cur["starts_at"],
                cur["ends_at"], cur["registration_deadline"], cur["max_participants"], cur["current_participants"],
                cur["entry_fee"], cur["convenience_fee"], cur["tax_rate"], cur["status"],
                json.dumps(cur["rules"]), json.dumps(cur["prizes"]), cur["organizer_name"], tid,
            ),
        )
        return self.get_tournament(tid)

    # --- tournament registrations ---
    def register_for_tournament(self, tournament_id: str, user_id: str, profile_id: str,
                                payment_id: Optional[str] = None, team_name: str = "") -> Dict[str, Any]:
        rid = new_id("treg")
        now = now_ms()
        DB.execute(
            """
            INSERT INTO tournament_registrations (id, tournament_id, user_id, profile_id, payment_id, status, team_name, registered_at)
            VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?)
            """,
            (rid, tournament_id, user_id, profile_id, payment_id, team_name, now),
        )
        DB.execute(
            "UPDATE tournaments SET current_participants = current_participants + 1 WHERE id = ?",
            (tournament_id,),
        )
        # Add notification
        t = self.get_tournament(tournament_id)
        t_title = t.get("title", "the tournament") if t else "the tournament"
        self.create_notification(
            user_id=user_id,
            category="tournaments",
            title="🎟️ Registration Confirmed!",
            message=f"You are officially registered for {t_title}. View your receipt and tournament schedule.",
            related_entity_id=tournament_id,
            action_url="/app/tournaments",
        )
        self.log_activity(
            user_id=user_id,
            activity_type="tournament_registered",
            description=f"Registered for {t_title}",
            metadata={"tournament_id": tournament_id, "team_name": team_name},
        )
        return dict(DB.fetchone("SELECT * FROM tournament_registrations WHERE id = ?", (rid,)))

    def get_registrations(self, tournament_id: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if tournament_id and user_id:
            rows = DB.fetchall(
                "SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?",
                (tournament_id, user_id),
            )
        elif tournament_id:
            rows = DB.fetchall("SELECT * FROM tournament_registrations WHERE tournament_id = ?", (tournament_id,))
        elif user_id:
            rows = DB.fetchall("SELECT * FROM tournament_registrations WHERE user_id = ?", (user_id,))
        else:
            rows = DB.fetchall("SELECT * FROM tournament_registrations ORDER BY registered_at DESC")
        return [dict(r) for r in rows]

    def is_registered(self, tournament_id: str, user_id: str) -> bool:
        row = DB.fetchone(
            "SELECT id FROM tournament_registrations WHERE tournament_id = ? AND user_id = ? AND status = 'confirmed'",
            (tournament_id, user_id),
        )
        return row is not None

    # --- payments ---
    def create_payment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pid = new_id("pay")
        now = now_ms()
        DB.execute(
            """
            INSERT INTO payments (
                id, user_id, tournament_id, order_id, payment_id, signature,
                tournament_fee, discount_amount, discount_code, convenience_fee,
                tax_amount, total_amount, currency, status, gateway, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pid, data["user_id"], data["tournament_id"], data["order_id"],
                data.get("payment_id"), data.get("signature"),
                float(data["tournament_fee"]), float(data.get("discount_amount", 0.0)),
                data.get("discount_code"), float(data.get("convenience_fee", 20.0)),
                float(data.get("tax_amount", 4.0)), float(data["total_amount"]),
                data.get("currency", "INR"), data.get("status", "pending"),
                data.get("gateway", "razorpay"), now, now,
            ),
        )
        return dict(DB.fetchone("SELECT * FROM payments WHERE id = ?", (pid,)))

    def get_payment_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        row = DB.fetchone("SELECT * FROM payments WHERE order_id = ?", (order_id,))
        return dict(row) if row else None

    def get_payment_by_id(self, payment_id: str) -> Optional[Dict[str, Any]]:
        row = DB.fetchone("SELECT * FROM payments WHERE id = ? OR payment_id = ?", (payment_id, payment_id))
        return dict(row) if row else None

    def update_payment(self, order_id: str, status: str, payment_id: Optional[str] = None, signature: Optional[str] = None):
        now = now_ms()
        DB.execute(
            """
            UPDATE payments
            SET status = ?, payment_id = COALESCE(?, payment_id), signature = COALESCE(?, signature), updated_at = ?
            WHERE order_id = ?
            """,
            (status, payment_id, signature, now, order_id),
        )

    def refund_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        now = now_ms()
        ref_id = new_id("ref")
        DB.execute(
            "UPDATE payments SET status = 'refunded', refund_id = ?, updated_at = ? WHERE id = ? OR payment_id = ?",
            (ref_id, now, payment_id, payment_id),
        )
        row = DB.fetchone("SELECT * FROM payments WHERE id = ? OR payment_id = ?", (payment_id, payment_id))
        return dict(row) if row else None

    def all_payments(self) -> List[Dict[str, Any]]:
        rows = DB.fetchall("SELECT * FROM payments ORDER BY created_at DESC")
        return [dict(r) for r in rows]

    # --- discounts ---
    def get_discount_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        row = DB.fetchone("SELECT * FROM discounts WHERE LOWER(code) = LOWER(?)", (code.strip(),))
        return dict(row) if row else None

    def all_discounts(self, active_only: bool = False) -> List[Dict[str, Any]]:
        if active_only:
            rows = DB.fetchall("SELECT * FROM discounts WHERE active = 1 ORDER BY created_at DESC")
        else:
            rows = DB.fetchall("SELECT * FROM discounts ORDER BY created_at DESC")
        return [dict(r) for r in rows]

    def create_discount(self, data: Dict[str, Any]) -> Dict[str, Any]:
        did = new_id("dsc")
        now = now_ms()
        DB.execute(
            """
            INSERT INTO discounts (
                id, code, discount_type, discount_value, min_order_value, max_discount,
                valid_from, valid_until, usage_limit, used_count, per_user_limit, eligible_users, active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?)
            """,
            (
                did, data["code"].upper().strip(), data.get("discount_type", "fixed"),
                float(data["discount_value"]), float(data.get("min_order_value", 0.0)),
                float(data["max_discount"]) if data.get("max_discount") else None,
                data.get("valid_from", now), data.get("valid_until", now + 86400000 * 30),
                int(data.get("usage_limit", 1000)), int(data.get("per_user_limit", 1)),
                data.get("eligible_users", "all"), now,
            ),
        )
        return self.get_discount_by_code(data["code"])

    def record_discount_usage(self, discount_id: str, user_id: str, payment_id: Optional[str] = None):
        uid = new_id("du")
        now = now_ms()
        DB.execute(
            "INSERT INTO discount_usages (id, discount_id, user_id, payment_id, used_at) VALUES (?, ?, ?, ?, ?)",
            (uid, discount_id, user_id, payment_id, now),
        )
        DB.execute("UPDATE discounts SET used_count = used_count + 1 WHERE id = ?", (discount_id,))

    def get_discount_user_usage_count(self, discount_id: str, user_id: str) -> int:
        row = DB.fetchone(
            "SELECT COUNT(*) as cnt FROM discount_usages WHERE discount_id = ? AND user_id = ?",
            (discount_id, user_id),
        )
        return row["cnt"] if row else 0

    # --- user activities ---
    def log_activity(self, user_id: str, activity_type: str, description: str, metadata: Optional[Dict] = None):
        aid = new_id("act")
        now = now_ms()
        DB.execute(
            "INSERT INTO user_activities (id, user_id, activity_type, description, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (aid, user_id, activity_type, description, json.dumps(metadata or {}), now),
        )

    def get_activities(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        clean_uid = user_id.replace("ath-", "user-") if user_id.startswith("ath-") else user_id
        rows = DB.fetchall(
            """
            SELECT * FROM user_activities
            WHERE user_id = ? OR user_id = ?
            ORDER BY created_at DESC LIMIT ?
            """,
            (user_id, clean_uid, limit),
        )
        out = []
        for r in rows:
            a = dict(r)
            if isinstance(a.get("metadata"), str):
                try:
                    a["metadata"] = json.loads(a["metadata"])
                except Exception:
                    a["metadata"] = {}
            out.append(a)
        return out

    # --- legacy teams & events properties for backwards compat ---
    @property
    def teams(self) -> Dict[str, Dict]:
        rows = DB.fetchall("SELECT * FROM teams")
        res = {}
        for r in rows:
            d = dict(r)
            if isinstance(d.get("open_roles"), str):
                try:
                    d["open_roles"] = json.loads(d["open_roles"])
                except Exception:
                    d["open_roles"] = []
            res[d["id"]] = d
        return res

    @property
    def events(self) -> Dict[str, Dict]:
        rows = DB.fetchall("SELECT * FROM events")
        res = {}
        for r in rows:
            d = dict(r)
            participants = DB.fetchall("SELECT profile_id, status FROM event_participants WHERE event_id = ?", (d["id"],))
            d["participants"] = [dict(p) for p in participants]
            res[d["id"]] = d
        return res

    def add_participant(self, event_id: str, profile_id: str, status: str = "joined"):
        row = DB.fetchone("SELECT id FROM event_participants WHERE event_id = ? AND profile_id = ?", (event_id, profile_id))
        now = now_ms()
        if row:
            DB.execute("UPDATE event_participants SET status = ? WHERE id = ?", (status, row["id"]))
        else:
            epid = new_id("ep")
            DB.execute(
                "INSERT INTO event_participants (id, event_id, profile_id, status, joined_at) VALUES (?, ?, ?, ?, ?)",
                (epid, event_id, profile_id, status, now),
            )

    def remove_participant(self, event_id: str, profile_id: str):
        DB.execute("DELETE FROM event_participants WHERE event_id = ? AND profile_id = ?", (event_id, profile_id))

    def create_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        eid = new_id("evt")
        now = now_ms()
        DB.execute(
            """
            INSERT INTO events (id, host_id, sport_id, title, venue, city, neighborhood, lat, lng, starts_at, capacity, skill_level, price, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                eid, data.get("host_id"), data.get("sport_id", "football"), data.get("title", "Untitled Event"),
                data.get("venue", ""), data.get("city", "Hyderabad"), data.get("neighborhood", ""),
                float(data.get("lat", 17.4401)), float(data.get("lng", 78.3489)),
                data.get("starts_at", "Friday 8:30 PM"), int(data.get("capacity", 10)),
                data.get("skill_level", "all"), data.get("price", "Free"),
                data.get("description", ""), now,
            ),
        )
        if data.get("host_id"):
            self.add_participant(eid, data["host_id"], status="host")
        return self.events.get(eid)


STORE = Store()
