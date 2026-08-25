"""SpyFu integration — competitor keyword & domain analysis.
Port of server/src/integrations/spyfu.js; used by module 6 (MARKET RESEARCH).

Contract: never raises and never blocks the module. When credentials are
absent or the upstream call fails, it returns `live: False` with a
clearly-labelled placeholder so the module still produces a report.
Callers must surface `live` so nobody mistakes placeholder data for real data.
"""
import os
import json
from datetime import datetime, timezone
from urllib.parse import quote
from urllib.request import urlopen

TIMEOUT_SECONDS = 8
BASE_URL = 'https://www.spyfu.com/apis'


def _enabled():
    return bool(os.getenv('SPYFU_API_ID') and os.getenv('SPYFU_SECRET_KEY'))


def _shell(domain, live, note, **rest):
    out = {
        'provider': 'spyfu',
        'domain': domain,
        'live': live,
        'note': note,
        'fetchedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'domainStats': None,
        'topKeywords': [],
        'topCompetitors': [],
    }
    out.update(rest)
    return out


def _get_json(url):
    with urlopen(url, timeout=TIMEOUT_SECONDS) as res:
        if res.status >= 400:
            raise RuntimeError(f'SpyFu responded {res.status}')
        return json.loads(res.read().decode('utf-8'))


def fetch_domain_intelligence(domain, country_code='US', limit=10):
    """Fetch competitor/keyword intelligence for a domain. Always returns;
    check `.live`."""
    if not domain:
        return _shell(domain, False, 'No domain supplied — nothing to analyse.')

    if not _enabled():
        return _shell(
            domain, False,
            'SPYFU_API_ID / SPYFU_SECRET_KEY not configured. Returning placeholder data.',
            **_placeholder_for(domain, limit),
        )

    auth = f'api_id={quote(os.getenv("SPYFU_API_ID", ""))}&secret_key={quote(os.getenv("SPYFU_SECRET_KEY", ""))}'
    d = quote(str(domain))

    try:
        domain_stats = _get_json(
            f'{BASE_URL}/domain_stats_api/v2/getLatestDomainStats?domain={d}&countryCode={country_code}&{auth}')
        keywords = _get_json(
            f'{BASE_URL}/serp_api/v2/seo/getMostValuableKeywords?query={d}&pageSize={limit}&countryCode={country_code}&{auth}')
        competitors = _get_json(
            f'{BASE_URL}/competitors_api/v2/seo/getTopCompetitors?domain={d}&countryCode={country_code}&{auth}')

        stats_results = (domain_stats or {}).get('results') or []
        return _shell(
            domain, True, 'Live SpyFu data.',
            domainStats=stats_results[0] if stats_results else domain_stats,
            topKeywords=((keywords or {}).get('results') or [])[:limit],
            topCompetitors=((competitors or {}).get('results') or [])[:limit],
        )
    except Exception as error:  # Degrade rather than fail the whole report.
        return _shell(
            domain, False,
            f'SpyFu request failed ({error}). Returning placeholder data.',
            **_placeholder_for(domain, limit),
        )


def _placeholder_for(domain, limit):
    """Deterministic stand-in so downstream scoring stays stable without credentials."""
    seed = len(str(domain))
    return {
        'domainStats': {
            'placeholder': True,
            'monthlyOrganicClicks': 1000 * seed,
            'monthlyPaidClicks': 120 * seed,
            'totalOrganicResults': 40 * seed,
        },
        'topKeywords': [
            {
                'placeholder': True,
                'keyword': f'{domain} keyword {i + 1}',
                'searchVolume': 5000 - i * 700,
                'rank': i + 1,
            }
            for i in range(min(limit, 5))
        ],
        'topCompetitors': [
            {
                'placeholder': True,
                'domain': f'competitor-{i + 1}.example.com',
                'overlapScore': 80 - i * 15,
            }
            for i in range(min(limit, 3))
        ],
    }
