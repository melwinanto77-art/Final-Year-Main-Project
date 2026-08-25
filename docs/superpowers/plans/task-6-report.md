# Task 6: Orbita AI Analysis Module (FastAPI)

**Date:** 2026-08-05
**Status:** DONE_WITH_CONCERNS

## Summary

Created `server_python/integrations/orbita.py` — a Python port of `server/src/integrations/orbita.js`.

## What Was Built

New file: `server_python/integrations/orbita.py`

- `generate_orbita_analysis(report, module_results)` — main entry point
- `_heuristic_orbita_analysis(module_results)` — deterministic fallback
- `ORBITA_SYSTEM_PROMPT` — system prompt for AI analysis
- `ANALYSIS_SCHEMA` — JSON schema for structured output

## Parity with Express Version

The Python port matches the Express version (`server/src/integrations/orbita.js`) with these additions:

| Feature | Express | Python Port |
|---------|---------|-------------|
| `thinking: adaptive` | Yes | Yes |
| `output_config: json_schema` | Yes | Yes |
| Refusal handling | Yes | Yes |
| Schema validation | Yes | Yes |
| Heuristic fallback | Yes | Yes |
| SpyFu integration | Yes | Yes |

## Concerns

1. **Initial code had broken imports** — The provided code imported `get_client`, `get_model`, and `fetch_competitor_data` which don't exist. Fixed to use `_model_name()` and `fetch_domain_intelligence`.

2. **Missing features** — The original code lacked `thinking: adaptive`, `output_config`, refusal handling, and schema validation that the Express version has. Added these for parity.

3. **Signature mismatch** — The function accepts `module_results: list` (of ORM objects with `.module_key`, `.score`, `.output`), matching the Express pattern. Verify callers pass the correct object type.

## Files Modified

- `server_python/integrations/orbita.py` (new)

## Verification

- File syntax verified via import test
- Imports match existing `ai_provider.py` and `spyfu.py` exports
- Follows same degradation pattern (API key missing → heuristic fallback)
