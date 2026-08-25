# Admin Review Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a human-in-the-loop admin review step where reports enter REVIEWING state, admin reviews with Orbita AI, scores/overrides modules, and approves publication.

**Architecture:** Add REVIEWING status to the existing 4-stage state machine, extend Report/ModuleResult models with admin review fields, create Orbita analysis module and admin review endpoint, update both dashboards for review UI and dual-score display.

**Tech Stack:** Express 5 + Mongoose (server/), FastAPI + SQLAlchemy (server_python/), React 19 + Vite 8 (frontend), Anthropic Claude API for Orbita

## Global Constraints

- Both backends (Express + FastAPI) must be updated in parity — same state machine, same data model, same endpoints, same behaviour
- No real authentication — login remains a simulation; `reviewedBy` uses a hardcoded admin identifier
- AI integration degrades gracefully — no `ANTHROPIC_API_KEY` → heuristic analysis
- Follow existing code patterns and conventions
- Use `js_round` in Python for rounding parity with JS
- SQLAlchemy JSON columns: reassign, never mutate in place

---

## File Structure

### Backend (Express - server/)

| File | Action | Responsibility |
|---|---|---|
| `server/src/state/reportState.js` | Modify | Add REVIEWING to valid transitions |
| `server/src/state/actionPipeline.js` | Modify | Add REVIEWING stage with ADMIN_REVIEW action |
| `server/src/models/Report.js` | Modify | Add admin review fields to schema |
| `server/src/models/ModuleResult.js` | Modify | Add verifiedScore, verifiedAt |
| `server/src/integrations/orbita.js` | Create | Orbita AI analysis module |
| `server/src/controllers/orbitaController.js` | Create | POST /reports/:id/orbita-analysis handler |
| `server/src/controllers/reviewController.js` | Create | POST /reports/:id/review handler |
| `server/src/routes/reports.js` | Modify | Register new endpoints |

### Backend (FastAPI - server_python/)

| File | Action | Responsibility |
|---|---|---|
| `server_python/state.py` | Modify | Add REVIEWING to STAGE_FLOW |
| `server_python/models.py` | Modify | Add fields to ReportModel + ModuleResultModel |
| `server_python/integrations/orbita.py` | Create | Orbita AI analysis module |
| `server_python/routers/orbita.py` | Create | POST /reports/{id}/orbita-analysis |
| `server_python/routers/review.py` | Create | POST /reports/{id}/review |
| `server_python/main.py` | Modify | Register new routers |

### Frontend

| File | Action | Responsibility |
|---|---|---|
| `src/constants.js` | Modify | Add REVIEWING to REPORT_STATUSES, KANBAN_COLUMNS |
| `src/components/ui.jsx` | Modify | Add STATUS_STYLES for REVIEWING |
| `src/components/AdminDashboard.jsx` | Modify | Add REVIEWING column + review modal |
| `src/components/ExecutiveDashboard.jsx` | Modify | Update status badges + report overview |
| `src/components/ReportOverview.jsx` | Modify | Dual-score display |

---

## Tasks

### Task 1: State Machine — Add REVIEWING Status (Express)

**Files:**
- Modify: `server/src/state/reportState.js`
- Modify: `server/src/state/actionPipeline.js`

**Interfaces:**
- Consumes: existing VALID_TRANSITIONS map and PIPELINE_STAGES object
- Produces: VALID_TRANSITIONS now includes REVIEWING; PIPELINE_STAGES now includes REVIEWING stage

- [ ] **Step 1: Read current state machine files**

Read `server/src/state/reportState.js` and `server/src/state/actionPipeline.js` to understand current structure.

- [ ] **Step 2: Add REVIEWING to reportState.js**

In `server/src/state/reportState.js`, add REVIEWING to the VALID_TRANSITIONS map:

```javascript
// Add after the PROCESSED entry
REVIEWING: { forward: 'PUBLISHED', backward: 'PROCESSED' },
```

Also add REVIEWING to the STATUS enum/array if one exists.

- [ ] **Step 3: Add REVIEWING stage to actionPipeline.js**

In `server/src/state/actionPipeline.js`, add a new entry to PIPELINE_STAGES:

```javascript
// Add between PROCESSED and PUBLISHED entries
REVIEWING: {
  action: 'ADMIN_REVIEW',
  modules: [],  // No modules required — admin review is manual
},
```

- [ ] **Step 4: Verify existing tests still pass**

Run from `server/` directory:
```bash
node -e "import('./src/state/reportState.js').then(m => { console.log('VALID_TRANSITIONS:', Object.keys(m.VALID_TRANSITIONS)); console.log('OK'); })"
```
Expected: VALID_TRANSITIONS includes REVIEWING

- [ ] **Step 5: Commit**

```bash
git add server/src/state/reportState.js server/src/state/actionPipeline.js
git commit -m "feat: add REVIEWING status to Express state machine"
```

---

### Task 2: State Machine — Add REVIEWING Status (FastAPI)

**Files:**
- Modify: `server_python/state.py`

**Interfaces:**
- Consumes: existing STAGE_FLOW and ACTIONS dictionaries
- Produces: STAGE_FLOW now includes REVIEWING; ACTIONS now includes ADMIN_REVIEW

- [ ] **Step 1: Read current state file**

Read `server_python/state.py` to understand current structure.

- [ ] **Step 2: Add REVIEWING to STAGE_FLOW**

In `server_python/state.py`, add REVIEWING to the STAGE_FLOW list/dict:

```python
# Add between PROCESSED and PUBLISHED
STAGE_FLOW = ["RECEIVED", "PENDING", "PROCESSED", "REVIEWING", "PUBLISHED"]
```

- [ ] **Step 3: Add ADMIN_REVIEW to ACTIONS**

```python
ACTIONS = {
    "RECEIVED": "SCRUMING",
    "PENDING": "REQUIREMENT",
    "PROCESSED": "MAPPING",
    "REVIEWING": "ADMIN_REVIEW",
    "PUBLISHED": "DELIVERED",
}
```

- [ ] **Step 4: Verify state machine logic**

```bash
cd server_python && python -c "from state import STAGE_FLOW, ACTIONS, assert_transition; print('STAGE_FLOW:', STAGE_FLOW); print('OK')"
```
Expected: STAGE_FLOW includes REVIEWING

- [ ] **Step 5: Commit**

```bash
git add server_python/state.py
git commit -m "feat: add REVIEWING status to FastAPI state machine"
```

---

### Task 3: Data Model — Express Report + ModuleResult

**Files:**
- Modify: `server/src/models/Report.js`
- Modify: `server/src/models/ModuleResult.js`

**Interfaces:**
- Consumes: existing Mongoose schemas
- Produces: Report schema with adminScore, adminOverrides, orbitaAnalysis, reviewedBy, reviewedAt, approvalNote; ModuleResult schema with verifiedScore, verifiedAt

- [ ] **Step 1: Read current model files**

Read `server/src/models/Report.js` and `server/src/models/ModuleResult.js`.

- [ ] **Step 2: Add fields to Report schema**

In `server/src/models/Report.js`, add after the existing fields (before timestamps):

```javascript
adminScore: { type: Number, min: 0, max: 100, default: null },
adminOverrides: { type: Map, of: Number, default: null },
orbitaAnalysis: { type: Map, default: null },
reviewedBy: { type: String, default: null },
reviewedAt: { type: Date, default: null },
approvalNote: { type: String, default: null },
```

- [ ] **Step 3: Add fields to ModuleResult schema**

In `server/src/models/ModuleResult.js`, add after the existing score field:

```javascript
verifiedScore: { type: Number, min: 0, max: 100, default: null },
verifiedAt: { type: Date, default: null },
```

- [ ] **Step 4: Verify schema loads**

```bash
cd server && node -e "import('./src/models/Report.js').then(() => import('./src/models/ModuleResult.js')).then(() => console.log('Models OK'))"
```
Expected: "Models OK"

- [ ] **Step 5: Commit**

```bash
git add server/src/models/Report.js server/src/models/ModuleResult.js
git commit -m "feat: add admin review fields to Express Report and ModuleResult models"
```

---

### Task 4: Data Model — FastAPI Report + ModuleResult

**Files:**
- Modify: `server_python/models.py`

**Interfaces:**
- Consumes: existing SQLAlchemy models
- Produces: ReportModel with admin_score, admin_overrides, orbita_analysis, reviewed_by, reviewed_at, approval_note; ModuleResultModel with verified_score, verified_at

- [ ] **Step 1: Read current models**

Read `server_python/models.py`.

- [ ] **Step 2: Add fields to ReportModel**

In `server_python/models.py`, add to the ReportModel class:

```python
admin_score = Column(Integer, nullable=True)
admin_overrides = Column(JSON, nullable=True)       # { moduleKey: score }
orbita_analysis = Column(JSON, nullable=True)        # Orbita's analysis
reviewed_by = Column(String, nullable=True)
reviewed_at = Column(DateTime, nullable=True)
approval_note = Column(String, nullable=True)
```

- [ ] **Step 3: Add fields to ModuleResultModel**

```python
verified_score = Column(Integer, nullable=True)
verified_at = Column(DateTime, nullable=True)
```

- [ ] **Step 4: Create and run migration**

```bash
cd server_python && python -c "from models import Base, engine; Base.metadata.create_all(engine); print('Migration OK')"
```
Expected: "Migration OK"

- [ ] **Step 5: Commit**

```bash
git add server_python/models.py
git commit -m "feat: add admin review fields to FastAPI Report and ModuleResult models"
```

---

### Task 5: Orbita AI Analysis Module (Express)

**Files:**
- Create: `server/src/integrations/orbita.js`

**Interfaces:**
- Consumes: Anthropic client from `aiProvider.js`, ModuleResult model, SpyFu data from `integrations/spyfu.js`
- Produces: `generateOrbitaAnalysis(report, moduleResults)` returning orbitaAnalysis object

- [ ] **Step 1: Read existing integration files**

Read `server/src/integrations/aiProvider.js` and `server/src/integrations/spyfu.js` to understand patterns.

- [ ] **Step 2: Create orbita.js**

Create `server/src/integrations/orbita.js`:

```javascript
import { getClient } from './aiProvider.js';
import { env } from '../config/env.js';
import { fetchCompetitorData } from './spyfu.js';

const ORBITA_SYSTEM_PROMPT = `You are Orbita, the AI analysis assistant for The Conscious Orbit.

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
- Keep reasoning concise and specific`;

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    moduleReviews: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          moduleKey: { type: 'string' },
          pipelineScore: { type: 'number' },
          orbitaScore: { type: 'number' },
          assessment: { type: 'string', enum: ['over_scored', 'under_scored', 'accurate'] },
          reasoning: { type: 'string' },
        },
        required: ['moduleKey', 'pipelineScore', 'orbitaScore', 'assessment', 'reasoning'],
      },
    },
    overallAssessment: {
      type: 'string',
      enum: ['confident_go', 'cautious_go', 'needs_work', 'pivot_recommended'],
    },
    keyConcerns: { type: 'array', items: { type: 'string' } },
    keyStrengths: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'moduleReviews', 'overallAssessment', 'keyConcerns', 'keyStrengths'],
};

export async function generateOrbitaAnalysis(report, moduleResults) {
  const anthropic = getClient();

  // Build module context
  const modulesContext = {};
  for (const mr of moduleResults) {
    modulesContext[mr.moduleKey] = {
      score: mr.score,
      output: mr.output,
    };
  }

  // Fetch competitor data if available
  let competitorData = null;
  try {
    competitorData = await fetchCompetitorData(report.client?.industry || report.vertical);
  } catch {
    competitorData = { note: 'SpyFu data unavailable' };
  }

  if (!anthropic) {
    return {
      ...heuristicOrbitaAnalysis(modulesContext, competitorData),
      live: false,
      model: null,
      note: 'ANTHROPIC_API_KEY not configured — returning heuristic Orbita analysis.',
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: env.anthropic.model,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { format: { type: 'json_schema', schema: ANALYSIS_SCHEMA } },
      system: ORBITA_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            'Analyze this venture report. For each module, compare the pipeline score against the output data and flag inconsistencies.',
            '',
            '## Module Data',
            '```json',
            JSON.stringify(modulesContext, null, 2),
            '```',
            '',
            '## Competitor Data (SpyFu)',
            '```json',
            JSON.stringify(competitorData, null, 2),
            '```',
            '',
            'Provide your analysis.',
          ].join('\n'),
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return {
        ...heuristicOrbitaAnalysis(modulesContext, competitorData),
        live: false,
        model: env.anthropic.model,
        note: `Model declined — returning heuristic analysis.`,
      };
    }

    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    const parsed = JSON.parse(text);

    return {
      ...parsed,
      live: true,
      model: response.model,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  } catch (error) {
    return {
      ...heuristicOrbitaAnalysis(modulesContext, competitorData),
      live: false,
      model: env.anthropic.model,
      note: `Orbita analysis failed (${error.message}) — returning heuristic analysis.`,
    };
  }
}

function heuristicOrbitaAnalysis(modulesContext, competitorData) {
  const moduleReviews = Object.entries(modulesContext).map(([moduleKey, data]) => ({
    moduleKey,
    pipelineScore: data.score,
    orbitaScore: data.score,
    assessment: 'accurate',
    reasoning: 'Heuristic analysis — no AI model available. Pipeline score used as-is.',
  }));

  const scores = Object.values(modulesContext).map((m) => m.score);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    summary: `Heuristic analysis of ${moduleReviews.length} modules. Average pipeline score: ${Math.round(avg)}/100. No language model was consulted.`,
    moduleReviews,
    overallAssessment: avg >= 70 ? 'confident_go' : avg >= 50 ? 'cautious_go' : avg >= 30 ? 'needs_work' : 'pivot_recommended',
    keyConcerns: moduleReviews.length < 5 ? ['Analysis based on incomplete pipeline data.'] : [],
    keyStrengths: avg >= 70 ? ['Pipeline scores are generally strong.'] : [],
  };
}
```

- [ ] **Step 3: Verify module loads**

```bash
cd server && node -e "import('./src/integrations/orbita.js').then(() => console.log('Orbita module OK'))"
```
Expected: "Orbita module OK"

- [ ] **Step 4: Commit**

```bash
git add server/src/integrations/orbita.js
git commit -m "feat: add Orbita AI analysis module for Express"
```

---

### Task 6: Orbita AI Analysis Module (FastAPI)

**Files:**
- Create: `server_python/integrations/orbita.py`

**Interfaces:**
- Consumes: Anthropic client from `ai_provider.py`, SpyFu from `spyfu.py`
- Produces: `generate_orbita_analysis(report, module_results)` returning orbita_analysis dict

- [ ] **Step 1: Read existing integration files**

Read `server_python/integrations/ai_provider.py` and `server_python/integrations/spyfu.py`.

- [ ] **Step 2: Create orbita.py**

Create `server_python/integrations/orbita.py` mirroring the Express version:

```python
import json
import os
from typing import Optional

from .ai_provider import get_client, get_model
from .spyfu import fetch_competitor_data

ORBITA_SYSTEM_PROMPT = """You are Orbita, the AI analysis assistant for The Conscious Orbit.

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
- Keep reasoning concise and specific"""


def generate_orbita_analysis(report, module_results: list) -> dict:
    """Generate Orbita's analysis of a report's module scores."""
    client = get_client()

    # Build module context
    modules_context = {}
    for mr in module_results:
        modules_context[mr.module_key] = {
            "score": mr.score,
            "output": mr.output,
        }

    # Fetch competitor data
    try:
        competitor_data = fetch_competitor_data(
            report.client.industry if report.client else report.vertical
        )
    except Exception:
        competitor_data = {"note": "SpyFu data unavailable"}

    if not client:
        result = _heuristic_analysis(modules_context, competitor_data)
        result["live"] = False
        result["model"] = None
        result["note"] = "ANTHROPIC_API_KEY not configured — returning heuristic Orbita analysis."
        return result

    try:
        response = client.messages.create(
            model=get_model(),
            max_tokens=16000,
            system=ORBITA_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Analyze this venture report. For each module, compare the pipeline score "
                        "against the output data and flag inconsistencies.\n\n"
                        "## Module Data\n"
                        "```json\n"
                        f"{json.dumps(modules_context, indent=2)}\n"
                        "```\n\n"
                        "## Competitor Data (SpyFu)\n"
                        "```json\n"
                        f"{json.dumps(competitor_data, indent=2)}\n"
                        "```\n\n"
                        "Provide your analysis."
                    ),
                }
            ],
        )

        text = response.content[0].text if response.content else ""
        parsed = json.loads(text)

        return {
            **parsed,
            "live": True,
            "model": response.model,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
        }
    except Exception as e:
        result = _heuristic_analysis(modules_context, competitor_data)
        result["live"] = False
        result["model"] = get_model()
        result["note"] = f"Orbita analysis failed ({e}) — returning heuristic analysis."
        return result


def _heuristic_analysis(modules_context: dict, competitor_data: dict) -> dict:
    """Deterministic fallback when no AI is available."""
    module_reviews = []
    for module_key, data in modules_context.items():
        module_reviews.append({
            "moduleKey": module_key,
            "pipelineScore": data["score"],
            "orbitaScore": data["score"],
            "assessment": "accurate",
            "reasoning": "Heuristic analysis — no AI model available. Pipeline score used as-is.",
        })

    scores = [m["score"] for m in modules_context.values()]
    avg = sum(scores) / len(scores) if scores else 0
    from scoring import js_round
    avg = js_round(avg)

    if avg >= 70:
        overall = "confident_go"
    elif avg >= 50:
        overall = "cautious_go"
    elif avg >= 30:
        overall = "needs_work"
    else:
        overall = "pivot_recommended"

    return {
        "summary": f"Heuristic analysis of {len(module_reviews)} modules. Average pipeline score: {avg}/100. No language model was consulted.",
        "moduleReviews": module_reviews,
        "overallAssessment": overall,
        "keyConcerns": ["Analysis based on incomplete pipeline data."] if len(module_reviews) < 5 else [],
        "keyStrengths": ["Pipeline scores are generally strong."] if avg >= 70 else [],
    }
```

- [ ] **Step 3: Verify module loads**

```bash
cd server_python && python -c "from integrations.orbita import generate_orbita_analysis; print('Orbita module OK')"
```
Expected: "Orbita module OK"

- [ ] **Step 4: Commit**

```bash
git add server_python/integrations/orbita.py
git commit -m "feat: add Orbita AI analysis module for FastAPI"
```

---

### Task 7: Admin Review + Orbita Endpoints (Express)

**Files:**
- Create: `server/src/controllers/orbitaController.js`
- Create: `server/src/controllers/reviewController.js`
- Modify: `server/src/routes/reports.js`

**Interfaces:**
- Consumes: Report model, ModuleResult model, `generateOrbitaAnalysis()` from Task 5, state machine from Task 1
- Produces: `POST /reports/:id/orbita-analysis` and `POST /reports/:id/review` routes

- [ ] **Step 1: Read current routes file**

Read `server/src/routes/reports.js` to understand routing patterns.

- [ ] **Step 2: Create orbitaController.js**

Create `server/src/controllers/orbitaController.js`:

```javascript
import Report from '../models/Report.js';
import ModuleResult from '../models/ModuleResult.js';
import { generateOrbitaAnalysis } from '../integrations/orbita.js';

export async function runOrbitaAnalysis(req, res) {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found', message: `No report with id ${id}` });

    const moduleResults = await ModuleResult.find({ report: id });
    if (!moduleResults.length) {
      return res.status(409).json({
        error: 'No modules completed',
        message: 'Run at least one module before requesting Orbita analysis.',
      });
    }

    const analysis = await generateOrbitaAnalysis(report, moduleResults);

    // Store analysis on report
    report.orbitaAnalysis = analysis;
    await report.save();

    return res.json({ analysis });
  } catch (error) {
    return res.status(500).json({ error: 'Orbita analysis failed', message: error.message });
  }
}
```

- [ ] **Step 3: Create reviewController.js**

Create `server/src/controllers/reviewController.js`:

```javascript
import Report from '../models/Report.js';
import ModuleResult from '../models/ModuleResult.js';
import { advance } from '../state/reportState.js';

export async function submitReview(req, res) {
  try {
    const { id } = req.params;
    const { adminScore, adminOverrides, approvalNote } = req.body;

    // Validate
    if (adminScore === undefined || adminScore === null) {
      return res.status(422).json({
        error: 'Validation failed',
        message: 'adminScore is required',
        issues: [{ path: 'adminScore', message: 'Required', code: 'required' }],
      });
    }
    if (typeof adminScore !== 'number' || adminScore < 0 || adminScore > 100) {
      return res.status(422).json({
        error: 'Validation failed',
        message: 'adminScore must be between 0 and 100',
        issues: [{ path: 'adminScore', message: 'Must be 0-100', code: 'invalid' }],
      });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ error: 'Report not found', message: `No report with id ${id}` });
    if (report.status !== 'REVIEWING') {
      return res.status(409).json({
        error: 'Report not in REVIEWING status',
        message: `Report is currently ${report.status}. Can only review reports in REVIEWING status.`,
      });
    }

    // Save admin review data
    report.adminScore = adminScore;
    report.adminOverrides = adminOverrides || null;
    report.approvalNote = approvalNote || null;
    report.reviewedBy = 'admin';
    report.reviewedAt = new Date();

    // Apply module overrides
    if (adminOverrides && typeof adminOverrides === 'object') {
      for (const [moduleKey, score] of Object.entries(adminOverrides)) {
        await ModuleResult.findOneAndUpdate(
          { report: id, moduleKey },
          { verifiedScore: score, verifiedAt: new Date() }
        );
      }
    }

    // Advance to PUBLISHED
    advance(report, 'PUBLISHED', 'Admin approved report');
    await report.save();

    return res.json({ report: report.toJSON() });
  } catch (error) {
    return res.status(500).json({ error: 'Review submission failed', message: error.message });
  }
}
```

- [ ] **Step 4: Register routes in reports.js**

In `server/src/routes/reports.js`, add after existing routes:

```javascript
import { runOrbitaAnalysis } from '../controllers/orbitaController.js';
import { submitReview } from '../controllers/reviewController.js';

// Add these routes after the existing report routes
router.post('/reports/:id/orbita-analysis', runOrbitaAnalysis);
router.post('/reports/:id/review', submitReview);
```

- [ ] **Step 5: Verify routes load**

```bash
cd server && node -e "import('./src/routes/reports.js').then(() => console.log('Routes OK'))"
```
Expected: "Routes OK"

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/orbitaController.js server/src/controllers/reviewController.js server/src/routes/reports.js
git commit -m "feat: add Orbita analysis and admin review endpoints for Express"
```

---

### Task 8: Admin Review + Orbita Endpoints (FastAPI)

**Files:**
- Create: `server_python/routers/orbita.py`
- Create: `server_python/routers/review.py`
- Modify: `server_python/main.py`

**Interfaces:**
- Consumes: ReportModel, ModuleResultModel from Task 4, `generate_orbita_analysis()` from Task 6, state machine from Task 2
- Produces: POST /reports/{id}/orbita-analysis and POST /reports/{id}/review routes

- [ ] **Step 1: Read current main.py**

Read `server_python/main.py` to understand router registration patterns.

- [ ] **Step 2: Create orbita.py router**

Create `server_python/routers/orbita.py`:

```python
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from fastapi import Depends

from database import get_db
from models import ReportModel, ModuleResultModel
from integrations.orbita import generate_orbita_analysis

router = APIRouter(prefix="/api", tags=["orbita"])


@router.post("/reports/{report_id}/orbita-analysis")
def run_orbita_analysis(report_id: str, db: Session = Depends(get_db)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")

    module_results = db.query(ModuleResultModel).filter(
        ModuleResultModel.report_id == report_id
    ).all()

    if not module_results:
        raise HTTPException(
            status_code=409,
            detail="No modules completed. Run at least one module before requesting Orbita analysis.",
        )

    analysis = generate_orbita_analysis(report, module_results)

    # Store on report (reassign, don't mutate)
    report.orbita_analysis = analysis
    db.commit()
    db.refresh(report)

    return {"analysis": analysis}
```

- [ ] **Step 3: Create review.py router**

Create `server_python/routers/review.py`:

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, Dict
from datetime import datetime, timezone

from database import get_db
from models import ReportModel, ModuleResultModel
from state import advance

router = APIRouter(prefix="/api", tags=["review"])


class ReviewRequest(BaseModel):
    adminScore: int = Field(ge=0, le=100)
    adminOverrides: Optional[Dict[str, int]] = None
    approvalNote: Optional[str] = None


@router.post("/reports/{report_id}/review")
def submit_review(report_id: str, body: ReviewRequest, db: Session = Depends(get_db)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")

    if report.status != "REVIEWING":
        raise HTTPException(
            status_code=409,
            detail=f"Report is currently {report.status}. Can only review reports in REVIEWING status.",
        )

    # Save admin review data (reassign, don't mutate JSON columns)
    report.admin_score = body.adminScore
    report.admin_overrides = body.adminOverrides
    report.approval_note = body.approvalNote
    report.reviewed_by = "admin"
    report.reviewed_at = datetime.now(timezone.utc)

    # Apply module overrides
    if body.adminOverrides:
        for module_key, score in body.adminOverrides.items():
            mr = db.query(ModuleResultModel).filter(
                ModuleResultModel.report_id == report_id,
                ModuleResultModel.module_key == module_key,
            ).first()
            if mr:
                mr.verified_score = score
                mr.verified_at = datetime.now(timezone.utc)

    # Advance to PUBLISHED
    advance(report, "PUBLISHED", "Admin approved report")

    db.commit()
    db.refresh(report)

    return {"report": report}
```

- [ ] **Step 4: Register routers in main.py**

In `server_python/main.py`, add after existing router includes:

```python
from routers.orbita import router as orbita_router
from routers.review import router as review_router

app.include_router(orbita_router)
app.include_router(review_router)
```

- [ ] **Step 5: Verify routers load**

```bash
cd server_python && python -c "from main import app; print('Routers OK')"
```
Expected: "Routers OK"

- [ ] **Step 6: Commit**

```bash
git add server_python/routers/orbita.py server_python/routers/review.py server_python/main.py
git commit -m "feat: add Orbita analysis and admin review endpoints for FastAPI"
```

---

### Task 9: Frontend Constants + Status Styles

**Files:**
- Modify: `src/constants.js`
- Modify: `src/components/ui.jsx`

**Interfaces:**
- Consumes: existing REPORT_STATUSES, KANBAN_COLUMNS, STATUS_STYLES
- Produces: Updated constants with REVIEWING status

- [ ] **Step 1: Read current constants**

Read `src/constants.js` and `src/components/ui.jsx`.

- [ ] **Step 2: Update REPORT_STATUSES in constants.js**

In `src/constants.js`, add REVIEWING to REPORT_STATUSES:

```javascript
export const REPORT_STATUSES = ['RECEIVED', 'PENDING', 'PROCESSED', 'REVIEWING', 'PUBLISHED'];
```

- [ ] **Step 3: Update KANBAN_COLUMNS in constants.js**

```javascript
export const KANBAN_COLUMNS = [
  { status: 'RECEIVED',  action: 'SCRUMING',      note: 'Reviewing business ideas & problem statements' },
  { status: 'PENDING',   action: 'REQUIREMENT',   note: 'Gathering customer data & B2B/B2C specs' },
  { status: 'PROCESSED', action: 'MAPPING',       note: 'Defining TAM/SAM/SOM conversions' },
  { status: 'REVIEWING', action: 'ADMIN_REVIEW',  note: 'Admin reviewing report with Orbita AI' },
  { status: 'PUBLISHED', action: 'DELIVERED',     note: 'Generated scores & downloadable artifacts' },
];
```

- [ ] **Step 4: Add STATUS_STYLES for REVIEWING in ui.jsx**

In `src/components/ui.jsx`, add to STATUS_STYLES:

```javascript
REVIEWING: { color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
```

- [ ] **Step 5: Verify constants load**

```bash
cd . && node -e "import('./src/constants.js').then(m => { console.log('STATUSES:', m.REPORT_STATUSES); console.log('COLUMNS:', m.KANBAN_COLUMNS.length); })"
```
Expected: STATUSES includes REVIEWING, COLUMNS length is 5

- [ ] **Step 6: Commit**

```bash
git add src/constants.js src/components/ui.jsx
git commit -m "feat: add REVIEWING status to frontend constants and styles"
```

---

### Task 10: Admin Dashboard — REVIEWING Column + Review Modal

**Files:**
- Modify: `src/components/AdminDashboard.jsx`

**Interfaces:**
- Consumes: KANBAN_COLUMNS from Task 9, `advanceReport()` and `revertReport()` from `src/api.js`
- Produces: REVIEWING column in Kanban, Report Review Modal with Orbita analysis + admin review form

- [ ] **Step 1: Read AdminDashboard.jsx**

Read `src/components/AdminDashboard.jsx` to understand current Kanban and report tracking implementation.

- [ ] **Step 2: Add REVIEWING column to Kanban**

The Kanban already iterates over KANBAN_COLUMNS, so adding REVIEWING to the constants (Task 9) automatically creates the column. Ensure the column renders with the amber style.

- [ ] **Step 3: Create Report Review Modal component**

Add a new `ReportReviewModal` component inside AdminDashboard.jsx (or as a separate file). The modal should:

1. Fetch report data + module results when opened
2. Display left panel: all module cards with scores
3. Display right panel: "Run Orbita Analysis" button → calls `POST /api/reports/${id}/orbita-analysis` → shows results
4. Display bottom panel: admin review form with:
   - Overall score input (0-100)
   - Per-module override inputs (each shows pipeline score)
   - Approval note textarea
   - "Approve & Publish" button → calls `POST /api/reports/${id}/review`
   - "Send Back" button → calls `revertReport(id)`

- [ ] **Step 4: Add review button to Kanban cards**

For reports in REVIEWING status, add a "Review" button that opens the ReportReviewModal.

- [ ] **Step 5: Verify component renders**

```bash
npm run dev
```
Navigate to admin dashboard → Report Tracking → verify REVIEWING column appears.

- [ ] **Step 6: Commit**

```bash
git add src/components/AdminDashboard.jsx
git commit -m "feat: add admin review modal with Orbita analysis to AdminDashboard"
```

---

### Task 11: Executive Dashboard — Dual-Score Display + Status Badges

**Files:**
- Modify: `src/components/ExecutiveDashboard.jsx`
- Modify: `src/components/ReportOverview.jsx`

**Interfaces:**
- Consumes: report data with adminScore, adminOverrides, orbitaAnalysis fields
- Produces: Updated status badges, dual-score display in report overview

- [ ] **Step 1: Read ExecutiveDashboard and ReportOverview**

Read `src/components/ExecutiveDashboard.jsx` and `src/components/ReportOverview.jsx`.

- [ ] **Step 2: Update status badges**

In ExecutiveDashboard.jsx, update the status badge logic:

```javascript
// Replace existing status badge logic
const getStatusBadge = (report) => {
  if (report.status === 'REVIEWING') return { label: 'UNDER_REVIEW', color: 'amber' };
  if (report.status === 'PUBLISHED' && report.adminScore !== null) return { label: 'VERIFIED', color: 'green' };
  if (report.status === 'PUBLISHED') return { label: 'DRAFT', color: 'blue' };
  return { label: 'INTAKE', color: 'gray' };
};
```

- [ ] **Step 3: Update ReportOverview modal for dual scores**

In ReportOverview.jsx, update the score display:

```jsx
{/* Top: Admin verified score */}
{report.adminScore !== null && (
  <div className="mb-6 p-4 border border-green-500/20 rounded-lg bg-green-500/5">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-green-400 font-semibold">Verified Score</span>
      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
        <CheckCircle size={12} /> Verified
      </span>
    </div>
    <div className="text-4xl font-bold text-green-400">{report.adminScore}<span className="text-lg text-green-400/60">/100</span></div>
    {report.approvalNote && <p className="mt-2 text-sm text-[#CFCFCF]">{report.approvalNote}</p>}
  </div>
)}

{/* Collapsible: Auto-generated scores */}
<details className="mb-6">
  <summary className="text-sm text-[#9A9A9A] cursor-pointer hover:text-[#CFCFCF]">
    Auto-generated Pipeline Score: {report.score}/100
  </summary>
  {/* Module grid with pipeline scores */}
</details>
```

- [ ] **Step 4: Update module grid to show both scores**

In the module results grid, show both pipeline and admin-verified scores:

```jsx
{moduleResults.map(mr => (
  <div key={mr.moduleKey} className="...">
    <div className="flex justify-between items-center">
      <span>{mr.moduleKey}</span>
      <div className="flex items-center gap-2">
        <span className="text-[#9A9A9A]">{mr.score}</span>
        {report.adminOverrides?.[mr.moduleKey] !== undefined && (
          <span className="text-[#D4AF37] flex items-center gap-1">
            <CheckCircle size={12} /> {report.adminOverrides[mr.moduleKey]}
          </span>
        )}
      </div>
    </div>
  </div>
))}
```

- [ ] **Step 5: Verify component renders**

```bash
npm run dev
```
Navigate to executive dashboard → verify status badges show correctly → open report overview → verify dual-score display.

- [ ] **Step 6: Commit**

```bash
git add src/components/ExecutiveDashboard.jsx src/components/ReportOverview.jsx
git commit -m "feat: add dual-score display and verified status badges to ExecutiveDashboard"
```

---

### Task 12: Integration Verification

**Files:** None (testing only)

**Interfaces:** All tasks 1-11 complete

- [ ] **Step 1: Start Express backend**

```bash
cd server && npm run dev
```
Verify server starts on :4000.

- [ ] **Step 2: Start FastAPI backend**

```bash
cd server_python && uvicorn main:app --reload --port 8000
```
Verify server starts on :8000.

- [ ] **Step 3: Start frontend**

```bash
npm run dev
```
Verify frontend starts on :5173.

- [ ] **Step 4: Test state machine transitions**

Verify via both backends:
- A report can advance from PROCESSED → REVIEWING
- A report in REVIEWING cannot advance to PUBLISHED without admin score (409)
- A report in REVIEWING can revert to PROCESSED

- [ ] **Step 5: Test Orbita analysis endpoint**

```bash
curl -X POST http://localhost:8000/api/reports/{id}/orbita-analysis
```
Expected: Returns orbitaAnalysis object (or heuristic fallback).

- [ ] **Step 6: Test admin review endpoint**

```bash
curl -X POST http://localhost:8000/api/reports/{id}/review \
  -H "Content-Type: application/json" \
  -d '{"adminScore": 75, "adminOverrides": {"marketSize": 80}, "approvalNote": "Looks good"}'
```
Expected: Report advances to PUBLISHED with admin scores saved.

- [ ] **Step 7: Verify admin dashboard shows REVIEWING column**

Navigate to admin dashboard → Report Tracking → verify 5-column Kanban with REVIEWING column.

- [ ] **Step 8: Verify executive dashboard shows verified badge**

Navigate to executive dashboard → open a published report → verify "Verified" badge and dual-score display.

- [ ] **Step 9: Run lint**

```bash
npm run lint
```
Expected: No new errors.

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "feat: complete admin review workflow with Orbita AI integration"
```
