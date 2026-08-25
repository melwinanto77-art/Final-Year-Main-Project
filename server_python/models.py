"""SQLAlchemy models — the Postgres/SQLite persistence layer.

Mirrors the Mongoose models in server/src/models/ (Report, ModuleResult,
Client). JSON columns are not mutation-tracked by SQLAlchemy: controllers
must REASSIGN them (r.completed_modules = [*old, key]), never mutate in place.

to_json() on each model emits the exact shape the Express server's
Mongoose toJSON transform produces, so the frontend cannot tell the two
backends apart.
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Text, UniqueConstraint
from datetime import datetime, timezone
from database import Base

VERTICALS = ['students', 'institutions', 'msmes', 'industries', 'startups']
BUSINESS_MODELS = ['B2B', 'B2C', 'B2B2C', 'Marketplace']
STAGES = ['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Growth']

MODULE_KEYS = [
    'customerDiscovery',
    'profiling',
    'marketSize',
    'feasibility',
    'pricing',
    'marketResearch',
    'industryReport',
    'businessModelValidation',
    'gtm',
    'okr',
]


def _utcnow():
    return datetime.now(timezone.utc)


def _iso(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


class ClientModel(Base):
    """Layer 1 of the intake engine — captured once, referenced by reports."""
    __tablename__ = 'clients'

    id = Column(String, primary_key=True, index=True)
    company = Column(String, nullable=False)
    vertical = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    stage = Column(String, default='Idea')
    geography = Column(String, nullable=True)
    business_model = Column(String, default='B2B')
    contact = Column(String, nullable=True)
    email = Column(String, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    def to_json(self):
        return {
            'id': self.id,
            'company': self.company,
            'vertical': self.vertical,
            'industry': self.industry,
            'stage': self.stage,
            'geography': self.geography,
            'businessModel': self.business_model,
            'contact': self.contact,
            'email': self.email,
            'createdAt': _iso(self.created_at),
            'updatedAt': _iso(self.updated_at),
        }


class ReportModel(Base):
    """The unit of work that moves through the pipeline."""
    __tablename__ = 'reports'

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    client_id = Column(String, nullable=True, index=True)
    vertical = Column(String, default='startups', index=True)
    tags = Column(JSON, default=list)

    status = Column(String, default='RECEIVED', index=True)
    action = Column(String, default='SCRUMING')

    # Final Venture Orbital Score, 0-100. Zero until the aggregate runs.
    score = Column(Integer, default=0)
    # Binary GO/PIVOT verdict, null until scored.
    decision = Column(Integer, nullable=True, default=None)

    tracks = Column(JSON, default=list)
    custom_modules = Column(JSON, default=list)
    clusters = Column(JSON, default=dict)
    # Per-module inputs derived from the intake form (buildModuleInputs on the
    # frontend). Stored so the admin can process the report later without the
    # user re-submitting.
    intake_data = Column(JSON, default=dict)

    # Module keys with a stored result — read by the action-pipeline gate.
    completed_modules = Column(JSON, default=list)

    transitions = Column(JSON, default=list)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    # Admin review fields
    admin_score = Column(Integer, nullable=True)
    admin_analysis = Column(String, nullable=True)
    admin_verdict = Column(String, nullable=True)
    admin_strengths = Column(String, nullable=True)
    admin_risks = Column(String, nullable=True)
    orbita_analysis = Column(JSON, nullable=True)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    approval_note = Column(String, nullable=True)

    def to_json(self, client=None):
        return {
            'id': self.id,
            'name': self.name,
            'client': client.to_json() if client else self.client_id,
            'vertical': self.vertical,
            'tags': self.tags or [],
            'status': self.status,
            'action': self.action,
            'score': self.score or 0,
            'decision': self.decision,
            'tracks': self.tracks or [],
            'customModules': self.custom_modules or [],
            'clusters': self.clusters or {},
            'intakeData': self.intake_data or {},
            'completedModules': self.completed_modules or [],
            'transitions': self.transitions or [],
            'publishedAt': _iso(self.published_at),
            'adminScore': self.admin_score,
            'adminAnalysis': self.admin_analysis,
            'adminVerdict': self.admin_verdict,
            'adminStrengths': self.admin_strengths,
            'adminRisks': self.admin_risks,
            'orbitaAnalysis': self.orbita_analysis,
            'reviewedBy': self.reviewed_by,
            'reviewedAt': _iso(self.reviewed_at),
            'approvalNote': self.approval_note,
            'createdAt': _iso(self.created_at),
            'updatedAt': _iso(self.updated_at),
        }


class ModuleResultModel(Base):
    """One row per (report, module) pair — re-running a module overwrites."""
    __tablename__ = 'module_results'
    __table_args__ = (UniqueConstraint('report_id', 'module_key', name='uq_report_module'),)

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, nullable=False, index=True)
    module_key = Column(String, nullable=False)

    # Raw submitted payload, kept for audit and re-runs.
    input = Column(JSON, default=dict)
    # Module-specific computed output.
    output = Column(JSON, default=dict)

    # 0-100 contribution; null for modules that don't score.
    score = Column(Float, nullable=True, default=None)
    # Which pipeline action produced this result.
    action = Column(String, nullable=True)

    # Populated when the module called an external service.
    integrations = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    # Admin verification fields
    verified_score = Column(Integer, nullable=True)
    verified_at = Column(DateTime, nullable=True)

    def to_json(self):
        return {
            'id': self.id,
            'report': self.report_id,
            'moduleKey': self.module_key,
            'input': self.input or {},
            'output': self.output or {},
            'score': self.score,
            'action': self.action,
            'integrations': self.integrations or {},
            'verifiedScore': self.verified_score,
            'verifiedAt': _iso(self.verified_at),
            'createdAt': _iso(self.created_at),
            'updatedAt': _iso(self.updated_at),
        }


class DomainModel(Base):
    __tablename__ = 'custom_domains'

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, default='Building2')
    created_at = Column(DateTime, default=_utcnow)


class DocumentModel(Base):
    """A file a client uploaded in support of a report.

    Bytes live on disk under server_python/uploads/ so the database stays
    small; only the metadata and the stored filename are persisted.
    """
    __tablename__ = 'documents'

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, nullable=True, index=True)
    client_id = Column(String, nullable=True, index=True)
    filename = Column(String, nullable=False)          # original name shown to users
    stored_name = Column(String, nullable=False)       # on-disk name, collision-free
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, default=0)
    category = Column(String, default='SUPPORTING')    # PITCH_DECK / FINANCIALS / ...
    note = Column(Text, nullable=True)
    uploaded_by = Column(String, nullable=True)        # client email
    created_at = Column(DateTime, default=_utcnow)

    def to_json(self):
        return {
            'id': self.id,
            'reportId': self.report_id,
            'clientId': self.client_id,
            'filename': self.filename,
            'contentType': self.content_type,
            'sizeBytes': self.size_bytes or 0,
            'category': self.category,
            'note': self.note,
            'uploadedBy': self.uploaded_by,
            'createdAt': _iso(self.created_at),
        }


class QueryModel(Base):
    """A question a client raised, and the admin's answer.

    Kept separate from reports so a client can ask something general, but
    optionally linked to a report when the question is about one.
    """
    __tablename__ = 'queries'

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, nullable=True, index=True)
    client_email = Column(String, nullable=True, index=True)
    client_name = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    category = Column(String, default='General')
    message = Column(Text, nullable=False)
    status = Column(String, default='OPEN')            # OPEN | IN_REVIEW | ANSWERED
    response = Column(Text, nullable=True)
    responded_by = Column(String, nullable=True)
    responded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    def to_json(self):
        return {
            'id': self.id,
            'reportId': self.report_id,
            'clientEmail': self.client_email,
            'clientName': self.client_name,
            'subject': self.subject,
            'category': self.category,
            'message': self.message,
            'status': self.status,
            'response': self.response,
            'respondedBy': self.responded_by,
            'respondedAt': _iso(self.responded_at),
            'createdAt': _iso(self.created_at),
            'updatedAt': _iso(self.updated_at),
        }


class BrandEquityModel(Base):
    """Indian Brand Equity assessment submitted alongside a venture.

    Scored on the five pillars the IBEF framework emphasises: awareness,
    perceived quality, associations, loyalty and distribution reach.
    """
    __tablename__ = 'brand_equity'

    id = Column(String, primary_key=True, index=True)
    report_id = Column(String, nullable=True, index=True)
    client_email = Column(String, nullable=True, index=True)

    brand_name = Column(String, nullable=False)
    category = Column(String, nullable=True)           # product/service category
    home_state = Column(String, nullable=True)         # Indian state of origin
    years_active = Column(Float, nullable=True)
    languages = Column(JSON, default=list)             # languages the brand markets in

    # Five pillars, each 0-100 as answered by the client.
    awareness = Column(Integer, default=0)
    perceived_quality = Column(Integer, default=0)
    associations = Column(Integer, default=0)
    loyalty = Column(Integer, default=0)
    distribution_reach = Column(Integer, default=0)

    # Supporting facts.
    monthly_customers = Column(Integer, default=0)
    repeat_rate = Column(Integer, default=0)           # % returning customers
    social_following = Column(Integer, default=0)
    certifications = Column(Text, nullable=True)       # ISI / FSSAI / GI tag etc.
    differentiator = Column(Text, nullable=True)

    equity_score = Column(Integer, default=0)          # computed 0-100
    # Which self-reported pillars were capped for want of evidence, so the
    # score can explain itself instead of just asserting a number.
    evidence_caps = Column(JSON, default=list)
    strength_band = Column(String, default='WEAK')     # WEAK | MEDIUM | STRONG
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    def to_json(self):
        return {
            'id': self.id,
            'reportId': self.report_id,
            'clientEmail': self.client_email,
            'brandName': self.brand_name,
            'category': self.category,
            'homeState': self.home_state,
            'yearsActive': self.years_active,
            'languages': self.languages or [],
            'pillars': {
                'awareness': self.awareness,
                'perceivedQuality': self.perceived_quality,
                'associations': self.associations,
                'loyalty': self.loyalty,
                'distributionReach': self.distribution_reach,
            },
            'monthlyCustomers': self.monthly_customers,
            'repeatRate': self.repeat_rate,
            'socialFollowing': self.social_following,
            'certifications': self.certifications,
            'differentiator': self.differentiator,
            'equityScore': self.equity_score,
            'evidenceCaps': self.evidence_caps or [],
            'strengthBand': self.strength_band,
            'createdAt': _iso(self.created_at),
            'updatedAt': _iso(self.updated_at),
        }


class UserModel(Base):
    """A person who can sign in.

    Passwords are stored only as PBKDF2 hashes (see auth.hash_password); the
    plaintext never reaches the database. `role` drives every access check:
    'admin' reaches everything, 'client' only their own data.
    """
    __tablename__ = 'users'

    id = Column(String, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default='client')          # 'client' | 'admin'
    full_name = Column(String, nullable=True)
    is_active = Column(String, default='yes')
    created_at = Column(DateTime, default=_utcnow)
    last_login_at = Column(DateTime, nullable=True)

    def to_json(self):
        """Never includes password_hash — this shape is sent to the browser."""
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'fullName': self.full_name,
            'createdAt': _iso(self.created_at),
            'lastLoginAt': _iso(self.last_login_at),
        }
