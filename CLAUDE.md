# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

Two things in one repo:

- repo root — the Vite/React frontend (`src/`)
- `server_python/` — FastAPI + SQLAlchemy on Postgres (SQLite fallback). The
  only backend. It holds the ten calculator modules, the state machine, auth,
  documents, queries, brand equity, the AI assessor and the .docx report
  generator.

An Express/Mongo backend that used to live in `server/` was **deleted in
2026-08** and no trace of it remains in the tree. Do not resurrect it —
keeping two backends in step is what caused the divergence that got it
deleted. (Comments and docstrings still say "port of server/src/…"; they are
historical attribution, not live references.)

## Commands

```bash
# frontend (repo root)
npm install
npm run dev      # Vite dev server with HMR + --host, :5173
npm run build    # production build to dist/
npm run preview  # serve the built bundle
npm run lint     # oxlint

# FastAPI backend
cd server_python && pip install -r requirements.txt
uvicorn main:app --reload --port 8000   # http://localhost:8000/api
```

Copy `server_python/.env.example` to `server_python/.env` — it documents every
variable (DATABASE_URL, CORS_ORIGIN, AUTH_SECRET, GEMINI_API_KEY, SMTP_*,
SPYFU_*). Without Postgres it falls back to a local SQLite file. The root
`.env.example` holds `VITE_API_URL` for the frontend (default
`http://localhost:8000/api` in `src/api.js`; the comment in that file still
mentions the deleted Express server on :4000 — ignore it). Vite inlines env
vars at build time, so changing one requires restarting the dev server.

There is **no test framework anywhere in this repo** — no runner, no test
files, no test script. To exercise a calculator directly, import it in Python
and call `run(input, context)` — every module is a pure function. Drive flows
end to end with a scratch `.mjs` script that imports `src/api.js`, signs in via
`/api/auth/login` and exercises the real endpoints — that is how every change
here has been verified.

## Backend architecture

- **Ten calculator modules** in `server_python/modules/`, each with
  key/title/action, a pydantic input schema and a pure `run(input, context)`
  returning `{ output, score }`. Registry: `modules/__init__.py`.
- **State machine** in `state.py`: `RECEIVED → PENDING → PROCESSED → REVIEWING
  → PUBLISHED`, paired with actions `SCRUMING / REQUIREMENT / MAPPING /
  ADMIN_REVIEW / DELIVERED`. Advancing is **gated** — a 409 lists the missing
  module keys. `PIPELINE_STAGES` maps each status to its gating modules.
- **The workflow is client-submits, admin-decides.** A client's intake is
  stored at `RECEIVED` with `intake_data`; the admin runs the modules
  (`processReport` in `src/api.js`), reads the AI recommendation, then submits
  a review (`routers/review.py`, `POST /reports/{id}/review`) which writes the
  admin's mark/verdict, publishes the report, and emails the client a real
  `.docx` (python-docx, `integrations/email.py#build_report_docx`; also
  downloadable at `GET /api/reports/{id}/report.docx`). The AI never publishes
  and never writes `score`/`decision`.
- **Integrations degrade, never throw**: no `GEMINI_API_KEY` → deterministic
  heuristic; no SMTP → email logged not sent; no SpyFu → labelled placeholder.
  Keep that property, and check the boot log — it prints which are live.
- `scoring.py#js_round` exists because Python's banker's rounding differs from
  JS `Math.round` — use it, not `round()`, in module math.
- SQLAlchemy JSON columns are not mutation-tracked: **reassign, never mutate
  in place** (see `_mark_module_complete` in `main.py`).
- Schema changes need a migration for existing databases — `create_all()` only
  creates missing *tables*, never adds columns to an existing one.

## Frontend

React 19 + Vite 8, JavaScript only (`.jsx`, no TypeScript). Tailwind CSS v4 via the `@tailwindcss/vite` plugin — there is **no `tailwind.config.js`**; Tailwind is pulled in with `@import "tailwindcss"` at the top of `src/index.css` and all customization lives in that file as plain CSS. Default breakpoints only, so **there is no `xs:`** — writing one silently yields a permanently-hidden element. `framer-motion` for animation, `lenis` for smooth scrolling, `lucide-react` for icons, `ogl` for the WebGL shader background. Lint config is `.oxlintrc.json` (oxlint with the `react` and `oxc` plugins; only `react/rules-of-hooks` and `react/only-export-components` are configured).

The UI came from `github.com/Nehal-1826/Conscious-orbit` (imported wholesale in
2026-08), then was wired to the backend through `src/api.js`. **Talk to the API
by importing from `src/api.js`, never by writing new fetch code** — it owns the
token, the error envelope, and the UI↔API value mappings.

### Routing and auth

No router. A single `page` string in `App.jsx` (~160 lines, just the shell)
switches `'home' | 'contact' | 'login' | 'admin-dashboard' | 'dashboard'` via
early `return`s wrapped in `AnimatePresence`. The page and signed-in email are
persisted to localStorage from the wrapped setters — **never from `useEffect`**
(strict-mode double-mount would clobber the stored value; the comment in
App.jsx explains this).

**Authentication is real** (see backend section below): `Login.jsx` calls
`POST /auth/login` with a `portal` of `'client'` or `'admin'`; the token lives
in localStorage. On restoring a dashboard page, `App.jsx` revalidates the
session against `/auth/me` — a 401 drops to the login screen, but a network
failure does not (the offline fallback must keep working). Any mid-session 401
fires `onUnauthorized` subscribers and returns the user to login.

### Dashboard structure

The two dashboards are **self-contained monoliths** that own all their state:

- `src/components/ExecutiveDashboard.jsx` (~2100 lines) — the client portal:
  projects, intake, query desk, intelligence modules, tracking. Its sections
  come from the `NAV_SECTIONS` array — add an entry there and the tab row
  picks it up.
- `src/components/AdminDashboard.jsx` (~2000 lines) — the admin console: the
  ten modules, client profiles, project registrations, report tracking
  (process → AI assessment → review/approve), tickets.

Both health-check the API on mount and fall back to a seed-data simulation
when no backend answers, so the app stays usable offline. Most seed constants
(`INITIAL_MY_PROJECTS`, `INITIAL_REPORTS`, …) are now empty arrays; real data
comes from the API. Client profiles, project registrations and tickets remain
simulations — no endpoints exist for them.

### Frontend files

- `src/components/ui.jsx` — design-system primitives (`GlassPanel`, `RoyalButton`, `Field`/`Input`/`Select`, `StatusBadge`, `StatusDot`, `OrbitBrand`…). Compose these rather than re-inventing panel/button markup. Note `src/components/ui/` (lowercase dir) is a *different thing* — shadcn-style pieces (`badge`, `card-carousel`, `hero-parallax`, `sticky-scroll-reveal`) using `class-variance-authority` and `swiper`.
- `src/components/Homepage.jsx`, `Contact.jsx` — public pages (`PulpSenseHero.jsx` is rendered by Homepage — not dead).
- `src/components/IntakeEngine.jsx` — the three-layer intake form (capture → cluster → tracks) that feeds `submitIntake`.
- `src/components/ReportOverview.jsx` — on-site preview of a generated report with the two download paths: `reportDoc.js` (client-side Word-HTML `.doc`) and `downloadReportDocx` (server-rendered real `.docx`).
- `src/components/VerticalEngines.jsx` — the three per-vertical calculators; the TAM/SAM/SOM derivation is the only real logic on the frontend.
- `src/components/DarkVeil.jsx` / `LiquidEther.jsx` — OGL/WebGL background shaders (heavy; DarkVeil releases the GL context on unmount).
- `src/api.js` — the whole integration layer; see next section.

### Styling conventions

Colors are written as **literal Tailwind arbitrary values** in JSX (`text-[#D4AF37]`, `border-[rgba(212,175,55,0.18)]`), not theme tokens — the CSS custom properties in `index.css` `:root` are largely unused by components. Match the surrounding literal-hex style; a palette change means a find-and-replace across `src/`.

Palette: `#050505` background, `#0E0E0E`/`#111111` surfaces, `#D4AF37` primary gold, `#F4D67A` light gold, `#CFCFCF`/`#9A9A9A` secondary/muted text. Class names still say "red" from an earlier theme (`.btn-royal-red`, `bg-royal-mesh`) but render gold.

Reusable non-utility styles live in `src/index.css`: `.card-royal-luxury` (used by `GlassPanel`), `.btn-royal-red`, `.field-luxury-gold`, `.flip-card*`, `.scroll-velocity-*`, `.domain-scroller`. Touch-specific behaviour is handled there too — under `@media (hover: none)` the flip cards collapse to a single face (their back-face content is otherwise unreachable by finger) and `.hover-reveal` forces `opacity: 1` for controls that would only appear on `group-hover`.

`src/index.css` also carries global responsive guarantees: `overflow-x: hidden`
on `html`/`body` so one wide element can't make the page scroll sideways, plus
`min-height: 40px` on controls and `font-size: 16px` on inputs under
`(pointer: coarse)` — the latter stops iOS zooming on focus. Wide content
should scroll inside its own `.scroll-x` container; tab strips use
`.no-scrollbar`. Tables get a real `<table>` above `sm:` and stacked cards
below it rather than a horizontally-scrolling table on a phone.

## Frontend ↔ backend

The five report statuses are shared verbatim across `src/constants.js`
(`REPORT_STATUSES`, `KANBAN_COLUMNS`), `ui.jsx` (`STATUS_STYLES`,
`StatusDot`/`StatusBadge`) and `server_python/state.py`. Changing or adding a
status means updating all of them.

`src/api.js` holds the whole integration: endpoint wrappers,
`buildModuleInputs()` (which derives all ten module payloads from the intake
form), `submitIntake()` (client side: creates the report with `intakeData` and
stops — the report sits at `RECEIVED` for the admin) and `processReport()`
(admin side: runs each stage's gating modules from the stored `intakeData` and
advances RECEIVED → PENDING → PROCESSED → REVIEWING, deliberately stopping
before publish; `industryReport` is not run — the admin's mark replaces it).
`PROCESSING_STAGES` in `api.js` mirrors `state.py#PIPELINE_STAGES` — keep them
in sync.

**Three mappings exist because the API is stricter than the UI**, and all three were found by hitting real validation errors:
- custom domains (`domain_<ts>`) fall back to the `startups` vertical (`vertical` is a five-value enum)
- the six intake business models collapse onto the four `BUSINESS_MODELS` accepts
- `Scaleup` is not in the `Client` model's `STAGES` enum and maps to `Growth`

The intake form does not collect TAM, competitor prices, or feasibility ratings, so `buildModuleInputs()` supplies documented defaults for those. Scores are therefore partly driven by placeholders, not purely by user input.

The error envelope is flat — `{ error, message, issues? }` — not nested; `issues` carries pydantic field paths.

## Deployment

**There is none — this is deliberate.** The project is distributed through git
and run locally by each team member; `README.md` is the setup guide. The
`netlify.toml` and `public/_redirects` at the root are a leftover SPA-redirect
config for a frontend-only static deploy — nothing uses them; don't build on
them or add a hosting step without being asked.

## Known dead weight

`docs/superpowers/` contains a plan and spec for a *third* backend
(TypeScript + Prisma + Postgres) that was never built and contradicts the real
one — treat it as historical, not as direction.

## Client-facing features beyond the report pipeline

Added in 2026-08 alongside the pipeline, all additive — none of them touch
report state, the admin Report Tracking section or the review/approve flow:

- **AI provider is Gemini**, not Claude. `integrations/gemini.py` speaks the
  REST API directly (no SDK dependency) and translates JSON Schema into
  Gemini's stricter dialect — it rejects `additionalProperties` and only
  allows enums on strings, so `_to_gemini_schema()` exists to convert.
  `generate_json` returns `None` on *any* failure (missing `GEMINI_API_KEY`,
  network error, safety block, unparseable output) and every caller falls back
  to its deterministic heuristic. Env: `GEMINI_API_KEY`, `GEMINI_MODEL`
  (default `gemini-3.6-flash`, the latest GA model). Gemini 3 moved structured
  output to `generationConfig.responseFormat.text` and warns against lowering
  `temperature`, so the client detects the generation from the model name,
  picks the right shape, leaves temperature alone on 3.x, and retries once
  with the other shape if a request fails. Three consumers:
  `integrations/ai_provider.py` (module 7's PROCEED/PIVOT decision engine),
  `integrations/orbita.py` (per-module score audit, `routers/orbita.py`) and
  `integrations/report_ai.py` (the assessment below).
- **Documents** — `routers/documents.py`, `DocumentUpload.jsx`. Bytes go to
  `server_python/uploads/` under a UUID name; only metadata is in the database.
  Extension allow-list plus a 15 MB cap. Admins mount the same component with
  `canDelete={false}` so they can read client evidence without removing it.
- **Queries** — `routers/queries.py`, `QueriesPanel.jsx`. One component serves
  both sides via `role="client" | "admin"`; a client only ever receives their own
  thread because the client view filters by `clientEmail`.
- **Indian Brand Equity** — `routers/brand_equity.py`, `BrandEquityForm.jsx`.
  Five Aaker pillars weighted in `strength.brand_equity_score()`. Every pillar
  is **self-reported**, so each is *capped by the evidence that would have to
  exist for the claim to be true* before it is weighted — loyalty needs a
  repeat rate (no repeat customers caps it at 35), perceived quality needs
  customers or a certification, awareness needs reach, distribution needs
  customers, associations need years in market. A brand claiming 100 across
  the board with no traction scores 36/WEAK; the same claims backed by real
  numbers score 100/STRONG, and caps never apply once the supporting figure is
  present. The applied caps are persisted to `evidence_caps` and shown to the
  client with the exact number that would lift each one — the score explains
  itself rather than silently marking down. Re-submitting for the same
  `reportId` updates rather than duplicating.
- **Strength bands** — `strength.py`. `_report_json()` adds two on read:
  `scoreBand` bands the result, `dataBand` bands the *evidence* (intake
  completeness + word count, with `enriched: true` at 50+ words). Both are
  computed on read, so the stored shape is unchanged. Render them with
  `StrengthBadge.jsx` so the categorisation looks identical everywhere.

### AI report assessment (the admin's second opinion)

`integrations/report_ai.py` + `routers/assessment.py` +
`AiAssessmentPanel.jsx`. `POST /api/reports/{id}/ai-assessment` reads the
intake, every module score *and its output*, uploaded document metadata and the
brand equity assessment, then returns a **recommendation**: a 0-100 mark with a
five-dimension breakdown (market opportunity, customer evidence, business
model, competitive position, execution readiness), a GO/CONDITIONAL/PIVOT/REJECT
verdict, evidence-backed strengths and risks, specific suggestions, the data
gaps to chase, and a per-module audit flagging scores its own output data does
not support.

Two properties are load-bearing and must not be relaxed:

1. **It never publishes.** The endpoint writes only `orbita_analysis` (audit
   trail) — never `score`, `decision` or `status`. The admin's submitted mark is
   what publishes, so "Use this mark" merely *prefills* the review form. The
   admin's number always wins over the recommendation.
2. **Confidence bands the evidence, not the opinion.** LOW confidence on a thin
   intake is the signal to go back to the client before publishing, and the
   prompt forbids inflating a mark to look helpful. `_heuristic_assessment()`
   reproduces the same shape deterministically so the review screen is never
   empty without a key.

The prompt is the product here — it separates PROVEN from CLAIMED, requires the
client's own numbers to be quoted, and rejects generic advice in favour of
naming the binding constraint. Treat edits to `SYSTEM_PROMPT` as behavioural
changes and re-verify with a scratch script after.

### Authentication and data isolation

`server_python/auth.py` + `routers/auth_routes.py`. Dependency-free by design:
PBKDF2 hashing and HMAC-signed tokens both come from the standard library, so
no package install is needed for sign-in to work on a teammate's machine.

The rule that matters: **the caller's identity always comes from the token,
never from a request parameter.** Before this, `GET /queries?clientEmail=…` and
`GET /documents?uploadedBy=…` returned whatever was asked for, and
`/documents/{id}/download` had no check at all — any id was downloadable by
anyone. Both list endpoints now overwrite the filter with `owner_email(user)`
for non-admins, and download/delete compare against the token's email.

Dependencies: `require_user` (any signed-in caller), `require_admin`
(processing, reviewing, approving, deleting, AI endpoints, answering queries).
`_assert_can_read_report()` in `main.py` gates per-report reads. `list_reports`
filters a client's rows by the email on the attached client record.

Default accounts are seeded on boot by `seed_default_users()` —
`admin@consciousorbit.com` / `admin123` and `founder@venture.io` /
`password123`. **These are development credentials; change them before this is
exposed to anything real.** Set `AUTH_SECRET` in `server_python/.env` or tokens
are signed with a per-process random key and every restart logs everyone out.

Frontend: `src/api.js` keeps the token in localStorage, attaches
`Authorization: Bearer` to every call (including the multipart upload, which
must not set Content-Type itself), and on any 401 clears the token and notifies
`onUnauthorized` subscribers. Document and .docx downloads are fetch-to-blob
rather than an `<a href>`, since a plain link cannot carry the header.
