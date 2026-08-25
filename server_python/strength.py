"""Client data strength categorisation — WEAK / MEDIUM / STRONG.

Two different things get banded, and they are deliberately kept apart:

* `score_band()`   — how good the venture scored.
* `data_band()`    — how much evidence the client actually supplied.

A venture can score well on thin data; showing both stops a confident-looking
number from hiding the fact that almost nothing was answered.
"""

BANDS = ('WEAK', 'MEDIUM', 'STRONG')


def band_for(value, weak_below=40, strong_from=70):
    """Generic 0-100 banding used by both helpers and the brand form."""
    try:
        v = float(value or 0)
    except (TypeError, ValueError):
        v = 0
    if v >= strong_from:
        return 'STRONG'
    if v >= weak_below:
        return 'MEDIUM'
    return 'WEAK'


def score_band(score):
    """Band a venture's Orbital/admin score. 70+ strong, 40-69 medium."""
    return band_for(score)


def _filled(value):
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return True


def completeness_percent(report_json):
    """How much of the intake the client actually filled in, 0-100."""
    clusters = report_json.get('clusters') or {}
    market = clusters.get('market') or {}
    viability = clusters.get('viability') or {}
    launch = clusters.get('launch') or {}
    client = report_json.get('client')
    client = client if isinstance(client, dict) else {}

    answers = [
        client.get('company'), client.get('industry'), client.get('stage'),
        client.get('geography'), client.get('businessModel'), client.get('email'),
        market.get('problem'), market.get('pain'), market.get('wtp'), market.get('icp'),
        viability.get('revenue'), viability.get('margin'), viability.get('costs'),
        viability.get('breakeven'),
        launch.get('geography'), launch.get('gtm'), launch.get('milestones'), launch.get('ask'),
    ]
    if not answers:
        return 0
    return round(len([a for a in answers if _filled(a)]) / len(answers) * 100)


def narrative_words(report_json):
    """Total words across the free-text intake answers.

    The intake promises that a richer description produces a better report;
    this is the measure behind that promise.
    """
    clusters = report_json.get('clusters') or {}
    text = []
    for group in ('market', 'viability', 'launch'):
        for value in (clusters.get(group) or {}).values():
            if isinstance(value, str):
                text.append(value)
    return len(' '.join(text).split())


def data_band(report_json):
    """Band the *evidence*: completeness plus how much the client wrote.

    Reaching STRONG needs both a mostly-complete form and a real narrative —
    50 words is the threshold the intake advertises for a richer analysis.
    """
    completeness = completeness_percent(report_json)
    words = narrative_words(report_json)
    word_score = min(100, round(words / 150 * 100))
    combined = round(completeness * 0.6 + word_score * 0.4)
    return {
        'band': band_for(combined),
        'completeness': completeness,
        'words': words,
        'detailScore': combined,
        'enriched': words >= 50,
    }


def _num(value, default=0):
    try:
        return float(value if value is not None else default)
    except (TypeError, ValueError):
        return default


def brand_equity_score(pillars, repeat_rate=0, monthly_customers=0, social_following=0,
                       years_active=0, certifications=None, return_detail=False):
    """Weighted Indian Brand Equity score from the five pillars, capped by proof.

    Pillar weights follow the classic Aaker model as applied in IBEF-style
    assessments: loyalty and perceived quality carry the most.

    Every pillar here is **self-reported** — a founder rating their own brand.
    So each one is capped by the evidence that would have to exist for the
    claim to be true, before it is weighted:

      loyalty           needs repeat customers; without a repeat rate the
                        claim is unevidenced and cannot exceed 35
      perceivedQuality  needs customers who could form that opinion, or a
                        third-party certification
      awareness         needs reach — customers or a social following
      distributionReach needs customers actually buying somewhere
      associations      needs time in market for an association to form

    A brand claiming 100 loyalty with zero repeat customers is therefore
    scored on 35, not 100 — the claim is not evidence. Nothing is capped
    away when the supporting number is supplied, so an honest brand with
    real traction is unaffected.

    Set `return_detail=True` to get the caps that were applied, so the UI can
    explain the score rather than just assert it.
    """
    weights = {
        'awareness': 0.2,
        'perceivedQuality': 0.25,
        'associations': 0.15,
        'loyalty': 0.25,
        'distributionReach': 0.15,
    }

    repeat = max(0, min(100, _num(repeat_rate)))
    customers = max(0, _num(monthly_customers))
    following = max(0, _num(social_following))
    years = max(0, _num(years_active))
    has_certs = bool((certifications or '').strip())

    # Ceiling for each pillar given what the client actually evidenced.
    # `None` means the claim stands on its own.
    caps = {}

    if repeat <= 0:
        caps['loyalty'] = 35        # no repeat customers at all
    elif repeat < 25:
        caps['loyalty'] = 60        # weak repeat behaviour

    if not customers and not has_certs:
        caps['perceivedQuality'] = 40   # nobody has used it, nothing certifies it
    elif not customers:
        caps['perceivedQuality'] = 65   # certified, but unproven in market

    if not customers and following < 500:
        caps['awareness'] = 35      # no reach of any kind
    elif not customers and following < 5000:
        caps['awareness'] = 60

    if not customers:
        caps['distributionReach'] = 40  # nothing is actually being sold

    if years < 1:
        caps['associations'] = 45   # too new for an association to have formed
    elif years < 2:
        caps['associations'] = 70

    total = 0.0
    applied = []
    for key, weight in weights.items():
        claimed = max(0, min(100, _num(pillars.get(key))))
        cap = caps.get(key)
        effective = min(claimed, cap) if cap is not None else claimed
        if cap is not None and claimed > cap:
            applied.append({'pillar': key, 'claimed': round(claimed), 'capped': cap})
        total += effective * weight

    # A small remaining nudge for repeat behaviour above/below the midpoint,
    # so strong evidence is rewarded rather than only weak evidence punished.
    total += (repeat - 50) / 100 * 6

    score = max(0, min(100, round(total)))
    if not return_detail:
        return score
    return {'score': score, 'caps': applied}
