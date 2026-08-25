"""MODULE 6 — MARKET RESEARCH (port of server/src/modules/marketResearch.js)
Analyse the customer's competition, business and product, enriched with
SpyFu competitor keyword/domain analysis.
"""
from typing import List, Optional
from pydantic import BaseModel, Field

from scoring import normalize, weighted_score, band
from integrations.spyfu import fetch_domain_intelligence

KEY = 'marketResearch'
TITLE = 'Market Research'
ACTION = 'MAPPING'


class InputSchema(BaseModel):
    domain: Optional[str] = None
    productDescription: str = Field(min_length=10)
    targetKeywords: List[str] = []
    knownCompetitors: List[str] = []
    marketMaturity: float = Field(default=50, ge=0, le=100)
    differentiationStrength: float = Field(default=50, ge=0, le=100)
    countryCode: str = Field(default='US', min_length=2, max_length=2)


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})

    # The SpyFu integration never raises — it degrades to placeholder data.
    spyfu = fetch_domain_intelligence(data.domain, country_code=data.countryCode, limit=10)

    discovered = [c.get('domain') for c in (spyfu.get('topCompetitors') or []) if c.get('domain')]
    all_competitors = list(dict.fromkeys([*data.knownCompetitors, *discovered]))

    overlap = _keyword_overlap(data.targetKeywords, spyfu.get('topKeywords') or [])

    # A crowded market with weak differentiation scores poorly; a maturing
    # market with real differentiation scores well.
    competition_score = normalize(12 - min(len(all_competitors), 12), 0, 12)
    keyword_score = normalize(len(overlap['matched']), 0, max(len(data.targetKeywords), 1))

    score = weighted_score([
        {'value': data.differentiationStrength, 'weight': 0.35},
        {'value': competition_score, 'weight': 0.25},
        {'value': data.marketMaturity, 'weight': 0.2},
        {'value': keyword_score, 'weight': 0.2},
    ])

    total = len(all_competitors)
    intensity = 'CROWDED' if total >= 8 else 'CONTESTED' if total >= 4 else 'OPEN'

    return {
        'score': score,
        'integrations': {'spyfu': {'used': True, 'live': spyfu['live']}},
        'output': {
            'product': {'description': data.productDescription, 'domain': data.domain},
            'competition': {
                'known': data.knownCompetitors,
                'discovered': discovered,
                'total': total,
                'intensity': intensity,
            },
            'keywords': {'targeted': data.targetKeywords, **overlap},
            'spyfu': {
                'live': spyfu['live'],
                'note': spyfu['note'],
                'fetchedAt': spyfu['fetchedAt'],
                'domainStats': spyfu['domainStats'],
                'topKeywords': spyfu['topKeywords'],
                'topCompetitors': spyfu['topCompetitors'],
            },
            'whitespace': band(score),
            'breakdown': {
                'competitionScore': competition_score,
                'keywordScore': keyword_score,
                'marketMaturity': data.marketMaturity,
                'differentiationStrength': data.differentiationStrength,
            },
            'summary':
                f'{total} competitor(s) identified in a {"crowded" if total >= 8 else "contested"} market. '
                + ('Enriched with live SpyFu data.' if spyfu['live']
                   else 'SpyFu data is placeholder — configure credentials for live intelligence.'),
            'recommendations': _build_recommendations(all_competitors, overlap, spyfu, data),
        },
    }


def _keyword_overlap(targeted, spyfu_keywords):
    spyfu_set = {str(k.get('keyword') or '').lower() for k in spyfu_keywords}
    matched = [k for k in targeted if k.lower() in spyfu_set]
    unclaimed = [k for k in targeted if k.lower() not in spyfu_set]
    return {'matched': matched, 'unclaimed': unclaimed}


def _build_recommendations(all_competitors, overlap, spyfu, data):
    out = []
    if not spyfu['live']:
        out.append('Configure SPYFU_API_ID and SPYFU_SECRET_KEY — the competitor analysis is currently placeholder data.')
    if len(all_competitors) >= 8:
        out.append('Crowded field — differentiation, not feature parity, is the only viable wedge.')
    if overlap['unclaimed']:
        out.append(f'{len(overlap["unclaimed"])} targeted keyword(s) show no competitor presence — potential whitespace.')
    if data.differentiationStrength < 50:
        out.append('Differentiation is below par; sharpen the product wedge before scaling spend.')
    if not out:
        out.append('Competitive position is defensible — proceed to business-model validation.')
    return out
