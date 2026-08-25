"""MODULE 4 — FEASIBILITY (port of server/src/modules/feasibility.js)
Is this practically worth doing? Specifically: are the B2B consumers
worth pursuing at the price they'll pay?
"""
import math
from typing import Optional
from pydantic import BaseModel, Field

from scoring import weighted_score, band, verdict, normalize, js_round

KEY = 'feasibility'
TITLE = 'Feasibility'
ACTION = 'MAPPING'


class B2bEconomics(BaseModel):
    averageContractValue: float = Field(default=0, ge=0)
    customerAcquisitionCost: float = Field(default=0, ge=0)
    salesCycleDays: float = Field(default=90, ge=0)
    expectedRetentionMonths: float = Field(default=12, ge=0)


class InputSchema(BaseModel):
    technical: float = Field(default=50, ge=0, le=100)
    operational: float = Field(default=50, ge=0, le=100)
    financial: float = Field(default=50, ge=0, le=100)
    regulatory: float = Field(default=50, ge=0, le=100)
    teamCapability: float = Field(default=50, ge=0, le=100)
    b2b: Optional[B2bEconomics] = None
    threshold: float = Field(default=60, ge=0, le=100)


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})

    parameters = [
        {'name': 'technical', 'value': data.technical, 'weight': 0.2},
        {'name': 'operational', 'value': data.operational, 'weight': 0.2},
        {'name': 'financial', 'value': data.financial, 'weight': 0.25},
        {'name': 'regulatory', 'value': data.regulatory, 'weight': 0.15},
        {'name': 'teamCapability', 'value': data.teamCapability, 'weight': 0.2},
    ]

    parameter_score = weighted_score(parameters)
    b2b_assessment = _assess_b2b_worth(data.b2b) if data.b2b else None

    # When B2B economics are supplied they carry real weight — a venture with
    # strong parameters but upside-down unit economics is not feasible.
    score = (
        weighted_score([
            {'value': parameter_score, 'weight': 0.6},
            {'value': b2b_assessment['score'], 'weight': 0.4},
        ])
        if b2b_assessment
        else parameter_score
    )

    v = verdict(score, data.threshold)
    weakest = min(parameters, key=lambda p: p['value'])

    if b2b_assessment:
        summary = (
            f'{v["label"]} — feasibility {v["score"]}/100. B2B segment is '
            f'{"worth pursuing" if b2b_assessment["worthIt"] else "not worth pursuing"} '
            f'(LTV:CAC {b2b_assessment["ltvToCac"]}).'
        )
    else:
        summary = (
            f'{v["label"]} — feasibility {v["score"]}/100 from weighted parameters. '
            'Supply B2B economics for a segment verdict.'
        )

    return {
        'score': score,
        'output': {
            **v,
            'parameterScore': parameter_score,
            'parameters': {p['name']: p['value'] for p in parameters},
            'weakestParameter': weakest['name'],
            'b2bAssessment': b2b_assessment,
            'rating': band(score),
            'summary': summary,
            'recommendations': _build_recommendations(parameters, b2b_assessment),
        },
    }


def _assess_b2b_worth(b2b):
    """Are B2B consumers worth it? The standard test is LTV:CAC >= 3 with a
    payback period the business can actually finance."""
    monthly_value = b2b.averageContractValue / 12
    ltv = monthly_value * b2b.expectedRetentionMonths
    ltv_to_cac = js_round(ltv / b2b.customerAcquisitionCost, 2) if b2b.customerAcquisitionCost else None
    payback_months = js_round(b2b.customerAcquisitionCost / monthly_value, 1) if monthly_value else None

    ltv_score = 50 if ltv_to_cac is None else normalize(ltv_to_cac, 0, 5)
    payback_score = 50 if payback_months is None else normalize(24 - min(payback_months, 24), 0, 24)
    cycle_score = normalize(180 - min(b2b.salesCycleDays, 180), 0, 180)

    score = weighted_score([
        {'value': ltv_score, 'weight': 0.5},
        {'value': payback_score, 'weight': 0.3},
        {'value': cycle_score, 'weight': 0.2},
    ])

    if ltv_to_cac is None:
        reason = 'No CAC supplied — LTV:CAC could not be computed.'
    elif ltv_to_cac >= 3:
        reason = f'LTV:CAC of {ltv_to_cac} clears the 3.0 bar.'
    else:
        reason = (
            f'LTV:CAC of {ltv_to_cac} is below the 3.0 bar — acquisition costs too much '
            'relative to what a customer returns.'
        )

    return {
        'score': score,
        'ltv': js_round(ltv),
        'ltvToCac': ltv_to_cac,
        'paybackMonths': payback_months,
        'salesCycleDays': b2b.salesCycleDays,
        'worthIt': (ltv_to_cac or 0) >= 3 and (payback_months if payback_months is not None else math.inf) <= 18,
        'verdictReason': reason,
    }


def _build_recommendations(parameters, b2b_assessment):
    out = []
    weakest = min(parameters, key=lambda p: p['value'])
    if weakest['value'] < 50:
        out.append(
            f'Address {weakest["name"]} feasibility first — it is the binding constraint '
            f'at {weakest["value"]}/100.')
    if b2b_assessment and not b2b_assessment['worthIt']:
        out.append(b2b_assessment['verdictReason'])
        if (b2b_assessment['paybackMonths'] or 0) > 18:
            out.append('Shorten CAC payback below 18 months or the segment cannot be financed.')
    if not out:
        out.append('Feasibility parameters clear the bar — proceed to pricing.')
    return out
