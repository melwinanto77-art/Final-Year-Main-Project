"""Scoring primitives — a faithful port of server/src/utils/scoring.js.

Shared by the 10 modules so every 0-100 score is produced the same way and
the final Orbital Score stays comparable across the two backends.
"""
import math


def clamp(n, lo=0, hi=100):
    return min(hi, max(lo, n))


def js_round(n, dp=0):
    """JavaScript Math.round semantics: halves round toward +infinity,
    unlike Python's banker's rounding. Returns int when dp == 0 so the
    JSON output matches the Express server's."""
    f = 10 ** dp
    r = math.floor(n * f + 0.5) / f
    return int(r) if dp == 0 else r


def ratio(numerator, denominator, fallback=0):
    """Safe division — returns `fallback` instead of raising/NaN."""
    return numerator / denominator if denominator else fallback


def weighted_score(parts):
    """Weighted mean of {value, weight} dicts, normalised so the weights
    need not sum to exactly 1. Returns 0 when no weight is supplied."""
    total_weight = sum((p.get('weight') or 0) for p in parts)
    if not total_weight:
        return 0
    total = sum(clamp(p['value']) * (p.get('weight') or 0) for p in parts)
    return js_round(total / total_weight)


def verdict(score, threshold=60):
    """The binary verdict the whole platform funnels toward."""
    s = clamp(js_round(score))
    return {
        'score': s,
        'threshold': threshold,
        'decision': 1 if s >= threshold else 0,
        'label': 'PROCEED' if s >= threshold else 'PIVOT',
    }


def normalize(value, worst, best):
    """Map a raw value onto 0-100 given the range considered worst -> best."""
    if worst == best:
        return 0
    return clamp(js_round(((value - worst) / (best - worst)) * 100))


def band(score):
    """Bucket a 0-100 score into a qualitative band."""
    s = clamp(score)
    if s >= 80:
        return 'STRONG'
    if s >= 60:
        return 'VIABLE'
    if s >= 40:
        return 'MARGINAL'
    return 'WEAK'
