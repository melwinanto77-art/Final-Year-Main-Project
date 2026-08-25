"""MODULE 2 — PROFILING (port of server/src/modules/profiling.js)
Classify B2B vs B2C, then route to the right sub-track:
  B2B -> logistics | customer | hrtech
  B2C -> delivery  | production
"""
from typing import Literal, Optional
from pydantic import BaseModel, Field

from scoring import normalize, weighted_score, band

KEY = 'profiling'
TITLE = 'Profiling'
ACTION = 'REQUIREMENT'

B2B_TRACKS = ['logistics', 'customer', 'hrtech']
B2C_TRACKS = ['delivery', 'production']

# Keyword -> track. First match wins; order matters for overlapping sectors.
ROUTING_RULES = {
    'B2B': [
        {'track': 'logistics', 'keywords': ['logistic', 'supply', 'freight', 'warehouse', 'fleet', 'shipping', 'transport']},
        {'track': 'hrtech', 'keywords': ['hr', 'recruit', 'talent', 'people', 'payroll', 'hiring', 'workforce']},
        {'track': 'customer', 'keywords': ['crm', 'support', 'success', 'sales', 'service', 'saas', 'b2b']},
    ],
    'B2C': [
        {'track': 'delivery', 'keywords': ['delivery', 'last-mile', 'courier', 'food', 'grocery', 'quick commerce', 'q-commerce']},
        {'track': 'production', 'keywords': ['manufactur', 'production', 'goods', 'retail', 'apparel', 'fmcg', 'consumer product']},
    ],
}

DEFAULT_TRACK = {'B2B': 'customer', 'B2C': 'production'}


class InputSchema(BaseModel):
    sector: str = Field(min_length=2)
    businessModel: Literal['B2B', 'B2C', 'B2B2C', 'Marketplace']
    targetDemographics: Optional[str] = None
    idealCompanyProfile: Optional[str] = None
    employeeCountRange: Optional[str] = None
    forceTrack: Optional[str] = None
    dataCompleteness: float = Field(default=50, ge=0, le=100)


def _primary_side(business_model):
    """B2B2C is treated as B2B (you sell to the business first); Marketplace as B2C."""
    return 'B2B' if business_model in ('B2B', 'B2B2C') else 'B2C'


def route_sector(sector, business_model):
    side = _primary_side(business_model)
    haystack = str(sector).lower()

    for rule in ROUTING_RULES[side]:
        matched = next((kw for kw in rule['keywords'] if kw in haystack), None)
        if matched:
            return {'side': side, 'track': rule['track'], 'matchedOn': matched, 'inferred': False}
    return {'side': side, 'track': DEFAULT_TRACK[side], 'matchedOn': None, 'inferred': True}


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})

    if data.forceTrack:
        routing = {
            'side': _primary_side(data.businessModel),
            'track': data.forceTrack,
            'matchedOn': None,
            'inferred': False,
            'overridden': True,
        }
    else:
        routing = route_sector(data.sector, data.businessModel)

    available_tracks = B2B_TRACKS if routing['side'] == 'B2B' else B2C_TRACKS

    # A confidently-routed, well-described profile scores higher than an inferred one.
    routing_confidence = 45 if routing['inferred'] else 90
    profile_depth = normalize(
        len([v for v in (data.targetDemographics, data.idealCompanyProfile, data.employeeCountRange) if v]),
        0, 3,
    )

    score = weighted_score([
        {'value': routing_confidence, 'weight': 0.4},
        {'value': profile_depth, 'weight': 0.35},
        {'value': data.dataCompleteness, 'weight': 0.25},
    ])

    summary = f'Classified as {routing["side"]} and routed to the "{routing["track"]}" track'
    summary += (
        ' (inferred — no sector keyword matched, confirm manually).'
        if routing['inferred']
        else f', matched on "{routing["matchedOn"]}".'
    )

    return {
        'score': score,
        'output': {
            'sector': data.sector,
            'businessModel': data.businessModel,
            'classification': routing['side'],
            'route': routing['track'],
            'routeInferred': routing['inferred'],
            'routeOverridden': bool(routing.get('overridden')),
            'matchedKeyword': routing['matchedOn'],
            'availableTracks': available_tracks,
            'idealCompanyProfile': data.idealCompanyProfile,
            'targetDemographics': data.targetDemographics,
            'confidence': band(score),
            'summary': summary,
            'recommendations': (
                [f'Confirm the "{routing["track"]}" routing — it was a fallback, not a keyword match.']
                if routing['inferred']
                else [f'Proceed with the {routing["track"]} playbook for the {routing["side"]} motion.']
            ),
        },
    }
