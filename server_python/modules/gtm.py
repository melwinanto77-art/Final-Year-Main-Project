"""MODULE 9 — GTM / GO-TO-MARKET (port of server/src/modules/gtm.js)
Analyse the customer, their availability, advertising strategy and
commands, then generate and rank strategy suggestions.
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from scoring import js_round, normalize, weighted_score, band

KEY = 'gtm'
TITLE = 'Go-To-Market'
ACTION = 'MAPPING'

CHANNELS = [
    'paid-search', 'paid-social', 'seo', 'content', 'outbound',
    'partnerships', 'events', 'community', 'pr', 'referral',
]

Channel = Literal['paid-search', 'paid-social', 'seo', 'content', 'outbound',
                  'partnerships', 'events', 'community', 'pr', 'referral']

# Playbook per channel: cost/speed/scale characteristics drive the ranking.
CHANNEL_PROFILES = {
    'paid-search':  {'cost': 'high',   'speed': 'fast',   'scale': 'high',   'bestFor': ['B2C', 'B2B'], 'minBudget': 5000},
    'paid-social':  {'cost': 'medium', 'speed': 'fast',   'scale': 'high',   'bestFor': ['B2C'],        'minBudget': 3000},
    'seo':          {'cost': 'low',    'speed': 'slow',   'scale': 'high',   'bestFor': ['B2C', 'B2B'], 'minBudget': 1000},
    'content':      {'cost': 'low',    'speed': 'slow',   'scale': 'medium', 'bestFor': ['B2B'],        'minBudget': 1000},
    'outbound':     {'cost': 'medium', 'speed': 'medium', 'scale': 'medium', 'bestFor': ['B2B'],        'minBudget': 2000},
    'partnerships': {'cost': 'low',    'speed': 'slow',   'scale': 'high',   'bestFor': ['B2B'],        'minBudget': 500},
    'events':       {'cost': 'high',   'speed': 'medium', 'scale': 'low',    'bestFor': ['B2B'],        'minBudget': 10000},
    'community':    {'cost': 'low',    'speed': 'slow',   'scale': 'medium', 'bestFor': ['B2C'],        'minBudget': 500},
    'pr':           {'cost': 'medium', 'speed': 'medium', 'scale': 'medium', 'bestFor': ['B2C', 'B2B'], 'minBudget': 3000},
    'referral':     {'cost': 'low',    'speed': 'medium', 'scale': 'medium', 'bestFor': ['B2C'],        'minBudget': 500},
}


class Availability(BaseModel):
    channels: List[Channel] = []
    peakHours: Optional[str] = None
    geography: Optional[str] = None
    seasonality: Optional[str] = None


class Advertising(BaseModel):
    monthlyBudget: float = Field(default=0, ge=0)
    currentChannels: List[Channel] = []
    currentCac: Optional[float] = Field(default=None, ge=0)
    targetCac: Optional[float] = Field(default=None, ge=0)


class InputSchema(BaseModel):
    audience: str = Field(min_length=3)
    businessModel: Literal['B2B', 'B2C', 'B2B2C', 'Marketplace']
    availability: Availability = Availability()
    advertising: Advertising = Advertising()
    # Explicit operator directives — "commands" — that constrain the strategy.
    commands: List[str] = []
    launchHorizonMonths: float = Field(default=6, gt=0)


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})
    side = 'B2C' if data.businessModel in ('B2C', 'Marketplace') else 'B2B'

    suggestions = _build_suggestions(data, side)
    budget_allocation = _allocate_budget(suggestions, data.advertising.monthlyBudget)

    reach_score = normalize(len(data.availability.channels), 0, 4)
    budget_score = normalize(data.advertising.monthlyBudget, 0, 20000)
    if data.advertising.currentCac and data.advertising.targetCac:
        cac_score = normalize(
            data.advertising.targetCac - data.advertising.currentCac,
            -data.advertising.targetCac,
            data.advertising.targetCac,
        )
        cac_gap = js_round(data.advertising.currentCac - data.advertising.targetCac, 2)
    else:
        cac_score = 50
        cac_gap = None
    horizon_score = normalize(18 - min(data.launchHorizonMonths, 18), 0, 18)

    score = weighted_score([
        {'value': reach_score, 'weight': 0.3},
        {'value': budget_score, 'weight': 0.25},
        {'value': cac_score, 'weight': 0.25},
        {'value': horizon_score, 'weight': 0.2},
    ])

    return {
        'score': score,
        'output': {
            'audience': data.audience,
            'classification': side,
            'availability': data.availability.model_dump(),
            'advertising': {**data.advertising.model_dump(), 'cacGap': cac_gap},
            'commands': data.commands,
            'strategy': {
                'recommendedChannels': suggestions[:4],
                'allChannels': suggestions,
                'budgetAllocation': budget_allocation,
                'phasing': _build_phasing(suggestions, data.launchHorizonMonths),
            },
            'viability': band(score),
            'breakdown': {
                'reachScore': reach_score,
                'budgetScore': budget_score,
                'cacScore': cac_score,
                'horizonScore': horizon_score,
            },
            'summary':
                f'{len(suggestions)} channel(s) ranked for a {side} motion targeting "{data.audience}". '
                f'Top pick: {suggestions[0]["channel"] if suggestions else "none"}.',
            'recommendations': _build_recommendations(data, suggestions),
        },
    }


def _build_suggestions(data, side):
    """Rank every channel for this venture; higher fit = earlier in the list."""
    suggestions = []
    for channel, profile in CHANNEL_PROFILES.items():
        fit = 40
        if side in profile['bestFor']:
            fit += 25
        if channel in data.availability.channels:
            fit += 20  # audience is demonstrably here
        if channel in data.advertising.currentChannels:
            fit += 5  # already running
        if data.advertising.monthlyBudget < profile['minBudget']:
            fit -= 30  # can't afford it
        if data.launchHorizonMonths <= 3 and profile['speed'] == 'slow':
            fit -= 20  # too slow to matter

        # Operator commands act as explicit boosts/vetoes.
        commanded = any(channel.replace('-', ' ') in c.lower() for c in data.commands)
        if commanded:
            fit += 15

        suggestions.append({
            'channel': channel,
            'fit': max(0, min(100, fit)),
            **profile,
            'affordable': data.advertising.monthlyBudget >= profile['minBudget'],
            'audiencePresent': channel in data.availability.channels,
            'alreadyRunning': channel in data.advertising.currentChannels,
            'commanded': commanded,
        })
    return sorted(suggestions, key=lambda s: -s['fit'])


def _allocate_budget(suggestions, monthly_budget):
    """Split the budget across the top affordable channels, weighted by fit."""
    if not monthly_budget:
        return []
    top = [s for s in suggestions if s['affordable']][:4]
    total_fit = sum(s['fit'] for s in top)
    if not total_fit:
        return []
    return [
        {
            'channel': s['channel'],
            'amount': js_round((s['fit'] / total_fit) * monthly_budget, 2),
            'sharePercent': js_round((s['fit'] / total_fit) * 100, 1),
        }
        for s in top
    ]


def _build_phasing(suggestions, horizon_months):
    """Sequence channels by how fast they pay off across the launch horizon."""
    affordable = [s for s in suggestions if s['affordable']]

    def channels_with_speed(speed):
        return [s['channel'] for s in affordable if s['speed'] == speed][:2]

    third = js_round(horizon_months / 3)
    two_thirds = js_round((horizon_months * 2) / 3)
    horizon = _fmt(horizon_months)
    return [
        {
            'phase': 1,
            'window': f'Months 1-{max(1, third)}',
            'focus': 'Fast-payback channels to generate early signal',
            'channels': channels_with_speed('fast'),
        },
        {
            'phase': 2,
            'window': f'Months {max(2, third + 1)}-{two_thirds}',
            'focus': 'Medium-speed channels to broaden the funnel',
            'channels': channels_with_speed('medium'),
        },
        {
            'phase': 3,
            'window': f'Months {two_thirds + 1}-{horizon}',
            'focus': 'Compounding channels for durable acquisition',
            'channels': channels_with_speed('slow'),
        },
    ]


def _fmt(n):
    return int(n) if isinstance(n, float) and n.is_integer() else n


def _build_recommendations(data, suggestions):
    out = []
    unaffordable = [s for s in suggestions if not s['affordable'] and s['fit'] > 55]
    if unaffordable:
        out.append(
            f'{", ".join(s["channel"] for s in unaffordable)} fit well but exceed the current budget — '
            'raise spend or defer.')
    if not data.availability.channels:
        out.append('No audience availability data — channel ranking is model-driven only, not evidence-driven.')
    if (data.advertising.currentCac and data.advertising.targetCac
            and data.advertising.currentCac > data.advertising.targetCac):
        out.append(
            f'CAC is {js_round(data.advertising.currentCac - data.advertising.targetCac, 2)} above target — '
            'fix efficiency before scaling spend.')
    if not out:
        out.append(
            f'Lead with {suggestions[0]["channel"] if suggestions else "none"} and layer in compounding '
            'channels from phase 3.')
    return out
