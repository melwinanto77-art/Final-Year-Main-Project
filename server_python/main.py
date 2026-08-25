"""The Conscious Orbit — FastAPI backend.

A full port of the Express/Mongo engine in server/: the same ten calculator
modules, the same two coupled state machines, the same gated advance, and
the same response envelopes — backed by Postgres (SQLite fallback) instead
of MongoDB. Identical frontend calls now produce identical analyses against
either backend.

Run:  uvicorn main:app --reload --port 8000
"""
import os
import time
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import Base, engine, get_db, DB_TYPE
from errors import ApiError
from models import (
    ReportModel, ModuleResultModel, ClientModel, DomainModel,
    VERTICALS,
)
from state import (
    REPORT_STATUSES, PIPELINE_STAGES,
    assert_transition, step, next_status, previous_status,
    action_for_status, missing_modules_for_stage, require_stage_complete,
    pipeline_progress,
)
from modules import get_module, module_catalogue, run_module
from scoring import verdict
from routers.orbita import router as orbita_router
from routers.review import router as review_router
from routers.documents import router as documents_router
from routers.queries import router as queries_router
from routers.brand_equity import router as brand_equity_router
from routers.assessment import router as assessment_router
from routers.auth_routes import router as auth_router
from auth import current_user, is_admin, owner_email, require_admin, require_user, seed_default_users
from strength import score_band, data_band
from integrations.email import build_report_docx

Base.metadata.create_all(bind=engine)

# Create the known admin/client accounts on first run so sign-in works out of
# the box. Existing users are left alone.
try:
    from database import SessionLocal as _SessionLocal

    with _SessionLocal() as _session:
        _created = seed_default_users(_session)
        if _created:
            logging.getLogger('conscious_orbit_api').info(
                '[auth] seeded default accounts: %s', ', '.join(_created)
            )
except Exception as _exc:  # never block startup on seeding
    logging.getLogger('conscious_orbit_api').warning('[auth] could not seed accounts: %s', _exc)

# Say plainly at boot which integrations are live. Every one of these degrades
# to a working fallback, so a missing key is easy to miss otherwise.
_log = logging.getLogger('conscious_orbit_api')
_log.info(
    '[ai] gemini: %s',
    os.getenv('GEMINI_MODEL', 'gemini-3.6-flash') if os.getenv('GEMINI_API_KEY')
    else 'DISABLED - set GEMINI_API_KEY in server_python/.env for reasoned analysis '
         '(scores are unaffected)',
)
_log.info(
    '[email] smtp: %s',
    os.getenv('SMTP_HOST') if os.getenv('SMTP_HOST')
    else 'DISABLED - approved-report emails are logged, not sent',
)
_log.info(
    '[spyfu] competitor data: %s',
    'live' if os.getenv('SPYFU_API_ID') else 'placeholder (no credentials)',
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('conscious_orbit_api')

START_TIME = time.time()

app = FastAPI(
    title='The Conscious Orbit - Python FastAPI Backend',
    description='FastAPI port of the full intelligence pipeline (ten modules, gated state machine).',
    version='3.0.0',
)

cors_origin = os.getenv('CORS_ORIGIN', '*')
allow_origins = ['*'] if cors_origin == '*' else [o.strip() for o in cors_origin.split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=cors_origin != '*',
    allow_methods=['*'],
    allow_headers=['*'],
)


# ---------- error envelopes (match server/src/middleware/errorHandler.js) ----------

@app.exception_handler(ApiError)
async def api_error_handler(_request: Request, exc: ApiError):
    body = {
        'error': 'ServerError' if exc.status_code >= 500 else 'RequestError',
        'message': exc.message,
    }
    if exc.details is not None:
        body['details'] = exc.details
    return JSONResponse(status_code=exc.status_code, content=body)


def _validation_response(errors):
    return JSONResponse(
        status_code=422,
        content={
            'error': 'ValidationError',
            'message': 'Request payload failed validation',
            'issues': [
                {
                    'path': '.'.join(str(p) for p in e.get('loc', []) if p != 'body'),
                    'message': e.get('msg', ''),
                    'code': e.get('type', ''),
                }
                for e in errors
            ],
        },
    )


@app.exception_handler(ValidationError)
async def pydantic_error_handler(_request: Request, exc: ValidationError):
    return _validation_response(exc.errors())


@app.exception_handler(RequestValidationError)
async def request_validation_handler(_request: Request, exc: RequestValidationError):
    return _validation_response(exc.errors())


# ---------- routers ----------

app.include_router(orbita_router)
app.include_router(review_router)
app.include_router(documents_router)
app.include_router(queries_router)
app.include_router(brand_equity_router)
app.include_router(assessment_router)
app.include_router(auth_router)


# ---------- request schemas ----------

class ClientPayload(BaseModel):
    company: str
    industry: Optional[str] = None
    stage: Optional[str] = None
    geography: Optional[str] = None
    businessModel: Optional[str] = None
    contact: Optional[str] = None
    # Delivery address for the approved report. Without this the review step
    # cannot email the client their strategy document.
    email: Optional[str] = None


class ReportCreateSchema(BaseModel):
    name: str
    vertical: str = 'startups'
    clientId: Optional[str] = None
    client: Optional[ClientPayload] = None
    tags: List[str] = []
    tracks: List[str] = []
    customModules: List[str] = []
    clusters: Optional[Dict[str, Any]] = None
    intakeData: Optional[Dict[str, Any]] = None


class StatusChangeSchema(BaseModel):
    status: str
    note: Optional[str] = None


class NoteSchema(BaseModel):
    note: Optional[str] = None


class CustomDomainSchema(BaseModel):
    name: str
    description: Optional[str] = ''


# ---------- helpers ----------

def _new_id(prefix):
    return f'{prefix}_{uuid.uuid4().hex[:12]}'


def _now():
    return datetime.now(timezone.utc)


def _load_report(db: Session, report_id: str) -> ReportModel:
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise ApiError.not_found('Report')
    return report


def _record_transition(report: ReportModel, to: str, note: Optional[str]):
    """Port of Report.recordTransition — append to history, move status+action."""
    entry = {
        'from': report.status,
        'to': to,
        'action': action_for_status(to),
        'at': _now().isoformat().replace('+00:00', 'Z'),
        'note': note,
    }
    report.transitions = [*(report.transitions or []), entry]
    report.status = to
    report.action = action_for_status(to)
    if to == 'PUBLISHED':
        report.published_at = _now()


def _mark_module_complete(report: ReportModel, module_key: str):
    completed = report.completed_modules or []
    if module_key not in completed:
        report.completed_modules = [*completed, module_key]


def _client_for(db: Session, report: ReportModel):
    if not report.client_id:
        return None
    return db.query(ClientModel).filter(ClientModel.id == report.client_id).first()


def _client_email_for(db: Session, report: ReportModel):
    """The email that owns a report, or None when no client is attached."""
    if not report.client_id:
        return None
    client = db.query(ClientModel).filter(ClientModel.id == report.client_id).first()
    return (client.email or client.contact or '').strip().lower() if client else None


def _assert_can_read_report(db: Session, report: ReportModel, user):
    """Admins read everything; a client only their own reports.

    The comparison uses the email inside the caller's token, so passing
    somebody else's address as a parameter achieves nothing.
    """
    if is_admin(user):
        return
    email = owner_email(user)
    if not email or _client_email_for(db, report) != email:
        raise ApiError(403, 'This report belongs to another account.')


def _report_json(db: Session, report: ReportModel):
    """Report JSON plus its strength banding.

    `scoreBand` bands the result; `dataBand` bands the evidence behind it,
    so a confident number can't hide a nearly-empty intake. Both are added
    on read, leaving the stored shape untouched.
    """
    payload = report.to_json(client=_client_for(db, report))
    effective_score = payload.get('adminScore')
    if effective_score is None:
        effective_score = payload.get('score') or 0
    payload['scoreBand'] = score_band(effective_score)
    payload['dataBand'] = data_band(payload)
    return payload


def _pipeline_view(report: ReportModel):
    """Port of buildPipelineView — status + action + gate projection."""
    missing = missing_modules_for_stage(report.status, report.completed_modules or [])
    status_idx = REPORT_STATUSES.index(report.status) if report.status in REPORT_STATUSES else -1
    return {
        'status': report.status,
        'action': action_for_status(report.status),
        'progressPercent': pipeline_progress(report.status),
        'canAdvance': bool(next_status(report.status)) and not missing,
        'canRevert': bool(previous_status(report.status)),
        'nextStatus': next_status(report.status),
        'previousStatus': previous_status(report.status),
        'missingModules': missing,
        'completedModules': report.completed_modules or [],
        'stages': [
            {
                **stage,
                'reached': status_idx >= REPORT_STATUSES.index(stage['status']),
                'current': stage['status'] == report.status,
            }
            for stage in PIPELINE_STAGES
        ],
        'transitions': report.transitions or [],
    }


# ---------- root + health + pipeline + catalogue ----------

@app.get('/')
def read_root():
    return {
        'status': 'online',
        'service': 'The Conscious Orbit - Python FastAPI Backend',
        'db_type': DB_TYPE,
        'docs_url': '/docs',
        'api_health': '/api/health',
    }


@app.get('/api/health')
def api_health():
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        db_state = 'connected'
    except Exception:
        db_state = 'disconnected'
    # `ok`/`db: connected|disconnected` matches the Express health shape;
    # `status`/`service` keep older FastAPI consumers working.
    return {
        'ok': db_state == 'connected',
        'status': 'ok',
        'db': db_state,
        'dbType': DB_TYPE,
        'service': f'Python FastAPI + {DB_TYPE}',
        'integrations': {
            'gemini': bool(os.getenv('GEMINI_API_KEY')),
            'geminiModel': os.getenv('GEMINI_MODEL', 'gemini-3.6-flash'),
            'smtp': bool(os.getenv('SMTP_HOST')),
            'spyfu': bool(os.getenv('SPYFU_API_ID') and os.getenv('SPYFU_SECRET_KEY')),
        },
        'uptimeSeconds': round(time.time() - START_TIME),
    }


@app.get('/api/pipeline')
def get_pipeline_definition():
    return {'statuses': REPORT_STATUSES, 'stages': PIPELINE_STAGES}


@app.get('/api/modules')
def list_modules():
    return {'modules': module_catalogue()}


# ---------- reports ----------

@app.post('/api/reports', status_code=201)
def create_report(payload: ReportCreateSchema, db: Session = Depends(get_db),
                  user=Depends(require_user)):
    if payload.vertical not in VERTICALS:
        raise ApiError.bad_request(
            f'Unknown vertical "{payload.vertical}". Expected one of: {", ".join(VERTICALS)}')

    client_id = payload.clientId
    if not client_id and payload.client:
        """Ownership follows the signed-in account, never the form field.

        A client used to be able to type any address here, which set the
        report's owner to someone else — so their own submission became
        invisible to them the moment access control started filtering by
        account. The typed value is kept as the contact name."""
        if not is_admin(user):
            payload.client.email = owner_email(user)
        client = ClientModel(
            id=_new_id('client'),
            company=payload.client.company,
            vertical=payload.vertical,
            industry=payload.client.industry,
            stage=payload.client.stage or 'Idea',
            geography=payload.client.geography,
            business_model=payload.client.businessModel or 'B2B',
            contact=(payload.client.contact or '').lower() or None,
            email=(payload.client.email or '').strip().lower() or None,
        )
        db.add(client)
        client_id = client.id

    report = ReportModel(
        id=_new_id('r'),
        name=payload.name,
        vertical=payload.vertical,
        client_id=client_id,
        tags=payload.tags,
        tracks=payload.tracks,
        custom_modules=payload.customModules,
        clusters=payload.clusters or {},
        intake_data=payload.intakeData or {},
        status='RECEIVED',
        action=action_for_status('RECEIVED'),
        score=0,
        decision=None,
        completed_modules=[],
        transitions=[{
            'from': None,
            'to': 'RECEIVED',
            'action': action_for_status('RECEIVED'),
            'at': _now().isoformat().replace('+00:00', 'Z'),
            'note': 'Report created',
        }],
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {'report': _report_json(db, report)}


@app.get('/api/reports')
def list_reports(
    status: Optional[str] = None,
    vertical: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50),
    skip: int = Query(0),
    db: Session = Depends(get_db),
    user=Depends(require_user),
):
    if status and status not in REPORT_STATUSES:
        raise ApiError.bad_request(f'Unknown status "{status}"')

    query = db.query(ReportModel)
    if status:
        query = query.filter(ReportModel.status == status)
    if vertical:
        query = query.filter(ReportModel.vertical == vertical)

    rows = query.order_by(ReportModel.created_at.desc()).all()

    # A client only ever sees their own submissions. Scoped here rather than
    # by a request parameter so it cannot be bypassed.
    if not is_admin(user):
        email = owner_email(user)
        rows = [r for r in rows if _client_email_for(db, r) == email] if email else []

    if search:
        needle = search.lower()
        rows = [
            r for r in rows
            if needle in (r.name or '').lower()
            or needle in (r.vertical or '').lower()
            or any(needle in str(t).lower() for t in (r.tags or []))
        ]

    total = len(rows)
    limit = min(int(limit), 200)
    skip = int(skip)
    page = rows[skip:skip + limit]

    return {
        'reports': [_report_json(db, r) for r in page],
        'total': total,
        'limit': limit,
        'skip': skip,
    }


@app.get('/api/reports/{report_id}')
def get_report(report_id: str, db: Session = Depends(get_db), user=Depends(require_user)):
    report = _load_report(db, report_id)
    _assert_can_read_report(db, report, user)
    results = db.query(ModuleResultModel).filter(ModuleResultModel.report_id == report.id).all()
    return {
        'report': _report_json(db, report),
        'moduleResults': {r.module_key: r.to_json() for r in results},
        'pipeline': _pipeline_view(report),
    }


@app.get('/api/reports/{report_id}/pipeline')
def get_report_pipeline(report_id: str, db: Session = Depends(get_db), user=Depends(require_user)):
    report = _load_report(db, report_id)
    _assert_can_read_report(db, report, user)
    return {'pipeline': _pipeline_view(report)}


@app.patch('/api/reports/{report_id}/status')
def set_status(report_id: str, payload: StatusChangeSchema, db: Session = Depends(get_db),
               user=Depends(require_admin)):
    report = _load_report(db, report_id)
    assert_transition(report.status, payload.status)
    _record_transition(report, payload.status, payload.note)
    db.commit()
    db.refresh(report)
    return {'report': _report_json(db, report), 'pipeline': _pipeline_view(report)}


@app.post('/api/reports/{report_id}/advance')
def advance_report(report_id: str, payload: Optional[NoteSchema] = None, db: Session = Depends(get_db),
                   user=Depends(require_admin)):
    report = _load_report(db, report_id)
    # The gate: every module the current stage owns must have a stored result
    # before the report may move on — 409 lists the missing keys.
    require_stage_complete(report)
    to = step(report.status, 1)
    _record_transition(report, to, (payload.note if payload else None) or 'Advanced one stage')
    db.commit()
    db.refresh(report)
    return {'report': _report_json(db, report), 'pipeline': _pipeline_view(report)}


@app.post('/api/reports/{report_id}/revert')
def revert_report(report_id: str, payload: Optional[NoteSchema] = None, db: Session = Depends(get_db),
                  user=Depends(require_admin)):
    report = _load_report(db, report_id)
    to = step(report.status, -1)
    _record_transition(report, to, (payload.note if payload else None) or 'Reverted one stage')
    db.commit()
    db.refresh(report)
    return {'report': _report_json(db, report), 'pipeline': _pipeline_view(report)}


@app.delete('/api/reports/{report_id}', status_code=204)
def delete_report(report_id: str, db: Session = Depends(get_db), user=Depends(require_admin)):
    report = _load_report(db, report_id)
    db.query(ModuleResultModel).filter(ModuleResultModel.report_id == report.id).delete()
    db.delete(report)
    db.commit()
    return Response(status_code=204)


# ---------- modules ----------

@app.post('/api/reports/{report_id}/modules/{module_key}')
def execute_module(report_id: str, module_key: str, body: Optional[Dict[str, Any]] = None,
                   db: Session = Depends(get_db), user=Depends(require_admin)):
    report = _load_report(db, report_id)
    mod = get_module(module_key)
    if not mod:
        raise ApiError.not_found(f'Module "{module_key}"')

    # Sibling results are context for the modules that consolidate (7 and 8).
    existing = db.query(ModuleResultModel).filter(ModuleResultModel.report_id == report.id).all()
    module_results = {r.module_key: r.to_json() for r in existing}

    outcome = run_module(module_key, body or {}, {
        'report': _report_json(db, report),
        'moduleResults': module_results,
    })
    output = outcome.get('output')
    score = outcome.get('score')
    integrations = outcome.get('integrations') or {}

    # Upsert: one result per (report, module) — re-running overwrites.
    result = db.query(ModuleResultModel).filter(
        ModuleResultModel.report_id == report.id,
        ModuleResultModel.module_key == module_key,
    ).first()
    if not result:
        result = ModuleResultModel(id=_new_id('mr'), report_id=report.id, module_key=module_key)
        db.add(result)
    result.input = body or {}
    result.output = output
    result.score = score
    result.action = mod.ACTION
    result.integrations = integrations

    _mark_module_complete(report, module_key)

    # Module 7 is the consolidator — its verdict becomes the report's own score.
    if module_key == 'industryReport':
        v = verdict(output['orbitalScore'])
        decision = output.get('decision') or {}
        report.score = decision.get('score', v['score'])
        report.decision = decision.get('decision', v['decision'])

    db.commit()
    db.refresh(result)
    db.refresh(report)
    return {'result': result.to_json(), 'report': _report_json(db, report)}


@app.get('/api/reports/{report_id}/modules')
def list_module_results(report_id: str, db: Session = Depends(get_db), user=Depends(require_user)):
    report = _load_report(db, report_id)
    _assert_can_read_report(db, report, user)
    results = (
        db.query(ModuleResultModel)
        .filter(ModuleResultModel.report_id == report.id)
        .order_by(ModuleResultModel.created_at.asc())
        .all()
    )
    return {
        'results': {r.module_key: r.to_json() for r in results},
        'completed': [r.module_key for r in results],
    }


@app.get('/api/reports/{report_id}/modules/{module_key}')
def get_module_result(report_id: str, module_key: str, db: Session = Depends(get_db), user=Depends(require_user)):
    report = _load_report(db, report_id)
    _assert_can_read_report(db, report, user)
    if not get_module(module_key):
        raise ApiError.not_found(f'Module "{module_key}"')
    result = db.query(ModuleResultModel).filter(
        ModuleResultModel.report_id == report.id,
        ModuleResultModel.module_key == module_key,
    ).first()
    if not result:
        raise ApiError.not_found(f'Result for module "{module_key}"')
    return {'result': result.to_json()}


@app.delete('/api/reports/{report_id}/modules/{module_key}', status_code=204)
def delete_module_result(report_id: str, module_key: str, db: Session = Depends(get_db),
                         user=Depends(require_admin)):
    report = _load_report(db, report_id)
    result = db.query(ModuleResultModel).filter(
        ModuleResultModel.report_id == report.id,
        ModuleResultModel.module_key == module_key,
    ).first()
    if not result:
        raise ApiError.not_found(f'Result for module "{module_key}"')
    db.delete(result)
    report.completed_modules = [k for k in (report.completed_modules or []) if k != module_key]
    db.commit()
    return Response(status_code=204)


# ---------- report .docx download ----------

@app.get('/api/reports/{report_id}/report.docx')
def download_report_docx(report_id: str, db: Session = Depends(get_db),
                         user=Depends(require_user)):
    """The report as a real Office Open XML .docx, streamed back.

    This is how an approved report reaches the client, so a client may fetch
    their own — but only their own. Usable before publish (previews the
    current draft, admin only in practice) and after (permanent artifact).
    """
    report = _load_report(db, report_id)
    _assert_can_read_report(db, report, user)
    client = _client_for(db, report)
    buf = build_report_docx(
        report.to_json(client=client),
        client.to_json() if client else None,
    )
    slug = ''.join(c if c.isalnum() or c == '-' else '-' for c in (report.name or 'venture').lower()).strip('-') or 'venture'
    return Response(
        content=buf.read(),
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        headers={'Content-Disposition': f'attachment; filename="{slug}-strategy-report.docx"'},
    )


# ---------- custom domains (kept from the original shim) ----------

@app.get('/api/domains')
def list_domains(db: Session = Depends(get_db)):
    domains = db.query(DomainModel).all()
    return {'domains': [{'id': d.id, 'name': d.name, 'description': d.description} for d in domains]}


@app.post('/api/domains')
def create_domain(payload: CustomDomainSchema, db: Session = Depends(get_db)):
    d = DomainModel(id=_new_id('domain'), name=payload.name, description=payload.description)
    db.add(d)
    db.commit()
    return {'domain': {'id': d.id, 'name': d.name, 'description': d.description}}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=True)
