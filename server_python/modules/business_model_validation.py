"""MODULE 8 — BUSINESS MODEL VALIDATION
(port of server/src/modules/businessModelValidation.js)
Is the customer's investment worth the time?

Two data paths, both supported:
  PRIMARY   — custom form submissions -> field surveys -> report
  SECONDARY — pulled from existing module results on the report
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from scoring import js_round, normalize, weighted_score, band, verdict

KEY = 'businessModelValidation'
TITLE = 'Business Model Validation'
ACTION = 'REQUIREMENT'


class SurveyResponse(BaseModel):
    question: str
    value: float
    type: Literal['likert', 'count', 'boolean'] = 'likert'
    weight: float = Field(default=1, ge=0, le=1)


class PrimaryData(BaseModel):
    formSubmissions: int = Field(default=0, ge=0)
    fieldSurveys: List[SurveyResponse] = []
    surveyReach: int = Field(default=0, ge=0)
    notes: Optional[str] = None


class SecondaryData(BaseModel):
    useExistingModules: bool = True
    modules: List[str] = []


class Investment(BaseModel):
    capitalRequired: float = Field(ge=0)
    monthsToBreakEven: float = Field(gt=0)
    founderMonthsCommitted: float = Field(gt=0)
    expectedAnnualReturn: float = Field(default=0, ge=0)


class InputSchema(BaseModel):
    primary: Optional[PrimaryData] = None
    secondary: SecondaryData = SecondaryData()
    investment: Investment
    currency: str = 'USD'


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})
    module_results = (context or {}).get('moduleResults') or {}

    primary = _assess_primary(data.primary) if data.primary else None
    secondary = (
        _assess_secondary(module_results, data.secondary.modules)
        if data.secondary.useExistingModules else None
    )
    investment = _assess_investment(data.investment)

    # Primary (first-party evidence) outweighs secondary (inherited analysis).
    parts = [{'value': investment['score'], 'weight': 0.4}]
    if primary:
        parts.append({'value': primary['score'], 'weight': 0.35})
    if secondary and secondary['sampleSize'] > 0:
        parts.append({'value': secondary['score'], 'weight': 0.25})

    score = weighted_score(parts)
    v = verdict(score)

    return {
        'score': score,
        'output': {
            **v,
            'worthTheTime': v['decision'] == 1 and investment['paybackAcceptable'],
            'dataSources': {
                'primary': {'used': True, **primary} if primary else {'used': False},
                'secondary': {'used': True, **secondary} if secondary else {'used': False},
            },
            'investment': investment,
            'currency': data.currency,
            'confidence': band(score),
            'summary':
                f'{v["label"]} — {v["score"]}/100. '
                f'{data.currency} {_fmt_locale(data.investment.capitalRequired)} over '
                f'{_fmt(data.investment.founderMonthsCommitted)} founder-months, breaking even at month '
                f'{_fmt(data.investment.monthsToBreakEven)}. '
                + (f'{primary["sampleSize"]} primary data point(s).' if primary else 'No primary data supplied.'),
            'recommendations': _build_recommendations(primary, secondary, investment, v),
        },
    }


def _assess_primary(primary):
    """PRIMARY: custom form submissions -> field surveys -> report."""
    responses = primary.fieldSurveys
    sample_size = primary.formSubmissions + len(responses)

    # Normalise every response type onto 0-100 before weighting.
    normalised = []
    for r in responses:
        if r.type == 'likert':
            value = normalize(r.value, 1, 5)
        elif r.type == 'boolean':
            value = 100 if r.value else 0
        else:
            value = normalize(r.value, 0, 100)
        normalised.append({'value': value, 'weight': r.weight})

    sentiment_score = weighted_score(normalised) if normalised else 50
    volume_score = normalize(sample_size, 0, 100)
    reach_score = normalize(primary.surveyReach, 0, 500)

    score = weighted_score([
        {'value': sentiment_score, 'weight': 0.55},
        {'value': volume_score, 'weight': 0.3},
        {'value': reach_score, 'weight': 0.15},
    ])

    return {
        'score': score,
        'sampleSize': sample_size,
        'formSubmissions': primary.formSubmissions,
        'surveyResponses': len(responses),
        'surveyReach': primary.surveyReach,
        'sentimentScore': sentiment_score,
        'statisticallyMeaningful': sample_size >= 30,
        'notes': primary.notes,
    }


def _assess_secondary(module_results, requested_modules):
    """SECONDARY: pull from reports that already exist on this venture."""
    keys = requested_modules if requested_modules else list(module_results.keys())
    usable = [
        {'key': k, 'score': module_results.get(k, {}).get('score')}
        for k in keys
        if module_results.get(k, {}).get('score') is not None
    ]

    return {
        'score': js_round(sum(m['score'] for m in usable) / len(usable)) if usable else 0,
        'sampleSize': len(usable),
        'sourcedFrom': [m['key'] for m in usable],
        'skipped': [k for k in keys if module_results.get(k, {}).get('score') is None],
    }


def _assess_investment(inv):
    payback_score = normalize(36 - min(inv.monthsToBreakEven, 36), 0, 36)
    commitment_score = normalize(48 - min(inv.founderMonthsCommitted, 48), 0, 48)
    return_ratio = inv.expectedAnnualReturn / inv.capitalRequired if inv.capitalRequired else 0
    return_score = normalize(return_ratio, 0, 1)

    score = weighted_score([
        {'value': payback_score, 'weight': 0.4},
        {'value': return_score, 'weight': 0.35},
        {'value': commitment_score, 'weight': 0.25},
    ])

    return {
        'score': score,
        'capitalRequired': inv.capitalRequired,
        'monthsToBreakEven': inv.monthsToBreakEven,
        'founderMonthsCommitted': inv.founderMonthsCommitted,
        'annualReturnRatio': js_round(return_ratio, 2),
        'paybackAcceptable': inv.monthsToBreakEven <= 24,
    }


def _fmt(n):
    return int(n) if isinstance(n, float) and n.is_integer() else n


def _fmt_locale(n):
    return f'{_fmt(n):,}'


def _build_recommendations(primary, secondary, investment, v):
    out = []
    if not primary:
        out.append('No primary data — run field surveys before committing capital.')
    elif not primary['statisticallyMeaningful']:
        out.append(
            f'Primary sample of {primary["sampleSize"]} is below 30 — treat the sentiment score '
            'as directional only.')
    if secondary and secondary['skipped']:
        out.append(
            f'Secondary pull skipped {len(secondary["skipped"])} module(s) with no stored score: '
            f'{", ".join(secondary["skipped"])}.')
    if not investment['paybackAcceptable']:
        out.append(
            f'Break-even at month {_fmt(investment["monthsToBreakEven"])} exceeds the 24-month bar — '
            'the time investment is hard to justify.')
    if not out:
        out.append(f'Business model validated at {v["score"]}/100 — the investment is worth the time.')
    return out
