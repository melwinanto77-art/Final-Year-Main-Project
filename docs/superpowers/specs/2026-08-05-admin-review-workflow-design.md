# Admin Review Workflow Design

## Overview

Add a human-in-the-loop admin review step between automated module scoring and report publication. Reports enter a `REVIEWING` state where an admin reviews them with an AI assistant called **Orbita**, scores the report, can override individual module scores, and approves publication. Users see both auto-generated and admin-verified scores.

## Current State

Reports flow through: `RECEIVED → PENDING → PROCESSED → PUBLISHED` (fully automated, no human review).

## Proposed State

```
RECEIVED → PENDING → PROCESSED → REVIEWING → PUBLISHED
```

## 1. State Machine Changes

### New Status: `REVIEWING`

| Status | Action | Description |
|---|---|---|
| `RECEIVED` | `SCRUMING` | Intake review (unchanged) |
| `PENDING` | `REQUIREMENT` | Data gathering (unchanged) |
| `PROCESSED` | `MAPPING` | Module scoring (unchanged) |
| `REVIEWING` | `ADMIN_REVIEW` | Admin reviews with Orbita, scores, overrides, approves |
| `PUBLISHED` | `DELIVERED` | Report visible to user with "Verified" badge |

### Transitions

- `PROCESSED → REVIEWING`: Ungated (report already has all module scores)
- `REVIEWING → PUBLISHED`: Gated — requires admin score to be set (409 if missing)
- `REVIEWING → PROCESSED`: Allowed (admin sends back for re-processing)
- `PUBLISHED → REVIEWING`: Allowed (admin re-opens review)

### Files to Change

- `server/src/state/reportState.js` — Add REVIEWING to valid transitions
- `server/src/state/actionPipeline.js` — Add REVIEWING stage with ADMIN_REVIEW action, no required modules
- `server_python/state.py` — Mirror same changes
- `src/constants.js` — Add REVIEWING to REPORT_STATUSES, KANBAN_COLUMNS
- `src/components/ui.jsx` — Add STATUS_STYLES for REVIEWING

## 2. Data Model Changes

### Report Model Additions

```javascript
// Both Mongoose (server/) and SQLAlchemy (server_python/)
{
  adminScore: Number/Integer (0-100, nullable),
  adminOverrides: Object/JSON (nullable),      // { moduleKey: score }
  orbitaAnalysis: Object/JSON (nullable),       // Orbita's analysis result
  reviewedBy: String (nullable),                // Admin identifier
  reviewedAt: DateTime (nullable),
  approvalNote: String (nullable)               // Admin's note to user
}
```

### Orbita Analysis Object Shape

```javascript
{
  summary: String,                    // Overall assessment
  moduleReviews: [{                   // Per-module analysis
    moduleKey: String,
    pipelineScore: Number,
    orbitaScore: Number,
    assessment: String,               // "over_scored" | "under_scored" | "accurate"
    reasoning: String
  }],
  competitorContext: Object,          // SpyFu data used in analysis
  overallAssessment: String,          // "confident_go" | "cautious_go" | "needs_work" | "pivot_recommended"
  keyConcerns: [String],
  keyStrengths: [String]
}
```

### Module Result Additions

```javascript
{
  verifiedScore: Number (nullable),   // Admin-overridden score
  verifiedAt: DateTime (nullable)
}
```

### Files to Change

- `server/src/models/Report.js` — Add new fields to schema
- `server/src/models/ModuleResult.js` — Add verifiedScore, verifiedAt
- `server_python/models.py` — Mirror same changes (SQLAlchemy columns)
- `server_python/models.py` ReportModel — Add same fields

## 3. Orbita AI Integration

### New Endpoint

`POST /api/reports/:id/orbita-analysis`

### Flow

1. Fetch all 10 module results + outputs for the report
2. Fetch SpyFu competitor data (if available)
3. Send to Claude with system prompt instructing critical analysis
4. Return structured `orbitaAnalysis` object
5. Store on report

### AI Provider Reuse

- Reuse existing Anthropic client from `server/src/integrations/aiProvider.js`
- Same model: `claude-opus-5` via `ANTHROPIC_API_KEY`
- Same graceful degradation: no API key → heuristic analysis with `live: false`
- Python backend: reuse from `server_python/integrations/ai_provider.py`

### System Prompt (Orbita)

```
You are Orbita, the AI analysis assistant for The Conscious Orbit.

You receive a venture report with 10 module scores and SpyFu competitor data.
Your job is to critically analyze each module's score and flag inconsistencies.

For each module:
- Compare the score against the module's output data
- Flag if the score seems over-scored or under-scored relative to the data
- Provide reasoning for your assessment

Give an overall assessment:
- confident_go: Strong data, scores are well-supported
- cautious_go: Mostly solid, some concerns to address
- needs_work: Significant issues with scoring or data quality
- pivot_recommended: Fundamental problems with the venture

Rules:
- Be honest and critical — don't inflate scores
- Ground every claim in the supplied data
- If a module is missing data, flag the score as unreliable
- Compare against SpyFu competitor benchmarks where available
- Keep reasoning concise and specific
```

### Files to Create/Change

- `server/src/integrations/orbita.js` — New Orbita analysis module
- `server_python/integrations/orbita.py` — Mirror in Python
- `server/src/controllers/orbitaController.js` — New controller
- `server_python/routers/orbita.py` — New router
- Both server route registrations

## 4. Admin Review Endpoints

### New Endpoint

`POST /api/reports/:id/review`

### Request Body

```javascript
{
  adminScore: Number (0-100, required),
  adminOverrides: {                    // optional per-module overrides
    moduleKey: Number (0-100)
  },
  approvalNote: String                 // optional note to user
}
```

### Behavior

1. Validate report is in REVIEWING status (409 otherwise)
2. Validate adminScore is 0-100 (422 otherwise)
3. Save adminScore, adminOverrides, approvalNote, reviewedBy, reviewedAt
4. For each module override: update ModuleResult.verifiedScore
5. Advance report from REVIEWING → PUBLISHED
6. Return updated report

### Files to Create/Change

- `server/src/controllers/reviewController.js` — New controller
- `server_python/routers/review.py` — New router
- Both server route registrations

## 5. Admin Dashboard Changes

### Kanban Update

5 columns instead of 4:

```
PENDING | IN_PROGRESS | PROCESSED | REVIEWING | COMPLETED
```

- REVIEWING column: amber color, shows reports waiting for admin review
- Reports in REVIEWING have a "Review" button (opens review modal)

### Report Review Modal (New)

Full-screen modal with three sections:

**Left Panel — Report Data:**
- Report name, vertical, tags
- All 10 module cards with scores and outputs
- Pipeline history (transitions)
- Pipeline score (auto-generated)

**Right Panel — Orbita Analysis:**
- "Run Orbita Analysis" button (triggers POST /orbita-analysis)
- Loading state while analyzing
- Results display: summary, per-module reviews (with over/under/accurate badges), competitor context, key concerns, key strengths

**Bottom Panel — Admin Review Form:**
- Overall score input (0-100)
- Per-module override inputs (each shows pipeline score, admin can type new score)
- Approval note textarea
- "Approve & Publish" button (calls POST /review, advances to PUBLISHED)
- "Send Back" button (reverts to PROCESSED)

### Files to Change

- `src/components/AdminDashboard.jsx` — Add REVIEWING column, review modal, review form

## 6. Executive Dashboard Changes

### Status Badges

| Status | Badge | Color |
|---|---|---|
| RECEIVED/PENDING/PROCESSED | `INTAKE` | Gray |
| REVIEWING | `UNDER_REVIEW` | Amber |
| PUBLISHED (no admin score) | `DRAFT` | Blue |
| PUBLISHED (with admin score) | `VERIFIED` | Green |

### Report Overview Modal Updates

- Top section: Admin verified score with green "Verified" badge + approval note
- Collapsible "Auto-generated Scores" section showing original pipeline scores
- Module grid: pipeline score (gray) + admin override if present (gold, with checkmark)
- Download .doc includes admin verified scores

### Files to Change

- `src/components/ExecutiveDashboard.jsx` — Update status badges, report overview modal
- `src/components/ReportOverview.jsx` — Dual-score display

## 7. Backend Parity

Both Express (`server/`) and FastAPI (`server_python/`) must implement identical:
- State machine transitions (REVIEWING status)
- Data model fields (admin score, overrides, orbita analysis)
- Orbita analysis endpoint (same system prompt, same output shape)
- Admin review endpoint (same validation, same behavior)
- Graceful degradation (no API key → heuristic analysis)

## 8. Constants to Update

```javascript
// src/constants.js
REPORT_STATUSES: ['RECEIVED', 'PENDING', 'PROCESSED', 'REVIEWING', 'PUBLISHED']
KANBAN_COLUMNS: [
  { status: 'RECEIVED',  action: 'SCRUMING',      note: '...' },
  { status: 'PENDING',   action: 'REQUIREMENT',   note: '...' },
  { status: 'PROCESSED', action: 'MAPPING',       note: '...' },
  { status: 'REVIEWING', action: 'ADMIN_REVIEW',  note: 'Admin reviewing report with Orbita AI' },
  { status: 'PUBLISHED', action: 'DELIVERED',     note: '...' },
]
```

```javascript
// src/components/ui.jsx — STATUS_STYLES
REVIEWING: { color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' }
```

## 9. Scope Boundaries

**In scope:**
- State machine changes (both backends)
- Data model additions (both backends)
- Orbita AI analysis endpoint (both backends)
- Admin review endpoint (both backends)
- Admin dashboard review UI
- Executive dashboard dual-score display
- Constants updates

**Out of scope:**
- Real authentication/role-based access (login remains simulation)
- Notification system (admin checks queue manually)
- Report versioning (admin overrides replace, no history of overrides)
- Batch review (admin reviews one report at a time)
