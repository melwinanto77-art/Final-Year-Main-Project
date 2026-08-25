"""MODULE 1 — CUSTOMER DISCOVERY (port of server/src/modules/customerDiscovery.js)
Input:  business idea / problem statement.
Logic:  can we communicate with the consumer? If yes, how many?
Output: interaction volume + a discovery readiness score.
"""
from typing import List, Optional
from pydantic import BaseModel, Field

from scoring import normalize, js_round, weighted_score, band

KEY = 'customerDiscovery'
TITLE = 'Customer Discovery'
ACTION = 'SCRUMING'


class InputSchema(BaseModel):
    businessIdea: str = Field(min_length=10, description='Describe the business idea in at least 10 characters')
    problemStatement: Optional[str] = Field(default=None, min_length=10)
    consumerCommunication: bool = False
    reachableConsumers: int = Field(default=0, ge=0)
    interviewsCompleted: int = Field(default=0, ge=0)
    weeklyInteractions: int = Field(default=0, ge=0)
    channels: List[str] = []


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})

    # The gate: without a path to the consumer, discovery cannot proceed and
    # the "how many" question is moot.
    if not data.consumerCommunication:
        return {
            'score': 0,
            'output': {
                'communicationFeasible': False,
                'reachableConsumers': 0,
                'interactionVolume': {'weekly': 0, 'total': 0},
                'readiness': 'BLOCKED',
                'summary':
                    'No viable channel to the consumer was identified. Establish a communication path '
                    'before proceeding — every downstream module depends on it.',
                'recommendations': [
                    'Identify at least one direct channel to the target consumer.',
                    'Run 5 exploratory conversations to confirm the problem exists.',
                ],
            },
        }

    # Volume sub-scores. Thresholds encode "what good looks like" at discovery stage.
    reach_score = normalize(data.reachableConsumers, 0, 500)
    interview_score = normalize(data.interviewsCompleted, 0, 30)
    cadence_score = normalize(data.weeklyInteractions, 0, 20)
    channel_score = normalize(len(data.channels), 0, 3)

    score = weighted_score([
        {'value': reach_score, 'weight': 0.3},
        {'value': interview_score, 'weight': 0.35},
        {'value': cadence_score, 'weight': 0.25},
        {'value': channel_score, 'weight': 0.1},
    ])

    return {
        'score': score,
        'output': {
            'communicationFeasible': True,
            'reachableConsumers': data.reachableConsumers,
            'interactionVolume': {
                'weekly': data.weeklyInteractions,
                'total': data.interviewsCompleted,
                'annualisedProjection': js_round(data.weeklyInteractions * 52),
            },
            'channels': data.channels,
            'breakdown': {
                'reachScore': reach_score,
                'interviewScore': interview_score,
                'cadenceScore': cadence_score,
                'channelScore': channel_score,
            },
            'readiness': band(score),
            'summary':
                f'Consumer communication is feasible across {len(data.channels) or "unspecified"} channel(s), '
                f'reaching {data.reachableConsumers} consumers with {data.weeklyInteractions} interactions per week.',
            'recommendations': _build_recommendations(data, interview_score, cadence_score),
        },
    }


def _build_recommendations(data, interview_score, cadence_score):
    out = []
    if interview_score < 50:
        out.append('Complete at least 15 discovery interviews before sizing the market.')
    if cadence_score < 50:
        out.append('Raise weekly consumer contact — a thin cadence produces stale signal.')
    if len(data.channels) < 2:
        out.append('Add a second reach channel to reduce single-channel dependency.')
    if not out:
        out.append('Discovery volume is sufficient — proceed to sector profiling.')
    return out
