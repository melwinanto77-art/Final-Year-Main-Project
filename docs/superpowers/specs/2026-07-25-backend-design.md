# The Conscious Orbit — Backend Design Spec

**Date:** 2026-07-25
**Status:** Approved by user (design review conducted in-session)
**Scope:** New `server/` backend only. Zero changes to any existing frontend file (`src/`, `index.html`, `vite.config.js`, root `package.json`).

## 1. Context

The repo contains a Vite + React 19 SPA ("The Conscious Orbit" — a business-analysis / venture-intelligence dashboard) with **no data layer at all**: no fetch/axios, no router, no env vars, no persistence. All data is hardcoded constants or local `useState`. This spec defines the backend that powers it: database schema, two state machines, REST API for 10 business-intelligence modules, AI + SpyFu integrations, and auth.

Key frontend shapes the backend must match (for future wiring; the UI is not modified now):

- Report entity: `{ id, name, vertical, tags: string[], status, score }` (`App.jsx:57-64`)
- Lifecycle columns: `RECEIVED → PENDING → PROCESSED → PUBLISHED`, paired 1:1 with action labels `SCRUMING / REQUIREMENT / MAPPING / DELIVERED` (`App.jsx:45-50`)
- Kanban moves one step forward **or backward** (`App.jsx:84-94`)
- Verticals: `students | institutions | msmes | industries | startups` (`App.jsx:25-31`)
- Score Aggregator weights: Feasibility 30%, Market 30%, Pricing Power 20%, GTM Viability 20%; verdict `1 · PROCEED` at score ≥ 60 (`VentureProcessor.jsx:302-336`, `VerticalEngines.jsx:25`)
- Login form fields: name (signup), email, password (`Login.jsx`)

## 2. Decisions (user-confirmed)

| Decision | Choice |
|---|---|
| Database + ORM | PostgreSQL + Prisma |
| Framework | Express 5 + TypeScript, layered (routes → controllers → services → prisma) |
| API style | REST under `/api/v1` |
| LLM provider (Module 7) | Both Anthropic + OpenAI behind one adapter, env-selected, keyless stub fallback |
| Auth | JWT email/password (register/login/me), matching existing Login form |
| Dev database | Docker Compose (postgres:16, host port **5433**) |
| Placement | Self-contained `server/` folder with its own `package.json` |

## 3. Directory layout

```
server/
  package.json            # own deps/scripts; root package.json untouched
  tsconfig.json
  docker-compose.yml      # postgres:16 on host port 5433, named volume
  .env.example
  prisma/
    schema.prisma
    seed.ts               # demo user + the 6 UI seed reports
  src/
    index.ts              # bootstrap: env check, listen
    app.ts                # express wiring: json, cors, routes, error middleware
    config/env.ts         # typed env loading + validation
    middleware/
      auth.ts             # JWT verify, attaches req.user
      validate.ts         # Zod body/params validation wrapper
      errors.ts           # central error handler + AppError
    routes/               # /api/v1 route definitions
    controllers/          # thin req/res handling
    services/
      stateMachine.ts
      score.ts            # final Orbital Score aggregation
      calculators/
        marketSize.ts
        feasibility.ts
        pricing.ts
        gtm.ts
        okr.ts
      llm/
        index.ts          # LlmService interface + provider selection
        anthropic.ts
        openai.ts
        stub.ts
        prompt.ts         # shared system prompt + report JSON schema
      spyfu.ts
    schemas/              # Zod schemas: auth, project, per-module data
    lib/prisma.ts         # singleton client
  tests/
    unit/                 # calculators, stateMachine, okr rollup, llm stub
    integration/          # supertest: auth, projects, publish gate, okr
```

## 4. Database schema (Prisma)

### Enums

```prisma
enum LifecycleStatus { RECEIVED PENDING PROCESSED PUBLISHED }
enum ActionWorkflow  { SCRUMING REQUIREMENT MAPPING DELIVERED }
enum ModuleType {
  CUSTOMER_DISCOVERY PROFILING MARKET_SIZE FEASIBILITY PRICING
  MARKET_RESEARCH INDUSTRY_REPORT BUSINESS_MODEL GTM OKR
}
enum ModuleStatus    { EMPTY IN_PROGRESS COMPLETED }
enum Vertical        { STARTUPS MSMES INDUSTRIES STUDENTS INSTITUTIONS }
enum BusinessCategory { B2B B2C B2B2C MARKETPLACE }
enum DataSourceKind  { PRIMARY SECONDARY }
```

Note: the user's spec lists 3 action values; `DELIVERED` is added because the UI pairs it with `PUBLISHED` (`App.jsx:49`).

### Models

```prisma
model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  projects     Project[]
}

model Project {
  id        String          @id @default(cuid())
  name      String
  vertical  Vertical
  tags      String[]
  status    LifecycleStatus @default(RECEIVED)
  action    ActionWorkflow  @default(SCRUMING)
  score     Int             @default(0)          // 0 until PUBLISHED
  owner     User            @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId   String
  modules   ProjectModule[]
  objectives Objective[]
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
}

model ProjectModule {
  id        String       @id @default(cuid())
  project   Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId String
  type      ModuleType
  status    ModuleStatus @default(EMPTY)
  data      Json         @default("{}")
  updatedAt DateTime     @updatedAt
  @@unique([projectId, type])
}

model Objective {
  id          String      @id @default(cuid())
  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId   String
  title       String
  description String?
  progress    Float       @default(0)   // rolled up, 0–100
  order       Int         @default(0)
  keyResults  KeyResult[]
  createdAt   DateTime    @default(now())
}

model KeyResult {
  id           String    @id @default(cuid())
  objective    Objective @relation(fields: [objectiveId], references: [id], onDelete: Cascade)
  objectiveId  String
  title        String
  targetValue  Float
  currentValue Float     @default(0)
  unit         String?
  progress     Float     @default(0)   // clamp(current/target*100, 0, 100)
  order        Int       @default(0)
}
```

**Storage rationale (hybrid, per user's spec "table or JSONB, whichever is most efficient"):** 9 of 10 modules are one-document-per-project → a uniform `ProjectModule` row with a Zod-validated `data` JSONB column gives uniform CRUD, a uniform completion gate, and no 9-way table sprawl. Module 10 (OKR) needs relational integrity for the rollup, so it gets real tables; its `ProjectModule` row still exists (data `{}`) so the 10-module completion gate stays uniform — its `status` is maintained by the OKR service (COMPLETED when ≥1 objective exists and every objective has ≥1 key result).

**On project creation** all 10 `ProjectModule` rows are created (EMPTY) in the same transaction.

## 5. Module `data` shapes (Zod-validated on every write)

Each `PUT /modules/:type` and each logic endpoint validates against these. `computed` sub-objects are **server-written only** — client-supplied `computed` is stripped.

1. **CUSTOMER_DISCOVERY** — `{ problemStatement: string, consumerCommunicationFeasible: boolean, targetAudienceSize: int ≥ 0, interactionVolume?: { stakeholders: int, weeklyInteractions: int } }`. Logic ("if yes, then how many"): the quantify endpoint requires `consumerCommunicationFeasible === true` before `targetAudienceSize` may be set.
2. **PROFILING** — `{ category: BusinessCategory, targetSectors: string[≥1], idealCustomerProfile: string, metrics: … }` where `metrics` is a discriminated union: B2B → `{ logisticsReadiness: 0–100, hrTechAdoption: 0–100, avgContractValue ≥ 0 }`; B2C (and B2B2C/MARKETPLACE) → `{ deliveryCapacity ≥ 0, productionVolume ≥ 0, avgOrderValue ≥ 0 }`.
3. **MARKET_SIZE** — inputs `{ tam: number > 0, samConversionPct: 0–100, somConversionPct: 0–100 }`; server computes `computed: { sam, som }` where `sam = tam × samPct/100`, `som = sam × somPct/100` (strict server-side; never client-supplied).
4. **FEASIBILITY** — `{ params: Record<string, number 0–100> (≥1 key), weights?: Record<string, number> (same keys; defaults equal) }`; computed `{ score: 0–100 (weighted mean, rounded), b2bAcquisitionViable: score ≥ 60, verdict: "PROCEED" | "PIVOT" }`.
5. **PRICING** — `{ competitors: [{ name, pricingModel: string, price ≥ 0 }] (≥1), userPricing: { pricingModel, price ≥ 0 } }`; computed `{ avgCompetitorPrice, differential = userPrice − avg, differentialPct, positioning: "PREMIUM" | "PARITY" | "DISCOUNT" }` (parity band: within ±5%).
6. **MARKET_RESEARCH** — `{ domain: string, competitorDomains: string[] }`; `results` written by the SpyFu service: `{ fetchedAt, stubbed: boolean, traffic: { monthlyOrganicClicks, monthlyPaidClicks }, keywords: [{ term, volume, difficulty }], perCompetitor: [...] }`.
7. **INDUSTRY_REPORT** — `{ sourceText: string (1–200k chars) }`; `report` written by the LLM service: `{ industryStanding: string, categories: [{ name, rating: "STRONG"|"AVERAGE"|"WEAK", findings: string[] }], opportunities: string[], risks: string[], summary: string }`, plus `{ provider, model, generatedAt }`.
8. **BUSINESS_MODEL** — `{ investment: { amount ≥ 0, currency: string }, timeEstimationMonths: int > 0, primaryData: DataEntry[], secondaryData: DataEntry[] }` where `DataEntry = { source: string, description: string, collectedAt?: date }`. The ingest endpoint accepts a mixed array `[{ kind: PRIMARY|SECONDARY, …entry }]` and separates into the two arrays.
9. **GTM** — `{ channels: [{ name, budgetPct 0–100 }] (must sum to ≤100), customerAvailability: { channelReach: Record<channelName, 0–100> } }`; computed `suggestions: [{ channel, priority: "HIGH"|"MEDIUM"|"LOW", tactic: string }]` — the "Command" plan (rule-based: priority from budgetPct × reach; tactic strings from a lookup keyed by channel archetype).
10. **OKR** — `data` stays `{}`; content lives in `Objective`/`KeyResult` tables.

**Module status rule:** a successful write sets `status = COMPLETED` when the module's full schema is satisfied; a partial write (allowed via `PUT` with the schema's `.partial()` for drafts) sets `IN_PROGRESS`. Modules **3, 4, 5, 6, 7, and 9** additionally require their server-generated section (`computed` / `results` / `report` / `suggestions`) to be present for COMPLETED — i.e., their logic endpoint has run. Modules 1, 2, and 8 complete on a full valid `PUT` alone (Module 8's ingest endpoint is a convenience that separates mixed entries; a direct PUT with pre-separated arrays is equally valid).

## 6. State machines

`services/stateMachine.ts`:

- Order: `RECEIVED → PENDING → PROCESSED → PUBLISHED`. Valid transition = exactly one step forward or one step back (mirrors the UI Kanban's Advance/Back buttons). Anything else → 422.
- **Publish gate:** transition to `PUBLISHED` requires **all 10** `ProjectModule` rows `COMPLETED`; otherwise 422 with `details.incompleteModules: ModuleType[]`.
- **Action sync:** `action` is stored (per user's spec: two enums on the model) but always derived on transition: RECEIVED→SCRUMING, PENDING→REQUIREMENT, PROCESSED→MAPPING, PUBLISHED→DELIVERED. Direct writes to `action` are not exposed.
- **On publish:** compute and store the final score (§7). On un-publish (back-step from PUBLISHED), score resets to 0 (matches the UI, which renders score only for PUBLISHED).
- Runs in a Prisma transaction (module check + update atomic).

## 7. Final score (Orbital Score)

`services/score.ts`, computed at publish time, weights matching the UI Score Aggregator:

```
feasibilityScore  = FEASIBILITY.computed.score                              (30%)
marketScore       = min(100, round(40 + (som/tam) × 1000))                   (30%)  // same curve the UI engine uses
pricingPower      = 100 − min(100, |differentialPct|)                        (20%)  // parity → strong pricing power
gtmViability      = round(mean(channel priority values: HIGH=90 MED=70 LOW=40)) (20%)
score             = round(0.3·f + 0.3·m + 0.2·p + 0.2·g)
verdict           = score ≥ 60 ? "PROCEED" (1) : "PIVOT" (0)
```

## 8. API surface (`/api/v1`, JSON)

All routes except `/auth/register` and `/auth/login` require `Authorization: Bearer <jwt>`. Projects are always scoped to the authenticated owner (404 on non-owned IDs).

| Method & path | Purpose |
|---|---|
| `POST /auth/register` | `{ name, email, password ≥ 8 }` → `{ token, user }` (bcrypt hash) |
| `POST /auth/login` | `{ email, password }` → `{ token, user }` |
| `GET /auth/me` | current user |
| `GET /projects` | list own projects (id, name, vertical, tags, status, action, score, updatedAt) |
| `POST /projects` | `{ name, vertical, tags? }` → project + 10 EMPTY modules (transaction) |
| `GET /projects/:id` | project + all modules + OKR tree |
| `PATCH /projects/:id` | `{ name?, tags? }` |
| `DELETE /projects/:id` | cascade delete |
| `POST /projects/:id/transition` | `{ direction: "forward" \| "back" }` → state machine (§6) |
| `GET /projects/:id/modules` | all 10 modules |
| `GET /projects/:id/modules/:type` | one module |
| `PUT /projects/:id/modules/:type` | validated draft/full write (§5); returns module with status |
| `POST /projects/:id/modules/market-size/calculate` | `{ tam, samConversionPct, somConversionPct }` → computed SAM/SOM saved + returned |
| `POST /projects/:id/modules/feasibility/score` | `{ params, weights? }` → Feasibility Score saved + returned |
| `POST /projects/:id/modules/pricing/differential` | `{ competitors, userPricing }` → differential/margins saved + returned |
| `POST /projects/:id/modules/market-research/fetch` | `{ domain, competitorDomains? }` → SpyFu (or stub) results saved + returned |
| `POST /projects/:id/modules/industry-report/analyze` | `{ sourceText }` → LLM categorized report saved + returned |
| `POST /projects/:id/modules/business-model/ingest` | `{ investment, timeEstimationMonths, entries: [{kind,…}] }` → separated + saved |
| `POST /projects/:id/modules/gtm/suggest` | `{ channels, customerAvailability }` → suggestions generated + saved |
| `GET /projects/:id/okr` | objectives with nested key results |
| `POST /projects/:id/okr/objectives` | `{ title, description? }` |
| `PATCH /projects/:id/okr/objectives/:objectiveId` | `{ title?, description? }` |
| `DELETE /projects/:id/okr/objectives/:objectiveId` | cascades to KRs; re-evaluates OKR module status |
| `POST /projects/:id/okr/objectives/:objectiveId/key-results` | `{ title, targetValue > 0, unit? }` |
| `PATCH /projects/:id/okr/key-results/:krId` | `{ currentValue ≥ 0 }` → **rollup** (§9) |
| `DELETE /projects/:id/okr/key-results/:krId` | re-rollup parent |
| `GET /health` | `{ ok: true, db: true }` (no auth) |

## 9. OKR rollup (`services/calculators/okr.ts`)

On any KR create/update/delete, inside one transaction:

1. `kr.progress = clamp(currentValue / targetValue × 100, 0, 100)`
2. `objective.progress = round(mean(all its KRs' progress), 1)` (0 when no KRs)
3. OKR `ProjectModule.status`: `COMPLETED` if ≥1 objective and every objective has ≥1 KR; `IN_PROGRESS` if ≥1 objective otherwise; `EMPTY` if none.

## 10. LLM service (Module 7)

`services/llm/index.ts` — `interface LlmService { analyzeIndustryReport(sourceText: string): Promise<IndustryReport> }`. Provider selection: `LLM_PROVIDER` env (`anthropic` | `openai` | `stub`); default: `anthropic` if `ANTHROPIC_API_KEY` set, else `openai` if `OPENAI_API_KEY` set, else `stub` (log a warning).

- **AnthropicDriver** (`@anthropic-ai/sdk`): model **`claude-opus-5`**; system prompt: senior business analyst persona; **structured outputs** via `output_config.format` (json_schema of `IndustryReport`) so the response is guaranteed parseable; streaming (`client.messages.stream` + `finalMessage()`) since uploaded reports can be long; `max_tokens` 16000; handle `stop_reason: "refusal"` (→ 422 with explanation) before reading content; server-side fallbacks enabled (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`) per current API guidance.
- **OpenAiDriver** (`openai`): model `gpt-4o`; same system prompt; `response_format: { type: "json_schema", … }`; same output contract.
- **StubDriver**: deterministic canned `IndustryReport` derived from simple text statistics of the input (word count, detected keywords) and marked `provider: "stub"` — the backend runs fully keyless.

Timeouts and provider errors map to 502 with `code: "LLM_UPSTREAM_ERROR"`.

## 11. SpyFu service (Module 6)

`services/spyfu.ts` — typed interface `fetchDomainStats(domain) → { traffic, keywords }`. When `SPYFU_API_KEY` is set: calls SpyFu REST endpoints (base URL in `SPYFU_API_URL`, Basic auth per SpyFu convention) — endpoints isolated in one file so the exact routes can be adjusted when the key arrives. When unset: returns deterministic stub data with `stubbed: true`. Upstream failures → 502 `SPYFU_UPSTREAM_ERROR`.

## 12. Errors

`AppError(status, code, message, details?)`; central middleware maps: Zod → 400 `VALIDATION_ERROR` (with issue paths), Prisma P2002 → 409 `CONFLICT`, P2025 → 404 `NOT_FOUND`, JWT errors → 401 `UNAUTHORIZED`, state-machine violations → 422 `INVALID_TRANSITION` / `MODULES_INCOMPLETE`, unknown → 500 `INTERNAL` (logged, message redacted). Envelope: `{ error: { code, message, details? } }`.

## 13. Auth details

- bcrypt (cost 10) password hashing; JWT HS256, `JWT_SECRET` required (server refuses to boot without it), 7-day expiry, payload `{ sub: userId }`.
- `auth.ts` middleware verifies and loads `req.user`; 401 on missing/invalid/expired token.

## 14. Environment (`.env.example`)

```
PORT=4000
DATABASE_URL=postgresql://orbit:orbit@localhost:5433/conscious_orbit
JWT_SECRET=change-me
CORS_ORIGIN=http://localhost:5173
LLM_PROVIDER=            # anthropic | openai | stub (blank = auto)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
SPYFU_API_KEY=
SPYFU_API_URL=https://www.spyfu.com/apis
```

## 15. Testing

- **Vitest unit tests** (pure, no DB): marketSize (incl. edge: 0/100 rates, rejection of tam ≤ 0), feasibility (weights, defaults, verdict boundary at 60), pricing (parity band edges), gtm suggestion rules, okr progress math (clamp, empty sets), stateMachine (all valid/invalid transitions, publish gate), llm stub determinism, module Zod schemas (accept/reject cases).
- **Supertest integration tests** (against Docker Postgres, `conscious_orbit_test` database, truncate between tests): register→login→me; project create seeds 10 modules; non-owner 404 scoping; module PUT draft→IN_PROGRESS, full→COMPLETED; publish blocked with incomplete list → complete all 10 → publish succeeds with score; OKR rollup end-to-end; transition back from PUBLISHED resets score.
- Scripts: `npm test` (unit), `npm run test:integration` (spins on existing Docker DB).

## 16. Seed data (`prisma/seed.ts`)

Demo user `founder@ecofly.io` / `orbit-demo-123`, plus the 6 projects the UI hardcodes (EcoFly Medical Drones / startups / PUBLISHED / 86, etc. — exact rows from `App.jsx:57-64`), with PUBLISHED ones given fully COMPLETED modules and plausible data so `GET /projects` mirrors today's UI immediately.

## 17. Run instructions (end state)

```
cd server
cp .env.example .env        # set JWT_SECRET
docker compose up -d        # postgres on :5433
npm install
npx prisma migrate dev      # create schema
npm run seed
npm run dev                 # API on http://localhost:4000
```

Frontend continues to run via `npm run dev` at the repo root, unchanged.

## 18. Out of scope (explicit)

- Any frontend change, including wiring the UI to these endpoints, adding a Vite proxy, or fixing the pre-existing latent `Users` import crash in `App.jsx:822`.
- File-upload endpoints (Module 7 accepts text in the JSON body; multipart upload can be added later).
- Roles/permissions beyond single-owner scoping; email verification; password reset.
- Rate limiting and production deployment config.
