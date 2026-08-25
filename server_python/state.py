"""Report state machine + action pipeline — ports of
server/src/state/reportState.js and server/src/state/actionPipeline.js.

RECEIVED -> PENDING -> PROCESSED -> REVIEWING -> PUBLISHED, linear and strictly ordered.
Every transition goes through assert_transition() so an illegal jump is
rejected at the service layer rather than silently written. The action is
the *work being done* while a report sits in a status; completing an action
is what earns the report its next status.
"""
from errors import ApiError

REPORT_STATUSES = ['RECEIVED', 'PENDING', 'PROCESSED', 'REVIEWING', 'PUBLISHED']

INITIAL_STATUS = 'RECEIVED'
TERMINAL_STATUS = 'PUBLISHED'

FORWARD = {
    'RECEIVED': 'PENDING',
    'PENDING': 'PROCESSED',
    'PROCESSED': 'REVIEWING',
    'REVIEWING': 'PUBLISHED',
    'PUBLISHED': None,
}

BACKWARD = {
    'RECEIVED': None,
    'PENDING': 'RECEIVED',
    'PROCESSED': 'PENDING',
    'REVIEWING': 'PROCESSED',
    'PUBLISHED': 'REVIEWING',
}

ACTIONS = ['SCRUMING', 'REQUIREMENT', 'MAPPING', 'ADMIN_REVIEW', 'DELIVERED']

# Ordered stage descriptors — index-aligned with REPORT_STATUSES.
PIPELINE_STAGES = [
    {
        'action': 'SCRUMING',
        'status': 'RECEIVED',
        'note': 'Reviewing business ideas & problem statements',
        'modules': ['customerDiscovery'],
    },
    {
        'action': 'REQUIREMENT',
        'status': 'PENDING',
        'note': 'Gathering customer data & B2B/B2C specs',
        'modules': ['profiling', 'businessModelValidation'],
    },
    {
        'action': 'MAPPING',
        'status': 'PROCESSED',
        'note': 'Defining TAM/SAM/SOM conversions',
        'modules': ['marketSize', 'feasibility', 'pricing', 'marketResearch', 'gtm', 'okr'],
    },
    {
        'action': 'ADMIN_REVIEW',
        'status': 'REVIEWING',
        'note': 'Admin reviews the report before publication',
        'modules': [],
    },
    {
        'action': 'DELIVERED',
        'status': 'PUBLISHED',
        'note': 'Generated scores & downloadable artifacts',
        'modules': ['industryReport'],
    },
]

_BY_STATUS = {s['status']: s for s in PIPELINE_STAGES}


def is_valid_status(status):
    return status in REPORT_STATUSES


def can_transition(from_status, to_status):
    if not is_valid_status(from_status) or not is_valid_status(to_status):
        return False
    return FORWARD[from_status] == to_status or BACKWARD[from_status] == to_status


def assert_transition(from_status, to_status):
    """Raises ApiError(400) unless `to_status` is one legal step from `from_status`."""
    if not is_valid_status(to_status):
        raise ApiError(400, f'Unknown status "{to_status}". Expected one of: {", ".join(REPORT_STATUSES)}')
    if from_status == to_status:
        raise ApiError(400, f'Report is already {from_status}')
    if not can_transition(from_status, to_status):
        raise ApiError(
            400,
            f'Illegal transition {from_status} -> {to_status}. '
            f'The pipeline is linear: {" -> ".join(REPORT_STATUSES)}'
        )
    return to_status


def next_status(from_status):
    return FORWARD.get(from_status)


def previous_status(from_status):
    return BACKWARD.get(from_status)


def step(from_status, direction=1):
    """Advance or revert by one stage; raises ApiError(400) at the rails."""
    to = next_status(from_status) if direction >= 0 else previous_status(from_status)
    if not to:
        raise ApiError(
            400,
            f'Report is already at the terminal status ({TERMINAL_STATUS})'
            if direction >= 0
            else f'Report is already at the initial status ({INITIAL_STATUS})'
        )
    return assert_transition(from_status, to)


def action_for_status(status):
    stage = _BY_STATUS.get(status)
    return stage['action'] if stage else None


def stage_for_status(status):
    return _BY_STATUS.get(status)


def required_modules_for_status(status):
    stage = _BY_STATUS.get(status)
    return stage['modules'] if stage else []


def missing_modules_for_stage(status, completed_module_keys=None):
    """Module keys the current stage still needs before the report may advance."""
    done = set(completed_module_keys or [])
    return [key for key in required_modules_for_status(status) if key not in done]


def require_stage_complete(report):
    """Gate an advance: raises ApiError(409) listing the missing module keys —
    the same message shape Express produces for the admin console's alert."""
    missing = missing_modules_for_stage(report.status, report.completed_modules or [])
    if missing:
        raise ApiError(
            409,
            f'Cannot advance from {report.status}: action {action_for_status(report.status)} is incomplete. '
            f'Missing module results: {", ".join(missing)}'
        )


def pipeline_progress(status):
    """Percentage of the whole pipeline traversed, for progress bars."""
    if status not in REPORT_STATUSES:
        return 0
    idx = REPORT_STATUSES.index(status)
    return round((idx / (len(REPORT_STATUSES) - 1)) * 100)
