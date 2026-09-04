"""
Database migrations and seed loader for SportSphere.
Initializes SQLite schema and populates default athletes, tournaments, and discount campaigns.
"""
from __future__ import annotations
import json
import sqlite3
from typing import Any, Dict, List
import bcrypt

from .db import DB, get_connection, now_ms, new_id

MIGRATION_V1 = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    profile_id TEXT,
    is_admin INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS athlete_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    avatar TEXT,
    city TEXT DEFAULT 'Hyderabad',
    neighborhood TEXT DEFAULT '',
    lat REAL DEFAULT 17.4401,
    lng REAL DEFAULT 78.3489,
    primary_sport TEXT DEFAULT 'Football',
    skill_level TEXT DEFAULT 'intermediate',
    role TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    rating REAL DEFAULT 4.5,
    reliability_rate INTEGER DEFAULT 95,
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    preferred_match_type TEXT DEFAULT 'Casual & Competitive',
    playing_style TEXT DEFAULT '',
    availability TEXT DEFAULT '[]',
    sports TEXT DEFAULT '[]',
    goals TEXT DEFAULT '[]',
    achievements TEXT DEFAULT '[]',
    badges TEXT DEFAULT '[]',
    trust_score REAL,
    trust_note TEXT,
    discovery_enabled INTEGER DEFAULT 1,
    show_activity INTEGER DEFAULT 1,
    show_stats INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    sport_id TEXT DEFAULT 'football',
    type TEXT DEFAULT 'match_invite',
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    participant1_id TEXT NOT NULL,
    participant2_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    read_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    related_entity_id TEXT,
    action_url TEXT,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id TEXT PRIMARY KEY,
    email_notifications INTEGER DEFAULT 1,
    in_app_notifications INTEGER DEFAULT 1,
    tournament_alerts INTEGER DEFAULT 1,
    connection_alerts INTEGER DEFAULT 1,
    recommendation_alerts INTEGER DEFAULT 1,
    discount_alerts INTEGER DEFAULT 1,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sport_id TEXT NOT NULL,
    description TEXT DEFAULT '',
    venue TEXT NOT NULL,
    city TEXT DEFAULT 'Hyderabad',
    neighborhood TEXT DEFAULT '',
    lat REAL DEFAULT 17.4401,
    lng REAL DEFAULT 78.3489,
    banner_image TEXT DEFAULT '',
    format TEXT DEFAULT 'Knockout',
    skill_level TEXT DEFAULT 'all',
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    registration_deadline TEXT NOT NULL,
    max_participants INTEGER DEFAULT 16,
    current_participants INTEGER DEFAULT 0,
    entry_fee REAL DEFAULT 0,
    convenience_fee REAL DEFAULT 20,
    tax_rate REAL DEFAULT 0.18,
    status TEXT DEFAULT 'open',
    rules TEXT DEFAULT '[]',
    prizes TEXT DEFAULT '[]',
    organizer_name TEXT DEFAULT 'SportSphere Official',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    payment_id TEXT,
    status TEXT DEFAULT 'confirmed',
    team_name TEXT DEFAULT '',
    registered_at INTEGER NOT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tournament_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    payment_id TEXT,
    signature TEXT,
    tournament_fee REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    discount_code TEXT,
    convenience_fee REAL DEFAULT 20,
    tax_amount REAL DEFAULT 4,
    total_amount REAL NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending',
    gateway TEXT DEFAULT 'razorpay',
    refund_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

CREATE TABLE IF NOT EXISTS discounts (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT DEFAULT 'fixed',
    discount_value REAL NOT NULL,
    min_order_value REAL DEFAULT 0,
    max_discount REAL,
    valid_from INTEGER,
    valid_until INTEGER,
    usage_limit INTEGER DEFAULT 1000,
    used_count INTEGER DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    eligible_users TEXT DEFAULT 'all',
    active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS discount_usages (
    id TEXT PRIMARY KEY,
    discount_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    payment_id TEXT,
    used_at INTEGER NOT NULL,
    FOREIGN KEY (discount_id) REFERENCES discounts(id)
);

CREATE TABLE IF NOT EXISTS user_activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_users (
    id TEXT PRIMARY KEY,
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reported_users (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    reported_id TEXT NOT NULL,
    target_type TEXT DEFAULT 'user',
    target_id TEXT,
    reason TEXT NOT NULL,
    details TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    host_id TEXT,
    sport_id TEXT NOT NULL,
    title TEXT NOT NULL,
    venue TEXT DEFAULT '',
    city TEXT DEFAULT 'Hyderabad',
    neighborhood TEXT DEFAULT '',
    lat REAL DEFAULT 17.4401,
    lng REAL DEFAULT 78.3489,
    starts_at TEXT DEFAULT 'Friday 8:30 PM',
    capacity INTEGER DEFAULT 10,
    skill_level TEXT DEFAULT 'all',
    price TEXT DEFAULT 'Free',
    description TEXT DEFAULT '',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS event_participants (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    status TEXT DEFAULT 'joined',
    joined_at INTEGER NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sport_id TEXT NOT NULL,
    city TEXT DEFAULT 'Hyderabad',
    neighborhood TEXT DEFAULT '',
    lat REAL DEFAULT 17.4401,
    lng REAL DEFAULT 78.3489,
    open_roles TEXT DEFAULT '[]',
    skill_level TEXT DEFAULT 'intermediate',
    schedule TEXT DEFAULT '',
    roster_count INTEGER DEFAULT 0,
    target_roster INTEGER DEFAULT 10,
    created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_conn_participants ON connections(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_blocked ON blocked_users(blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_tourn_reg ON tournament_registrations(tournament_id, user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
"""


def _hash_pwd(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def run_migrations():
    """Applies schema and seed data."""
    conn = get_connection()
    try:
        with conn:
            conn.executescript(MIGRATION_V1)
            # Check version
            cur = conn.execute("SELECT version FROM schema_migrations WHERE version = 1")
            if not cur.fetchone():
                conn.execute("INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)", (now_ms(),))
                _seed_initial_data(conn)
    finally:
        conn.close()


def _seed_initial_data(conn: sqlite3.Connection):
    from .store import _seed_profiles, _seed_teams, _seed_events

    now = now_ms()
    demo_pwd = _hash_pwd("demo1234")
    admin_pwd = _hash_pwd("admin1234")

    # Seed Admin & Demo users
    conn.execute(
        """
        INSERT OR IGNORE INTO users (id, email, password_hash, display_name, profile_id, is_admin, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        ("user-admin", "admin@sportsphere.dev", admin_pwd, "Admin Coordinator", "ath-admin", 1, now),
    )
    conn.execute(
        """
        INSERT OR IGNORE INTO users (id, email, password_hash, display_name, profile_id, is_admin, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        ("user-demo", "demo@sportsphere.dev", demo_pwd, "Demo Player", "ath-current-user", 0, now),
    )

    # Seed Demo Profile
    conn.execute(
        """
        INSERT OR IGNORE INTO athlete_profiles (
            id, user_id, name, handle, avatar, city, neighborhood, lat, lng,
            primary_sport, skill_level, role, bio, rating, reliability_rate, matches_played,
            wins, losses, preferred_match_type, playing_style, availability, sports, goals, achievements, badges,
            trust_score, trust_note, discovery_enabled, show_activity, show_stats, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "ath-current-user",
            "user-demo",
            "Demo Player",
            "@demo_player",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
            "Hyderabad",
            "Kondapur",
            17.4615,
            78.3614,
            "Football",
            "intermediate",
            "Central Midfielder",
            "Passionate footballer & runner exploring tournaments and matches across Hyderabad.",
            4.8,
            98,
            42,
            28,
            14,
            "7v7 Turf & 5v5 Friendly",
            "Playmaker, high work rate",
            json.dumps(["weekday_evening", "weekend_morning"]),
            json.dumps([
                {"sport": "football", "skill_level": "intermediate", "role": "Central Midfielder"},
                {"sport": "badminton", "skill_level": "intermediate", "role": "Singles Specialist"},
                {"sport": "athletics", "skill_level": "intermediate", "role": "10K Runner"},
            ]),
            json.dumps(["Compete in Hyderabad 7v7 League", "Break 50-minute 10K mark"]),
            json.dumps(["Runners Up - Hitec City Cup 2025", "AstroPark Summer League MVP"]),
            json.dumps(["Verified Athlete", "Fair Play Champion", "Top Sparring Partner"]),
            4.9,
            "High reliability and verified match history.",
            1,
            1,
            1,
            now,
            now,
        ),
    )

    # Seed default athletes
    for p in _seed_profiles():
        conn.execute(
            """
            INSERT OR IGNORE INTO athlete_profiles (
                id, user_id, name, handle, avatar, city, neighborhood, lat, lng,
                primary_sport, skill_level, role, bio, rating, reliability_rate, matches_played,
                wins, losses, preferred_match_type, playing_style, availability, sports, goals, achievements, badges,
                trust_score, trust_note, discovery_enabled, show_activity, show_stats, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                p["id"],
                f"user-{p['id']}",
                p["name"],
                p.get("handle", "@athlete"),
                p.get("avatar"),
                p.get("city", "Hyderabad"),
                p.get("neighborhood", ""),
                p.get("lat", 17.4401),
                p.get("lng", 78.3489),
                p.get("primary_sport", "Football"),
                p.get("skill_level", "intermediate"),
                p.get("role", ""),
                p.get("bio", ""),
                p.get("rating", 4.5),
                p.get("reliability_rate", 95),
                p.get("matches_played", 20),
                int(p.get("matches_played", 20) * 0.65),
                int(p.get("matches_played", 20) * 0.35),
                "Competitive Tournament & Sparring",
                "Dynamic & adaptive",
                json.dumps(p.get("availability", [])),
                json.dumps(p.get("sports", [])),
                json.dumps(["Win regional trophy", "Maintain 98%+ reliability"]),
                json.dumps(["City Championship Finalist 2025", "Community Sparring Leader"]),
                json.dumps(["MVP", "Reliable Partner", "Verified"]),
                p.get("rating", 4.5),
                "Consistently verified attendee with high peer reviews.",
                1,
                1,
                1,
                now,
                now,
            ),
        )

    # Seed Teams
    for t in _seed_teams():
        conn.execute(
            """
            INSERT OR IGNORE INTO teams (
                id, name, sport_id, city, neighborhood, lat, lng, open_roles,
                skill_level, schedule, roster_count, target_roster, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                t["id"],
                t["name"],
                t["sport_id"],
                t.get("city", "Hyderabad"),
                t.get("neighborhood", ""),
                t.get("lat", 17.4401),
                t.get("lng", 78.3489),
                json.dumps(t.get("open_roles", [])),
                t.get("skill_level", "intermediate"),
                t.get("schedule", ""),
                t.get("roster_count", 5),
                t.get("target_roster", 10),
                now,
            ),
        )

    # Seed Events
    for e in _seed_events():
        conn.execute(
            """
            INSERT OR IGNORE INTO events (
                id, host_id, sport_id, title, venue, city, neighborhood,
                lat, lng, starts_at, capacity, skill_level, price, description, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                e["id"],
                "ath-1",
                e["sport_id"],
                e["title"],
                e.get("venue", ""),
                e.get("city", "Hyderabad"),
                e.get("neighborhood", ""),
                e.get("lat", 17.4401),
                e.get("lng", 78.3489),
                e.get("starts_at", "Saturday 6:00 PM"),
                e.get("capacity", 10),
                e.get("skill_level", "all"),
                e.get("price", "Free"),
                e.get("description", ""),
                now,
            ),
        )
        conn.execute(
            "INSERT OR IGNORE INTO event_participants (id, event_id, profile_id, status, joined_at) VALUES (?, ?, ?, ?, ?)",
            (f"ep-{e['id']}-1", e["id"], "ath-1", "host", now),
        )

    # Seed Tournaments
    tournaments = [
        {
            "id": "tourn-1",
            "title": "Hyderabad Super League 7v7 Football Trophy",
            "sport_id": "football",
            "description": "High-octane 7v7 championship on premier 4G turf under stadium floodlights. Knockout tournament with certified referees, stats tracking, and live streaming.",
            "venue": "AstroPark Arena, Madhapur",
            "city": "Hyderabad",
            "neighborhood": "Madhapur",
            "lat": 17.4483,
            "lng": 78.3915,
            "banner_image": "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
            "format": "7v7 Knockout (16 Teams)",
            "skill_level": "intermediate",
            "starts_at": "Next Saturday, 5:00 PM",
            "ends_at": "Next Sunday, 10:00 PM",
            "registration_deadline": "Friday, 11:59 PM",
            "max_participants": 16,
            "current_participants": 11,
            "entry_fee": 450.0,
            "convenience_fee": 20.0,
            "tax_rate": 0.18,
            "status": "open",
            "rules": [
                "Official FIFA 7v7 turf rules with rolling substitutions.",
                "Shinguards mandatory. Studs/turf shoes only (no metal studs).",
                "25-minute halves with a 5-minute halftime break.",
            ],
            "prizes": [
                "1st Place: ₹25,000 Cash + Championship Trophy",
                "2nd Place: ₹10,000 Cash + Silver Medals",
                "Golden Boot & Golden Glove awards",
            ],
            "organizer_name": "Telangana Football League",
        },
        {
            "id": "tourn-2",
            "title": "SmashMasters Badminton Open Trophy 2026",
            "sport_id": "badminton",
            "description": "Open singles and doubles badminton ladder tournament on BWF-standard synthetic courts. Precision Yonex AS-30 feathered shuttlecocks provided.",
            "venue": "SportsArena, Kondapur",
            "city": "Hyderabad",
            "neighborhood": "Kondapur",
            "lat": 17.4615,
            "lng": 78.3614,
            "banner_image": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80",
            "format": "Singles & Doubles Round Robin",
            "skill_level": "all",
            "starts_at": "Sunday, 9:00 AM",
            "ends_at": "Sunday, 6:00 PM",
            "registration_deadline": "Saturday, 8:00 PM",
            "max_participants": 32,
            "current_participants": 24,
            "entry_fee": 350.0,
            "convenience_fee": 20.0,
            "tax_rate": 0.18,
            "status": "closing_soon",
            "rules": [
                "Standard BWF 21-point rally scoring system (best of 3 sets).",
                "Non-marking indoor badminton shoes mandatory.",
                "Certified umpires and line judges for quarterfinals and above.",
            ],
            "prizes": [
                "1st Place: ₹15,000 + Yonex Pro Racket Kit",
                "2nd Place: ₹7,500 + Kitbag",
            ],
            "organizer_name": "SmashZone Hyderabad",
        },
        {
            "id": "tourn-3",
            "title": "Deccan Box Cricket Championship",
            "sport_id": "cricket",
            "description": "Fast-paced, high-voltage box cricket tournament with leather ball bowling machine nets and turf arena. Guaranteed 3 group matches per registered squad.",
            "venue": "Gymkhana Turf 2, Gachibowli",
            "city": "Hyderabad",
            "neighborhood": "Gachibowli",
            "lat": 17.4401,
            "lng": 78.3489,
            "banner_image": "https://images.unsplash.com/photo-1531415074868-036b1c57e329?auto=format&fit=crop&w=800&q=80",
            "format": "8-a-side Box League (12 Squads)",
            "skill_level": "intermediate",
            "starts_at": "Upcoming Friday, 7:00 PM",
            "ends_at": "Upcoming Saturday, 11:00 PM",
            "registration_deadline": "Thursday, 6:00 PM",
            "max_participants": 12,
            "current_participants": 8,
            "entry_fee": 600.0,
            "convenience_fee": 20.0,
            "tax_rate": 0.18,
            "status": "open",
            "rules": [
                "8 overs per innings, maximum 2 overs per bowler.",
                "Direct hit to top netting = 6 runs; wall bounds = running between wickets.",
            ],
            "prizes": [
                "1st Place: ₹30,000 + Champions Cup",
                "Player of the Tournament: Custom English Willow Bat",
            ],
            "organizer_name": "Deccan Sports Club",
        },
        {
            "id": "tourn-4",
            "title": "Telangana Rapid Chess Open",
            "sport_id": "chess",
            "description": "FIDE-rated Swiss system 6-round rapid tournament. DGT electronic boards for top boards with live PGN broadcasting and digital rating calibration.",
            "venue": "MindSports Arena, Gachibowli",
            "city": "Hyderabad",
            "neighborhood": "Gachibowli",
            "lat": 17.4401,
            "lng": 78.3489,
            "banner_image": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80",
            "format": "6-Round Swiss (15m + 10s increment)",
            "skill_level": "all",
            "starts_at": "Sunday, 10:00 AM",
            "ends_at": "Sunday, 5:30 PM",
            "registration_deadline": "Saturday, 10:00 PM",
            "max_participants": 64,
            "current_participants": 42,
            "entry_fee": 250.0,
            "convenience_fee": 20.0,
            "tax_rate": 0.18,
            "status": "open",
            "rules": [
                "FIDE Rapid Chess rules apply; default time is 15 minutes.",
                "Buchholz tie-break system in effect.",
            ],
            "prizes": [
                "Top Board: ₹20,000 Cash + Master Trophy",
                "Top Unrated & Junior Category Medals",
            ],
            "organizer_name": "Telangana Chess Academy",
        },
        {
            "id": "tourn-5",
            "title": "Cyberabad 10K & 5K Timed Trail Run",
            "sport_id": "athletics",
            "description": "Certified chip-timed endurance road and forest trail run around Hyderabad Botanical Gardens. Pacer buses, hydration checkpoints, and finisher medals.",
            "venue": "Botanical Garden Trail, Gachibowli",
            "city": "Hyderabad",
            "neighborhood": "Gachibowli",
            "lat": 17.4143,
            "lng": 78.3392,
            "banner_image": "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=800&q=80",
            "format": "10K & 5K Timed Run",
            "skill_level": "all",
            "starts_at": "Sunday, 5:30 AM",
            "ends_at": "Sunday, 9:00 AM",
            "registration_deadline": "Friday, 6:00 PM",
            "max_participants": 200,
            "current_participants": 145,
            "entry_fee": 300.0,
            "convenience_fee": 20.0,
            "tax_rate": 0.18,
            "status": "open",
            "rules": [
                "RFID timing chip bib must be worn on the chest at all times.",
                "Cut-off time: 90 minutes for 10K; 50 minutes for 5K.",
            ],
            "prizes": [
                "Podium Cash Prizes for Men & Women (1st: ₹10,000, 2nd: ₹5,000)",
                "Custom Dri-FIT T-shirt + Finisher Medal + Hot Breakfast",
            ],
            "organizer_name": "Hyderabad Runners Society",
        },
    ]

    for trn in tournaments:
        conn.execute(
            """
            INSERT OR IGNORE INTO tournaments (
                id, title, sport_id, description, venue, city, neighborhood,
                lat, lng, banner_image, format, skill_level, starts_at, ends_at,
                registration_deadline, max_participants, current_participants,
                entry_fee, convenience_fee, tax_rate, status, rules, prizes, organizer_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                trn["id"],
                trn["title"],
                trn["sport_id"],
                trn["description"],
                trn["venue"],
                trn["city"],
                trn["neighborhood"],
                trn["lat"],
                trn["lng"],
                trn["banner_image"],
                trn["format"],
                trn["skill_level"],
                trn["starts_at"],
                trn["ends_at"],
                trn["registration_deadline"],
                trn["max_participants"],
                trn["current_participants"],
                trn["entry_fee"],
                trn["convenience_fee"],
                trn["tax_rate"],
                trn["status"],
                json.dumps(trn["rules"]),
                json.dumps(trn["prizes"]),
                trn["organizer_name"],
                now,
            ),
        )

    # Seed Discounts
    discounts = [
        {
            "id": "dsc-welcome",
            "code": "WELCOME50",
            "discount_type": "fixed",
            "discount_value": 50.0,
            "min_order_value": 200.0,
            "max_discount": 50.0,
            "valid_from": now - 86400000,
            "valid_until": now + 86400000 * 90,
            "usage_limit": 5000,
            "used_count": 18,
            "per_user_limit": 1,
            "active": 1,
        },
        {
            "id": "dsc-anniversary",
            "code": "PLAYSYNC1YR",
            "discount_type": "percentage",
            "discount_value": 20.0,  # 20%
            "min_order_value": 250.0,
            "max_discount": 150.0,
            "valid_from": now - 86400000,
            "valid_until": now + 86400000 * 60,
            "usage_limit": 1000,
            "used_count": 42,
            "per_user_limit": 2,
            "active": 1,
        },
        {
            "id": "dsc-bday",
            "code": "BDAY2026",
            "discount_type": "fixed",
            "discount_value": 100.0,
            "min_order_value": 300.0,
            "max_discount": 100.0,
            "valid_from": now - 86400000,
            "valid_until": now + 86400000 * 365,
            "usage_limit": 500,
            "used_count": 5,
            "per_user_limit": 1,
            "active": 1,
        },
        {
            "id": "dsc-fest",
            "code": "FESTIVAL50",
            "discount_type": "fixed",
            "discount_value": 50.0,
            "min_order_value": 200.0,
            "max_discount": 50.0,
            "valid_from": now - 86400000,
            "valid_until": now + 86400000 * 30,
            "usage_limit": 2000,
            "used_count": 12,
            "per_user_limit": 1,
            "active": 1,
        },
        {
            "id": "dsc-smash",
            "code": "SMASH100",
            "discount_type": "fixed",
            "discount_value": 100.0,
            "min_order_value": 300.0,
            "max_discount": 100.0,
            "valid_from": now - 86400000,
            "valid_until": now + 86400000 * 45,
            "usage_limit": 300,
            "used_count": 9,
            "per_user_limit": 1,
            "active": 1,
        },
    ]

    for d in discounts:
        conn.execute(
            """
            INSERT OR IGNORE INTO discounts (
                id, code, discount_type, discount_value, min_order_value, max_discount,
                valid_from, valid_until, usage_limit, used_count, per_user_limit, active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                d["id"],
                d["code"],
                d["discount_type"],
                d["discount_value"],
                d["min_order_value"],
                d["max_discount"],
                d["valid_from"],
                d["valid_until"],
                d["usage_limit"],
                d["used_count"],
                d["per_user_limit"],
                d["active"],
                now,
            ),
        )

    # Seed initial notifications for demo user
    initial_notifs = [
        ("notif-1", "user-demo", "tournaments", "🏆 New Tournament Announced", "Registration is now open for Hyderabad Super League 7v7 Football Trophy.", "tourn-1", "/app/tournaments", now - 3600000 * 2),
        ("notif-2", "user-demo", "discounts", "🎉 Welcome Gift Inside", "Use code WELCOME50 at checkout for ₹50 off your first tournament registration!", "dsc-welcome", "/app/tournaments", now - 3600000 * 5),
        ("notif-3", "user-demo", "recommendations", "⚡ New Match Recommendation", "Vikram Kumar (@vikram_striker) matches your football playstyle and is 3.2 km away.", "ath-2", "/app/discover", now - 3600000 * 12),
    ]
    for n in initial_notifs:
        conn.execute(
            """
            INSERT OR IGNORE INTO notifications (id, user_id, category, title, message, is_read, related_entity_id, action_url, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
            """,
            n,
        )

    # Seed initial activities
    activities = [
        ("act-1", "user-demo", "profile_updated", "Updated primary sport to Football and preferred positions.", now - 3600000 * 24),
        ("act-2", "user-demo", "sparring_scheduled", "Scheduled a 7v7 turf session at AstroPark Arena.", now - 3600000 * 18),
        ("act-3", "user-demo", "badge_earned", "Earned the 'Verified Athlete' trust badge.", now - 3600000 * 8),
    ]
    for a in activities:
        conn.execute(
            "INSERT OR IGNORE INTO user_activities (id, user_id, activity_type, description, metadata, created_at) VALUES (?, ?, ?, ?, '{}', ?)",
            a,
        )

    # Notification preferences
    conn.execute(
        """
        INSERT OR IGNORE INTO notification_preferences (user_id, email_notifications, in_app_notifications, tournament_alerts, connection_alerts, recommendation_alerts, discount_alerts, updated_at)
        VALUES ('user-demo', 1, 1, 1, 1, 1, 1, ?)
        """,
        (now,),
    )
