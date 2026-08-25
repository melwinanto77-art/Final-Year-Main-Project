"""MODULE 3 — MARKET SIZE (port of server/src/modules/marketSize.js)
Three tiers, each a conversion of the one above:
  TAM — everyone who could buy
  SAM — everyone you can actually serve
  SOM — customers you can realistically win

Channel coverage is capped at 100%: a mix that sums above 100 would
otherwise produce a SOM larger than the SAM it derives from.
"""
import math
from typing import Optional
from pydantic import BaseModel, Field

from scoring import clamp, js_round, normalize, band

KEY = 'marketSize'
TITLE = 'Market Size'
ACTION = 'MAPPING'


class ChannelMix(BaseModel):
    direct: float = Field(default=0, ge=0, le=100)
    partner: float = Field(default=0, ge=0, le=100)
    online: float = Field(default=0, ge=0, le=100)


class InputSchema(BaseModel):
    tam: float = Field(gt=0, description='TAM must be greater than zero')
    currency: str = 'USD'
    samPercent: float = Field(ge=0, le=100)
    channelMix: ChannelMix = ChannelMix()
    conversionRate: float = Field(ge=0, le=100)
    averageContractValue: Optional[float] = Field(default=None, ge=0)


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})

    sam = js_round(data.tam * (data.samPercent / 100))

    channel_total = data.channelMix.direct + data.channelMix.partner + data.channelMix.online
    # Coverage is capped: you cannot reach more than all of your serviceable market.
    coverage = min(1, channel_total / 100)
    coverage_capped = channel_total > 100

    som = js_round(sam * coverage * (data.conversionRate / 100))

    sam_share_of_tam = js_round((sam / data.tam) * 100, 1)
    som_share_of_sam = js_round((som / sam) * 100, 1) if sam else 0
    som_share_of_tam = js_round((som / data.tam) * 100, 2)

    # A market is attractive when the obtainable slice is materially large
    # relative to the total, and the funnel isn't purely aspirational.
    capture_score = normalize(som_share_of_tam, 0, 5)
    coverage_score = clamp(coverage * 100)
    conversion_score = normalize(data.conversionRate, 0, 20)
    absolute_score = normalize(math.log10(max(som, 1)), 4, 8)  # $10k -> $100M

    score = js_round(
        capture_score * 0.3 + coverage_score * 0.2 + conversion_score * 0.2 + absolute_score * 0.3
    )

    estimated_customers = (
        math.floor(som / data.averageContractValue) if data.averageContractValue else None
    )

    return {
        'score': score,
        'output': {
            'currency': data.currency,
            'tiers': {
                'tam': {'value': data.tam, 'label': 'Total Addressable Market', 'shareOfTam': 100},
                'sam': {'value': sam, 'label': 'Serviceable Available Market', 'shareOfTam': sam_share_of_tam},
                'som': {'value': som, 'label': 'Serviceable Obtainable Market', 'shareOfTam': som_share_of_tam},
            },
            'conversions': {
                'tamToSam': f'{_fmt(data.samPercent)}%',
                'samToSom': f'{som_share_of_sam}%',
                'channelCoverage': f'{js_round(coverage * 100)}%',
                'conversionRate': f'{_fmt(data.conversionRate)}%',
            },
            'channelMix': {
                'direct': data.channelMix.direct,
                'partner': data.channelMix.partner,
                'online': data.channelMix.online,
                'total': channel_total,
                'capped': coverage_capped,
            },
            'estimatedCustomers': estimated_customers,
            'attractiveness': band(score),
            'breakdown': {
                'captureScore': capture_score,
                'coverageScore': coverage_score,
                'conversionScore': conversion_score,
                'absoluteScore': absolute_score,
            },
            'warnings': _build_warnings(coverage_capped, channel_total, som_share_of_tam, data),
            'summary':
                f'{data.currency} {som:,} obtainable from a {data.currency} {_fmt_locale(data.tam)} '
                f'total market ({som_share_of_tam}% capture).',
        },
    }


def _fmt(n):
    """Render 18.0 as '18' the way JS template literals do."""
    return int(n) if isinstance(n, float) and n.is_integer() else n


def _fmt_locale(n):
    n = _fmt(n)
    return f'{n:,}'


def _build_warnings(coverage_capped, channel_total, som_share_of_tam, data):
    warnings = []
    if coverage_capped:
        warnings.append(
            f'Channel mix sums to {_fmt(channel_total)}%. Coverage was capped at 100% — SOM cannot exceed SAM.')
    if 0 < channel_total < 100:
        warnings.append(
            f'Channel mix sums to {_fmt(channel_total)}%, leaving {_fmt(100 - channel_total)}% of SAM unreached.')
    if data.conversionRate > 25:
        warnings.append(
            f'A {_fmt(data.conversionRate)}% conversion rate is well above typical — verify the assumption.')
    if som_share_of_tam > 10:
        warnings.append(
            f'Capturing {som_share_of_tam}% of TAM implies near-monopoly share — stress-test the model.')
    return warnings
