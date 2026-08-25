"""MODULE 7 — INDUSTRY REPORT (port of server/src/modules/industryReport.js)
The consolidating module: assembles complete documentation about the
business from every other module's output, then hands it to the AI
decision engine, which returns the executive verdict.
"""
from typing import Optional
from pydantic import BaseModel, Field

from scoring import weighted_score, band, verdict, js_round
from integrations.ai_provider import generate_decision

KEY = 'industryReport'
TITLE = 'Industry Report'
ACTION = 'DELIVERED'

# Weight each module contributes to the consolidated Orbital Score.
MODULE_WEIGHTS = {
    'customerDiscovery': 0.1,
    'profiling': 0.05,
    'marketSize': 0.2,
    'feasibility': 0.2,
    'pricing': 0.1,
    'marketResearch': 0.1,
    'businessModelValidation': 0.15,
    'gtm': 0.1,
}


class InputSchema(BaseModel):
    executiveContext: Optional[str] = None
    skipAi: bool = False
    threshold: float = Field(default=60, ge=0, le=100)


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})
    context = context or {}
    report = context.get('report') or {}
    module_results = context.get('moduleResults') or {}

    # 1. Consolidate every module's score into the weighted Orbital Score.
    contributions = [
        {'name': key, 'value': module_results[key]['score'], 'weight': weight}
        for key, weight in MODULE_WEIGHTS.items()
        if module_results.get(key, {}).get('score') is not None
    ]

    heuristic_score = weighted_score(contributions)
    coverage = round(len(contributions) / len(MODULE_WEIGHTS) * 100)

    # 2. Build the documentation payload the model reasons over.
    dossier = {
        'report': {
            'name': report.get('name'),
            'vertical': report.get('vertical'),
            'status': report.get('status'),
            'tags': report.get('tags'),
            'tracks': report.get('tracks'),
        },
        'clusters': report.get('clusters') or {},
        'executiveContext': data.executiveContext,
        'coveragePercent': coverage,
        'modules': {
            k: {'score': r.get('score'), 'output': r.get('output')}
            for k, r in module_results.items()
        },
    }

    # 3. Hand it to the decision engine.
    if data.skipAi:
        decision = {**verdict(heuristic_score, data.threshold), 'live': False, 'note': 'AI skipped by request.'}
    else:
        decision = generate_decision({**dossier, 'heuristicScore': heuristic_score})

    return {
        'score': heuristic_score,
        'integrations': {
            'ai': {'used': not data.skipAi, 'live': bool(decision.get('live')), 'model': decision.get('model')},
        },
        'output': {
            'orbitalScore': heuristic_score,
            'rating': band(heuristic_score),
            'coveragePercent': coverage,
            'contributions': [
                {
                    'module': c['name'],
                    'score': c['value'],
                    'weight': c['weight'],
                    'weightedContribution': js_round(c['value'] * c['weight'] * 10) / 10,
                }
                for c in contributions
            ],
            'missingModules': [
                k for k in MODULE_WEIGHTS
                if module_results.get(k, {}).get('score') is None
            ],
            'decision': {
                'decision': decision.get('decision'),
                'label': decision.get('label'),
                'score': decision.get('score'),
                'headline': decision.get('headline'),
                'rationale': decision.get('rationale'),
                'strengths': decision.get('strengths') or [],
                'risks': decision.get('risks') or [],
                'nextActions': decision.get('nextActions') or [],
                'generatedBy': decision.get('model') if decision.get('live') else 'heuristic',
                'live': bool(decision.get('live')),
                'note': decision.get('note'),
            },
            'dossier': dossier,
            'summary':
                f'Orbital Score {heuristic_score}/100 from {len(contributions)} of {len(MODULE_WEIGHTS)} modules '
                f'({coverage}% coverage). Verdict: {decision.get("label")} ({decision.get("decision")}).',
        },
    }
