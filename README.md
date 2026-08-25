# The Venture Orbital

Venture intelligence workspace — a React dashboard that runs ventures through a
five-stage pipeline (RECEIVED → PENDING → PROCESSED → REVIEWING → PUBLISHED) and scores
them. A client submits an intake; an administrator processes it, reviews the AI
assessment, and decides the mark that publishes.

**This project is not hosted anywhere.** Everyone runs it locally; git is the
only distribution channel. Clone the repo and follow the steps below.

## Requirements

- Node.js 22 (see `.nvmrc`)
- Python 3.11+ — required for the backend
- PostgreSQL — optional; without it the backend uses a local SQLite file

## Run the frontend

```bash
npm install
npm run dev      # http://localhost:5173  (--host, so phones on the same Wi-Fi can reach it)
```

That is enough to use the whole UI. **The backend is optional.** With no API
reachable the dashboard reports `offline` and falls back to a built-in
simulation — every screen works, but scores are generated locally rather than
computed.

Other scripts:

```bash
npm run build    # production build to dist/
npm run preview  # serve the built bundle
npm run lint     # oxlint
```

There is no test framework in this repo. Flows are verified with scratch `.mjs`
scripts that sign in and drive the real API end to end.

## Run the backend

One backend: FastAPI in `server_python/`. It holds the ten calculators, the
gated state machine, authentication, document upload, queries, the Indian
Brand Equity assessment and the AI report assessor.

### FastAPI backend — `server_python/`

```bash
cd server_python
pip install -r requirements.txt
uvicorn main:app --reload --port 8000   # http://localhost:8000/api
```

Copy `server_python/.env.example` to `server_python/.env` and fill it in.
Postgres is used when `DATABASE_URL` is set; otherwise it falls back to a
local SQLite file, so it runs with no setup.

Sign in with `admin@consciousorbit.com` / `admin123` (admin) or
`founder@venture.io` / `password123` (client) — seeded on first boot.
**Change these before deploying anywhere.**

Every integration degrades rather than failing: without `GEMINI_API_KEY` the
AI returns a deterministic assessment, without SMTP the approved-report email
is logged instead of sent, and without SpyFu credentials competitor data is
clearly-labelled placeholder. The backend prints which are live at boot.

### Pointing the frontend at a backend

`src/api.js` defaults to `http://localhost:8000/api`. To override, copy
`.env.example` to `.env.local` and set `VITE_API_URL`. Vite inlines this at build time, so changing it means
restarting `npm run dev`.

## Sharing your work

Push to `main` on GitHub — that is how everyone else gets it. Pull before you
start, since several people commit to this repo daily.
