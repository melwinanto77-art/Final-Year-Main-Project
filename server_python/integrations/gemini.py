"""Gemini client — the platform's AI provider.

Speaks the REST API directly through urllib so no SDK dependency is needed,
and keeps the contract every caller relies on: it never raises. A missing
GEMINI_API_KEY, a network failure or an unparseable answer all return
`None`, and the caller falls back to its deterministic heuristic.

Two API generations are supported because the structured-output shape moved:

  * Gemini 3.x  — generationConfig.responseFormat.text.{mimeType, schema}
  * Gemini <=2.x — generationConfig.responseMimeType + responseSchema

The generation is detected from the model name, and a failed request is
retried once with the other shape, so pointing GEMINI_MODEL at an older
model keeps working without a code change.

Gemini 3 also warns explicitly against lowering `temperature` — doing so
causes looping and degraded reasoning — so the default (1.0) is left alone
for 3.x and only set for the older models that benefited from it.

Env:
  GEMINI_API_KEY  — required for live answers
  GEMINI_MODEL    — defaults to gemini-3.6-flash (latest GA)
"""
import json
import os
import urllib.error
import urllib.request

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
TIMEOUT_SECONDS = 60

DEFAULT_MODEL = "gemini-3.6-flash"

# Gemini's structured-output schema dialect is a subset of JSON Schema: it
# rejects these keys outright, so they are stripped before sending.
_UNSUPPORTED = {"additionalProperties", "$schema", "default", "examples", "title"}


def model_name():
    return os.getenv("GEMINI_MODEL", DEFAULT_MODEL)


def enabled():
    return bool(os.getenv("GEMINI_API_KEY"))


def _is_gemini_3_or_newer(model):
    """True for gemini-3.x and anything above it."""
    name = (model or "").lower()
    if not name.startswith("gemini-"):
        return False
    version = name[len("gemini-"):].split("-")[0]
    try:
        return float(version.split(".")[0]) >= 3
    except ValueError:
        return False


def _to_gemini_schema(schema):
    """Translate a JSON Schema into the shape Gemini accepts."""
    if not isinstance(schema, dict):
        return schema
    out = {}
    for key, value in schema.items():
        if key in _UNSUPPORTED:
            continue
        if key == "type" and isinstance(value, str):
            out["type"] = value.upper()
        elif key == "properties" and isinstance(value, dict):
            out["properties"] = {k: _to_gemini_schema(v) for k, v in value.items()}
        elif key == "items":
            out["items"] = _to_gemini_schema(value)
        elif key == "enum":
            # Gemini only supports enums on strings.
            out["enum"] = [str(v) for v in value]
            out.setdefault("type", "STRING")
        else:
            out[key] = value
    if out.get("enum") and out.get("type") not in (None, "STRING"):
        out["type"] = "STRING"
    return out


def _json_config(schema, max_output_tokens, modern):
    """generationConfig for a structured-JSON request."""
    gemini_schema = _to_gemini_schema(schema)
    config = {"maxOutputTokens": max_output_tokens}

    if modern:
        # Gemini 3+: nested responseFormat, and temperature left at its
        # default — lowering it degrades reasoning on these models.
        config["responseFormat"] = {
            "text": {"mimeType": "application/json", "schema": gemini_schema}
        }
    else:
        config["temperature"] = 0.2
        config["responseMimeType"] = "application/json"
        config["responseSchema"] = gemini_schema

    return config


def _post(model, payload):
    """POST to generateContent. Returns the parsed body, or None on failure."""
    request = urllib.request.Request(
        f"{BASE_URL}/{model}:generateContent?key={os.getenv('GEMINI_API_KEY', '')}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        return None


def _extract_text(body):
    """Pull the text out of a candidate. A safety block leaves no parts."""
    try:
        candidate = (body.get("candidates") or [])[0]
        parts = (candidate.get("content") or {}).get("parts") or []
        return "".join(p.get("text", "") for p in parts).strip() or None
    except Exception:
        return None


def generate_json(system_prompt, user_prompt, schema, max_output_tokens=8192):
    """Ask Gemini for a JSON object matching `schema`.

    Returns {'data': dict, 'model': str} on success, or None on any failure
    (no key, network error, refusal, unparseable output) so callers can fall
    back to their heuristic path.
    """
    if not enabled():
        return None

    model = model_name()
    base = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
    }

    # Try the shape that matches the model, then the other one — so an
    # unexpected model generation still gets a live answer.
    modern_first = _is_gemini_3_or_newer(model)
    for modern in (modern_first, not modern_first):
        body = _post(model, {**base, "generationConfig": _json_config(schema, max_output_tokens, modern)})
        if not body:
            continue
        text = _extract_text(body)
        if not text:
            continue
        try:
            return {"data": json.loads(text), "model": model}
        except json.JSONDecodeError:
            continue

    return None


def generate_text(system_prompt, user_prompt, max_output_tokens=2048):
    """Plain-text generation for narrative helpers. Returns a string or None."""
    if not enabled():
        return None

    model = model_name()
    config = {"maxOutputTokens": max_output_tokens}
    if not _is_gemini_3_or_newer(model):
        config["temperature"] = 0.3

    body = _post(model, {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": config,
    })
    return _extract_text(body) if body else None
