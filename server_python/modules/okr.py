"""MODULE 10 — OKR / OBJECTIVES AND KEY RESULTS
(port of server/src/modules/okr.js)
Goal-setting and tracking framework. Sets the framework for each objective
and tracks achievement, so the customer actually finishes what they started.
"""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field

from scoring import js_round, clamp, band

KEY = 'okr'
TITLE = 'Objectives & Key Results'
ACTION = 'MAPPING'

KR_STATUSES = ['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED']


class KeyResult(BaseModel):
    id: Optional[str] = None
    description: str = Field(min_length=3)
    metric: str = Field(min_length=1)
    baseline: float = 0
    target: float
    current: float = 0
    unit: str = ''
    dueDate: Optional[datetime] = None


class Objective(BaseModel):
    id: Optional[str] = None
    title: str = Field(min_length=3)
    owner: Optional[str] = None
    quarter: Optional[str] = None
    keyResults: List[KeyResult] = Field(min_length=1, description='An objective needs at least one key result')


class InputSchema(BaseModel):
    objectives: List[Objective] = Field(min_length=1, description='Supply at least one objective')
    # Enforce that objectives are closed out, not abandoned.
    enforceCompletion: bool = True
    asOf: Optional[datetime] = None


def _iso(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def run(raw_input, context=None):
    data = InputSchema.model_validate(raw_input or {})
    as_of = data.asOf or datetime.now(timezone.utc)
    if as_of.tzinfo is None:
        as_of = as_of.replace(tzinfo=timezone.utc)

    objectives = []
    for oi, objective in enumerate(data.objectives):
        key_results = [_score_key_result(kr, ki, as_of) for ki, kr in enumerate(objective.keyResults)]
        # Objective progress is the mean of its key results — standard OKR practice.
        progress = js_round(sum(kr['progress'] for kr in key_results) / len(key_results), 1)

        objectives.append({
            'id': objective.id or f'obj-{oi + 1}',
            'title': objective.title,
            'owner': objective.owner,
            'quarter': objective.quarter,
            'progress': progress,
            'status': _status_for_progress(progress, key_results),
            'achieved': progress >= 100,
            'keyResults': key_results,
            'atRiskCount': len([kr for kr in key_results if kr['status'] in ('AT_RISK', 'OFF_TRACK')]),
        })

    overall_progress = js_round(sum(o['progress'] for o in objectives) / len(objectives), 1)
    achieved_count = len([o for o in objectives if o['achieved']])

    # The score *is* the tracked progress — this module measures follow-through.
    score = clamp(js_round(overall_progress))

    if data.enforceCompletion:
        enforcement = {
            'enabled': True,
            'unfinished': [o['title'] for o in objectives if not o['achieved']],
            'message': (
                'All objectives achieved.'
                if achieved_count == len(objectives)
                else f'{len(objectives) - achieved_count} objective(s) remain open — the cycle cannot '
                     'be closed until they are achieved or formally dropped.'
            ),
        }
    else:
        enforcement = {'enabled': False}

    return {
        'score': score,
        'output': {
            'asOf': _iso(as_of),
            'framework': {
                'objectiveCount': len(objectives),
                'keyResultCount': sum(len(o['keyResults']) for o in objectives),
                'cadence': 'quarterly',
            },
            'overallProgress': overall_progress,
            'achievedObjectives': achieved_count,
            'completionRate': js_round((achieved_count / len(objectives)) * 100, 1),
            'objectives': objectives,
            'blockers': [
                {'objective': o['title'], 'keyResult': kr['description'], 'gap': kr['gap']}
                for o in objectives
                for kr in o['keyResults']
                if kr['status'] == 'OFF_TRACK'
            ],
            'health': band(score),
            'enforcement': enforcement,
            'summary': f'{overall_progress}% overall progress; {achieved_count}/{len(objectives)} objectives achieved.',
            'recommendations': _build_recommendations(objectives, overall_progress),
        },
    }


def _score_key_result(kr, index, as_of):
    span = kr.target - kr.baseline
    # Guard the degenerate case where target == baseline.
    if span == 0:
        progress = 100 if kr.current >= kr.target else 0
    else:
        progress = clamp(js_round(((kr.current - kr.baseline) / span) * 100, 1))

    due = kr.dueDate
    if due is not None and due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
    overdue = bool(due and as_of > due and progress < 100)

    if progress >= 100:
        status = 'ACHIEVED'
    elif progress == 0:
        status = 'NOT_STARTED'
    elif overdue or progress < 30:
        status = 'OFF_TRACK'
    elif progress < 60:
        status = 'AT_RISK'
    else:
        status = 'ON_TRACK'

    return {
        'id': kr.id or f'kr-{index + 1}',
        'description': kr.description,
        'metric': kr.metric,
        'unit': kr.unit,
        'baseline': kr.baseline,
        'target': kr.target,
        'current': kr.current,
        'progress': progress,
        'gap': js_round(kr.target - kr.current, 2),
        'dueDate': _iso(due) if due else None,
        'overdue': overdue,
        'status': status,
    }


def _status_for_progress(progress, key_results):
    if progress >= 100:
        return 'ACHIEVED'
    if any(kr['status'] == 'OFF_TRACK' for kr in key_results):
        return 'OFF_TRACK'
    if progress < 60:
        return 'AT_RISK'
    if progress == 0:
        return 'NOT_STARTED'
    return 'ON_TRACK'


def _build_recommendations(objectives, overall_progress):
    out = []
    off_track = [o for o in objectives if o['status'] == 'OFF_TRACK']
    if off_track:
        out.append(f'{len(off_track)} objective(s) off track: {", ".join(o["title"] for o in off_track)}.')
    if overall_progress < 40:
        out.append('Overall progress below 40% — re-scope the objectives or reallocate ownership.')
    unowned = [o for o in objectives if not o['owner']]
    if unowned:
        out.append(f'{len(unowned)} objective(s) have no owner — unowned OKRs do not get finished.')
    if not out:
        out.append('OKR cycle is healthy — maintain the weekly check-in cadence.')
    return out
