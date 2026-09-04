# SportSphere — AI-Powered Multi-Sport Athlete Discovery

A full-stack MVP that turns a directory of athletes into a **discovery engine**. Built as a
Python-port of the [PLAYSync](https://github.com/SathvikReddyMamindla/PLAYSync) architecture
(compatibility matchmaking, polymorphic multi-sport schema, hyperlocal discovery, connections &
match invites), with a **JWT auth layer** and a **Featherless AI layer** added.

> Frontend: Vite + React + Tailwind + framer-motion · Backend: Python (FastAPI)

---

## Highlights

- **AI onboarding** — type "I play badminton every weekend, intermediate, Kondapur" and the AI
  returns a structured, editable profile (sport, skill tier, role, availability, location, tags).
- **AI-ranked discovery** — a real compatibility engine scores every athlete (proximity, skill
  delta, role synergy, schedule overlap, trust), then the AI narrates a one-line *"why this
  match"* per result.
- **Cross-sport skill normalization** — cricket "intermediate", chess 1200, and a 25-min 5K all
  map to a comparable skill tier on a single unified athlete profile.
- **Auth** — email + password (bcrypt), JWT in an `httpOnly` cookie, plus a one-click **Demo mode**.
- **People connect + chat** — send/accept requests, then real-time messaging.
- **Events** — create / join / leave, roster & capacity.
- **Athlete map** — Leaflet + OpenStreetMap (no API key). Every athlete drops a pin with their
  sport emoji; click a pin to view a profile and connect. Toggle between the list and map on the
  Discover page, and **center on yourself** via browser geolocation.
- **Geolocation onboarding** — capture your browser location during profile creation so you show
  up as a pin.
- **Trust notes** and **AI performance summaries** (bonus).

**Graceful degradation:** if `FEATHERLESS_API_KEY` is not set or Featherless is unreachable, every
AI operation falls back to a deterministic heuristic so the demo never breaks on stage.

---

## Repo layout

```
sportsphere/
  client/          # React + Vite + Tailwind frontend
    src/pages/     # Landing, Onboarding, Discover, Connections, Chat, Events, Profile
    src/components/# hero + sections + app shell + modals
    src/data/      # sports / athletes / architecture / community (ported from PLAYSync)
  server/          # Python FastAPI backend
    app/
      main.py      # routes + auth + AI endpoints
      compat.py    # matchmaking engine (Python port of PLAYSync algorithm)
      ai.py        # Featherless client + heuristic fallbacks
      store.py     # in-memory data + seed data
```

---

## Run it

Two processes: backend (`:8000`) and frontend (`:5173`).

### 1. Backend (Python / FastAPI)

```bash
cd server
python3 -m venv .venv && source .venv/bin/activate   # optional
pip install -r requirements.txt
cp .env.example .env        # then paste your Featherless key into .env
./run.sh                    # or: uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend (React / Vite)

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:8000`, so the browser never talks to the
backend directly (and never sees the API key).

### Add your Featherless key

Open `server/.env` and set:

```
FEATHERLESS_API_KEY=sk-...
FEATHERLESS_MODEL=Qwen/Qwen2.5-7B-Instruct   # swap any instructed open model
```

Until the key is set, the app runs on heuristic fallbacks (the AI status flag shows this in the UI).

---

## API (base `/api/v1`)

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/demo`, `GET /auth/me` |
| AI | `POST /ai/parse-profile`, `POST /ai/match-explanation`, `POST /ai/trust-note`, `POST /ai/performance-summary`, `GET /ai/status` |
| Profiles | `GET /athletes`, `GET /athletes/:id`, `POST /athletes` |
| Discovery | `GET /discovery/players`, `GET /discovery/teams`, `GET /discovery/events` |
| Connections | `POST /connections/request`, `GET /connections/status/:id`, `POST /connections/respond`, `GET /connections` |
| Chat | `GET /chat/conversations`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations/:id/messages` |
| Events | `GET /events`, `POST /events`, `POST /events/:id/join`, `POST /events/:id/leave` |
| Sports | `GET /sports`, `GET /sports/:id/schema` |

---

## How the AI layer is wired

The **numeric ranking is always the deterministic compatibility engine** — the LLM is never
allowed to do the sort. It receives the precomputed scores and breakdowns and is asked only to
narrate/explain them in plain language. This keeps the demo fast, safe, and reproducible.

The Featherless client uses the OpenAI-compatible endpoint:

```
base_url = https://api.featherless.ai/v1
```

and is called **only on the server**, never from the browser. Every AI op goes through
`app/ai.py` with a `try/except` + heuristic fallback.

---

## The "Fuel & Pitch" design system

- Canvas: warm paper `#F5F1E8`
- Ink: near-black `#0F1417`
- Accent: electric volt lime `#B8E639`
- Secondary: deep green-teal `#123B33`
- CTA: warm ember `#FF6A3D`
- Fonts: Space Grotesk (display) + Inter (body)
- Motion: framer-motion springs, scroll reveals, animated sport marquee
