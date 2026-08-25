"""MODULE 5 — PRICING (port of server/src/modules/pricing.js)
Competitive pricing analysis: list the competitors, surface their pricing
models, and position our price against them.
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

from scoring import js_round, normalize, weighted_score, band

KEY = 'pricing'
TITLE = 'Pricing'
ACTION = 'MAPPING'

PRICING_MODELS = [
    'subscription', 'usage-based', 'per-seat', 'one-time',
    'freemium', 'commission', 'tiered', 'custom',
]

PricingModel = Literal['subscription', 'usage-based', 'per-seat', 'one-time',
                       'freemium', 'commission', 'tiered', 'custom']
BillingPeriod = Literal['monthly', 'annual', 'one-time']


class Competitor(BaseModel):
    name: str = Field(min_length=1)
    price: float = Field(ge=0)
    model: PricingModel = 'subscription'
    billingPeriod: BillingPeriod = 'monthly'
    notes: Optional[str] = None
    features: List[str] = []


class InputSchema(BaseModel):
    ourPrice: float = Field(ge=0)
    ourModel: PricingModel = 'subscription'
    ourFeatures: List[str] = []
    currency: str = 'USD'
    competitors: List[Competitor] = Field(min_length=1, description='Supply at least one competitor to compare against')


def _to_monthly(price, billing_period):
    """Normalise every price to a monthly figure so the comparison is like-for-like."""
    if billing_period == 'annual':
        return price / 12
    if billing_period == 'one-time':
        return price / 36  # amortised over 3 years
    return price


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})

    normalised = [
        {**c.model_dump(), 'monthlyPrice': js_round(_to_monthly(c.price, c.billingPeriod), 2)}
        for c in data.competitors
    ]

    prices = sorted(c['monthlyPrice'] for c in normalised)
    n = len(prices)
    median = prices[(n - 1) // 2] if n % 2 else js_round((prices[n // 2 - 1] + prices[n // 2]) / 2, 2)
    mean = js_round(sum(prices) / n, 2)

    delta = js_round(((data.ourPrice - median) / median) * 100, 1) if median else 0
    position = 'BELOW_MARKET' if delta <= -15 else 'ABOVE_MARKET' if delta >= 15 else 'AT_MARKET'

    # Differentiation: which of our features nobody else lists.
    competitor_features = {f.lower() for c in normalised for f in c['features']}
    unique_features = [f for f in data.ourFeatures if f.lower() not in competitor_features]
    parity_features = [f for f in data.ourFeatures if f.lower() in competitor_features]

    # Pricing power comes from differentiation, not from being cheapest.
    differentiation_score = normalize(len(unique_features), 0, 4)
    position_score = 80 if position == 'AT_MARKET' else 65 if position == 'ABOVE_MARKET' else 55
    model_diversity_score = normalize(len({c['model'] for c in normalised}), 1, 4)

    score = weighted_score([
        {'value': differentiation_score, 'weight': 0.45},
        {'value': position_score, 'weight': 0.35},
        {'value': model_diversity_score, 'weight': 0.2},
    ])

    return {
        'score': score,
        'output': {
            'currency': data.currency,
            'ourPrice': data.ourPrice,
            'ourModel': data.ourModel,
            'market': {'min': prices[0], 'max': prices[-1], 'median': median, 'mean': mean, 'sampleSize': n},
            'position': position,
            'deltaFromMedianPercent': delta,
            'competitors': sorted(
                (
                    {
                        'name': c['name'],
                        'price': c['price'],
                        'monthlyPrice': c['monthlyPrice'],
                        'model': c['model'],
                        'billingPeriod': c['billingPeriod'],
                        'cheaperThanUs': c['monthlyPrice'] < data.ourPrice,
                        'notes': c['notes'],
                    }
                    for c in normalised
                ),
                key=lambda c: c['monthlyPrice'],
            ),
            'modelsInMarket': list(dict.fromkeys(c['model'] for c in normalised)),
            'differentiation': {
                'unique': unique_features,
                'parity': parity_features,
                'uniqueCount': len(unique_features),
            },
            'pricingPower': band(score),
            'summary':
                f'Priced {abs(delta)}% {"above" if delta >= 0 else "below"} the {data.currency} {median} '
                f'market median across {n} competitor(s); {len(unique_features)} differentiating feature(s).',
            'recommendations': _build_recommendations(position, delta, unique_features, data),
        },
    }


def _build_recommendations(position, delta, unique_features, data):
    out = []
    if position == 'ABOVE_MARKET' and len(unique_features) == 0:
        out.append(f'Priced {delta}% above median with no differentiating features — justify the premium or reprice.')
    if position == 'BELOW_MARKET' and len(unique_features) >= 2:
        out.append('Underpriced relative to differentiation — there is room to raise price.')
    if len(data.competitors) < 3:
        out.append('Add more competitors: a sample of fewer than 3 makes the median unreliable.')
    if not out:
        out.append('Pricing is defensible against the current competitive set.')
    return out
