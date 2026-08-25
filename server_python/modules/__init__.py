"""MODULE REGISTRY — port of server/src/modules/index.js.

The single place every module is wired in. Routes and controllers dispatch
through this — adding an 11th module means adding one import and one entry
here, plus its key to a stage in state.PIPELINE_STAGES.
"""
from . import customer_discovery
from . import profiling
from . import market_size
from . import feasibility
from . import pricing
from . import market_research
from . import industry_report
from . import business_model_validation
from . import gtm
from . import okr

MODULES = {
    m.KEY: m
    for m in (
        customer_discovery,
        profiling,
        market_size,
        feasibility,
        pricing,
        market_research,
        industry_report,
        business_model_validation,
        gtm,
        okr,
    )
}

MODULE_KEYS = list(MODULES.keys())

# Modules whose run() reads sibling results from the context argument.
NEEDS_CONTEXT = {'industryReport', 'businessModelValidation'}
# Modules that call an external integration.
IS_ASYNC = {'marketResearch', 'industryReport'}


def get_module(key):
    return MODULES.get(key)


def module_catalogue():
    """Lightweight descriptors for the module-catalogue endpoint."""
    return [
        {
            'key': key,
            'title': MODULES[key].TITLE,
            'action': MODULES[key].ACTION,
            'async': key in IS_ASYNC,
            'needsContext': key in NEEDS_CONTEXT,
        }
        for key in MODULE_KEYS
    ]


def run_module(key, raw_input, context=None):
    """Execute a module uniformly. Raises KeyError-equivalent for unknown keys;
    pydantic.ValidationError for bad input (handled centrally in main.py)."""
    mod = get_module(key)
    if not mod:
        raise ValueError(f'Unknown module "{key}"')
    return mod.run(raw_input, context or {})
