"""AI report assessor — the analyst that reviews a finished report.

Reads everything the platform holds about a venture (intake answers, all
ten module scores and their outputs, uploaded document metadata, the brand
equity assessment) and returns:

  * recommendedScore — an independent 0-100 mark with its reasoning
  * verdict           — GO / CONDITIONAL / PIVOT / REJECT
  * analysis          — the written assessment
  * strengths / risks — evidence-backed, not generic
  * suggestions       — concrete actions, each tied to what is missing
  * confidence        — how much the evidence supports the mark at all
  * scoreBreakdown    — per-dimension marks so the number is auditable
  * dataGaps          — what was never answered

The score is a RECOMMENDATION. The admin reads it, applies their own
judgement, and the mark they submit is what publishes — this never writes
report.score or publishes anything by itself.

Degrades like every other integration: with no GEMINI_API_KEY it returns a
deterministic assessment computed from the module scores, flagged
`live: False`, so the review screen always has something to show.
"""
import json

from scoring import verdict as score_verdict
from strength import band_for, data_band
from . import gemini

# The dimensions the model must mark separately, so a single number can
# always be traced back to what drove it.
DIMENSIONS = [
    ("marketOpportunity", "Market opportunity — size, growth and whether the problem is real"),
    ("customerEvidence", "Customer evidence — proof real customers want this, not assumption"),
    ("businessModel", "Business model — unit economics, margins and path to break-even"),
    ("competitivePosition", "Competitive position — differentiation and pricing power"),
    ("executionReadiness", "Execution readiness — team, operations, regulatory and go-to-market"),
]

ASSESSMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "recommendedScore": {"type": "integer"},
        "verdict": {"type": "string", "enum": ["GO", "CONDITIONAL", "PIVOT", "REJECT"]},
        "confidence": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW"]},
        "headline": {"type": "string"},
        "analysis": {"type": "string"},
        "scoreBreakdown": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "dimension": {"type": "string"},
                    "score": {"type": "integer"},
                    "reasoning": {"type": "string"},
                },
                "required": ["dimension", "score", "reasoning"],
            },
        },
        "strengths": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
        "suggestions": {"type": "array", "items": {"type": "string"}},
        "dataGaps": {"type": "array", "items": {"type": "string"}},
        "moduleNotes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "moduleKey": {"type": "string"},
                    "assessment": {"type": "string", "enum": ["over_scored", "under_scored", "accurate"]},
                    "note": {"type": "string"},
                },
                "required": ["moduleKey", "assessment", "note"],
            },
        },
    },
    "required": [
        "recommendedScore", "verdict", "confidence", "headline", "analysis",
        "scoreBreakdown", "strengths", "risks", "suggestions", "dataGaps",
    ],
}

SYSTEM_PROMPT = """You are the senior venture analyst for The Venture Orbital. An administrator
is about to put a mark on a client's venture report and publish it. Your job is to give that
administrator an assessment they can trust and defend.

HOW TO MARK
Score each of these five dimensions 0-100, then set recommendedScore as their considered
weighted judgement (market opportunity and business model matter most; execution readiness
least):
- marketOpportunity: is the problem real, is the market big enough, is the sizing credible?
- customerEvidence: is there proof customers want this, or only the founder's assumption?
- businessModel: do the unit economics work, and is break-even financeable?
- competitivePosition: is there genuine differentiation, and does pricing hold up?
- executionReadiness: can this team actually deliver — operations, regulatory, go-to-market?

Bands: 80-100 exceptional and well-evidenced. 70-79 strong, proceed. 60-69 workable with
named conditions. 40-59 material problems, pivot. Below 40 do not proceed.

NON-NEGOTIABLE RULES
1. Ground every claim in the supplied data. Quote the client's own numbers and words.
   Never invent a figure, a competitor, or a market size.
2. Do not inflate. A thin submission gets a low mark and LOW confidence. Being generous
   here costs the client real money later. If the evidence is weak, say so and mark it down.
3. Separate what is PROVEN from what is CLAIMED. Self-reported ratings with no supporting
   numbers are claims, not evidence — treat them as such and say why.
4. Set confidence on the evidence, not on your opinion: HIGH only when the intake is
   substantially complete with real numbers; LOW when key fields are empty or the narrative
   is a single line. A LOW-confidence mark tells the admin to dig further before publishing.
5. Audit the pipeline's module scores. If a module score is not supported by its own output
   data, flag it as over_scored or under_scored and explain which figure contradicts it.
6. Suggestions must be specific and actionable — name the exact number, document or test
   the client should produce. "Do more market research" is useless; "survey 30 target
   customers to validate the 150-rupee price point, since willingness-to-pay is currently
   unevidenced" is useful.
7. dataGaps lists what was never answered. This is what the administrator will ask the
   client for, so be precise and complete.
8. Write for the administrator: direct, specific, no filler, no hedging platitudes. Name the
   binding constraint rather than listing generic startup advice."""


def _pretty(value, limit=6000):
    text = json.dumps(value, indent=2, default=str)
    return text if len(text) <= limit else text[:limit] + "\n… (truncated)"


def generate_report_assessment(report_json, module_results, documents=None, brand_equity=None):
    """Assess a report and recommend a mark. Always returns; check `.live`."""
    modules = {
        mr.module_key: {"score": mr.score, "output": mr.output}
        for mr in (module_results or [])
    }

    if not gemini.enabled():
        return {
            **_heuristic_assessment(report_json, modules),
            "live": False,
            "model": None,
            "note": "GEMINI_API_KEY not configured — showing a deterministic assessment computed "
                    "from the module scores. Configure the key for a reasoned analyst review.",
        }

    evidence = data_band(report_json)
    clusters = report_json.get("clusters") or {}
    client = report_json.get("client")
    client = client if isinstance(client, dict) else {}

    user_prompt = "\n".join([
        f"# Venture: {report_json.get('name')}",
        f"Vertical: {report_json.get('vertical')} | Stage: {client.get('stage')} | "
        f"Business model: {client.get('businessModel')} | Geography: {client.get('geography')}",
        "",
        "## Evidence quality (computed, not self-reported)",
        f"Intake completeness: {evidence['completeness']}%",
        f"Narrative detail: {evidence['words']} words "
        f"({'sufficient' if evidence['enriched'] else 'THIN — under the 50-word threshold'})",
        f"Modules completed: {len(modules)} of 10",
        "",
        "## What the client told us",
        "```json",
        _pretty(clusters),
        "```",
        "",
        "## Pipeline module scores and their computed outputs",
        "Audit these: does each score follow from its own output data?",
        "```json",
        _pretty(modules),
        "```",
        "",
        "## Supporting documents the client uploaded",
        _pretty(documents or []) if documents else "None uploaded — no third-party evidence to corroborate claims.",
        "",
        "## Indian Brand Equity assessment",
        _pretty(brand_equity) if brand_equity else "Not submitted.",
        "",
        "Produce your assessment. The administrator will weigh it against their own judgement "
        "before deciding the published mark.",
    ])

    result = gemini.generate_json(SYSTEM_PROMPT, user_prompt, ASSESSMENT_SCHEMA, max_output_tokens=8192)
    if not result:
        return {
            **_heuristic_assessment(report_json, modules),
            "live": False,
            "model": gemini.model_name(),
            "note": "Gemini call failed or returned no usable answer — showing the deterministic assessment.",
        }

    assessment = result["data"]

    # Gemini returns enum-typed numbers as strings; normalise before storing.
    assessment["recommendedScore"] = _clamp(assessment.get("recommendedScore"))
    for row in assessment.get("scoreBreakdown") or []:
        row["score"] = _clamp(row.get("score"))

    assessment["scoreBand"] = band_for(assessment["recommendedScore"])
    assessment["evidence"] = evidence
    assessment["live"] = True
    assessment["model"] = result["model"]
    assessment["note"] = "Reasoned assessment generated by the AI analyst."
    return assessment


def _clamp(value, default=0):
    try:
        return max(0, min(100, int(round(float(value)))))
    except (TypeError, ValueError):
        return default


def _heuristic_assessment(report_json, modules):
    """Deterministic assessment so the review screen is never empty.

    Marks each dimension from the modules that actually feed it, then bands
    confidence on the evidence rather than on the score.
    """
    def module_score(key, fallback=None):
        value = modules.get(key, {}).get("score")
        return value if value is not None else fallback

    def average(keys):
        values = [module_score(k) for k in keys]
        values = [v for v in values if v is not None]
        return _clamp(sum(values) / len(values)) if values else None

    dimension_scores = {
        "marketOpportunity": average(["marketSize", "customerDiscovery"]),
        "customerEvidence": average(["customerDiscovery", "businessModelValidation"]),
        "businessModel": average(["businessModelValidation", "feasibility"]),
        "competitivePosition": average(["pricing", "marketResearch"]),
        "executionReadiness": average(["gtm", "okr", "profiling"]),
    }

    weights = {
        "marketOpportunity": 0.25,
        "customerEvidence": 0.2,
        "businessModel": 0.25,
        "competitivePosition": 0.15,
        "executionReadiness": 0.15,
    }
    scored = {k: v for k, v in dimension_scores.items() if v is not None}
    if scored:
        total_weight = sum(weights[k] for k in scored)
        recommended = _clamp(sum(scored[k] * weights[k] for k in scored) / total_weight)
    else:
        recommended = 0

    evidence = data_band(report_json)
    confidence = (
        "HIGH" if evidence["completeness"] >= 80 and evidence["enriched"] and len(modules) >= 9
        else "LOW" if evidence["completeness"] < 50 or not evidence["enriched"]
        else "MEDIUM"
    )

    v = score_verdict(recommended)
    label = (
        "GO" if recommended >= 70
        else "CONDITIONAL" if recommended >= 60
        else "PIVOT" if recommended >= 40
        else "REJECT"
    )

    gaps = []
    if not evidence["enriched"]:
        gaps.append(
            f"Narrative detail is thin ({evidence['words']} words) — the client has not described "
            "the problem, model or plan in enough depth to assess properly."
        )
    if evidence["completeness"] < 100:
        gaps.append(f"Intake is only {evidence['completeness']}% complete — unanswered fields are scored on defaults.")
    missing = [k for k in (
        "customerDiscovery", "profiling", "marketSize", "feasibility", "pricing",
        "marketResearch", "businessModelValidation", "gtm", "okr",
    ) if k not in modules]
    if missing:
        gaps.append(f"Modules not yet run: {', '.join(missing)}.")

    lookup = {key: label_text for key, label_text in DIMENSIONS}
    return {
        "recommendedScore": recommended,
        "verdict": label,
        "confidence": confidence,
        "scoreBand": band_for(recommended),
        "headline": (
            f"Weighted dimension marks put this at {recommended}/100 ({label}), "
            f"on {confidence.lower()}-confidence evidence."
        ),
        "analysis": (
            f"Computed from {len(modules)} completed module(s) across five dimensions, with no "
            f"language model consulted. Intake is {evidence['completeness']}% complete with "
            f"{evidence['words']} words of narrative, so confidence is {confidence}. "
            "Treat this as an arithmetic baseline rather than a reasoned review — configure "
            "GEMINI_API_KEY for an analyst assessment that reads the client's actual answers."
        ),
        "scoreBreakdown": [
            {
                "dimension": key,
                "score": dimension_scores[key] if dimension_scores[key] is not None else 0,
                "reasoning": (
                    f"{lookup[key]} — averaged from the contributing module scores."
                    if dimension_scores[key] is not None
                    else "No contributing module has run yet, so this dimension is unassessed."
                ),
            }
            for key, _ in DIMENSIONS
        ],
        "strengths": [],
        "risks": (
            ["Evidence is too thin to support a confident mark — verify with the client before publishing."]
            if confidence == "LOW" else []
        ),
        "suggestions": [
            "Configure GEMINI_API_KEY to get a reasoned, evidence-grounded review with specific actions.",
            *( ["Ask the client to expand the intake narrative before you publish a mark."]
               if not evidence["enriched"] else [] ),
        ],
        "dataGaps": gaps,
        "moduleNotes": [],
        "evidence": evidence,
        "threshold": v["threshold"],
    }
