/* ============================================================
   API CLIENT — talks to the FastAPI backend in `server_python/`.

   Point it somewhere with VITE_API_URL (see .env.example). When the
   API is unreachable every call here rejects with an ApiUnavailable
   error; the dashboards catch that and fall back to their offline
   behaviour, so the app stays usable with no backend running.
   ============================================================ */

export const API_BASE = (import.meta.env?.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

/** Thrown when the server answered but rejected the request. */
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Thrown when the server could not be reached at all. */
export class ApiUnavailable extends Error {
  constructor(cause) {
    super('Backend API is not reachable');
    this.name = 'ApiUnavailable';
    this.cause = cause;
  }
}

/* ---------- session token ----------
   The API authenticates every request, so the token travels on each call.
   It lives in localStorage so a refresh keeps the session, and is cleared
   the moment the server says it is no longer valid. */
const TOKEN_KEY = 'co.authToken';

export function getAuthToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage disabled — the in-memory session still works */ }
}

export function clearAuthToken() {
  setAuthToken('');
}

/** Listeners fired when the server rejects our token, so the UI can log out. */
const unauthorizedHandlers = new Set();
export function onUnauthorized(handler) {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

function buildHeaders(body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return Object.keys(headers).length ? headers : undefined;
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  const headers = buildHeaders(body);
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    // Unreachable API — callers fall back to their offline behaviour.
    throw new ApiUnavailable(err);
  }

  // An expired or tampered token must not leave the UI in a half-signed-in
  // state — drop it and let the app return to the login screen.
  if (res.status === 401) {
    clearAuthToken();
    unauthorizedHandlers.forEach((handler) => {
      try { handler(); } catch { /* a listener must not break the request */ }
    });
  }

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    /* The API answers with a flat { error, message, issues?, details? }
       envelope, but FastAPI's own validation errors arrive as { detail }
       — a string or a list of field objects. Handle both so a message is
       always readable. */
    let detail;
    if (payload?.issues?.length) {
      detail = `${payload.message}: ${payload.issues.map((i) => `${i.path} ${i.message}`).join('; ')}`;
    } else if (Array.isArray(payload?.detail)) {
      detail = payload.detail.map((d) => `${(d.loc || []).join('.')} ${d.msg}`).join('; ');
    } else {
      detail = payload?.message || (typeof payload?.detail === 'string' ? payload.detail : undefined);
    }
    throw new ApiError(
      detail || `Request failed (${res.status})`,
      res.status,
      payload?.issues || payload?.details || payload?.detail
    );
  }

  return payload;
}

/* ---------- endpoints ---------- */

export const getHealth      = (signal) => request('/health', { signal });
export const listReports    = (signal) => request('/reports?limit=100', { signal });
export const getReport      = (id)     => request(`/reports/${id}`);
export const createReport   = (body)   => request('/reports', { method: 'POST', body });
export const deleteReport   = (id)     => request(`/reports/${id}`, { method: 'DELETE' });
export const advanceReport  = (id)     => request(`/reports/${id}/advance`, { method: 'POST' });
export const revertReport   = (id)     => request(`/reports/${id}/revert`, { method: 'POST' });
export const generateReport = (id)     => request(`/reports/${id}/generate`, { method: 'POST' });
/* ---------- authentication ---------- */

/**
 * Sign in and store the session token.
 * @param {'client'|'admin'} portal Which portal is being entered; the server
 *   refuses a client account attempting the admin console.
 */
export async function login(email, password, portal = 'client') {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { email, password, portal },
  });
  if (data?.token) setAuthToken(data.token);
  return data;
}

/** Confirm a stored token is still valid — used to restore a session. */
export const fetchCurrentUser = () => request('/auth/me');

export function logout() {
  clearAuthToken();
}

/* ---------- admin review actions ----------
   These are admin-only on the server, so they must travel with the session
   token — a bare fetch() from a component would be rejected. */

export const runOrbitaAnalysis = (id) =>
  request(`/reports/${id}/orbita-analysis`, { method: 'POST' });

export const runAiAssessment = (id) =>
  request(`/reports/${id}/ai-assessment`, { method: 'POST' });

export const submitReview = (id, body) =>
  request(`/reports/${id}/review`, { method: 'POST', body });

/** The .docx endpoint is authenticated, so a plain href cannot fetch it. */
export async function downloadReportDocx(id, filename = 'strategy-report.docx') {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/reports/${id}/report.docx`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new ApiError(payload?.message || `Download failed (${res.status})`, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- documents, queries, brand equity ---------- */

/** Upload a supporting file. FormData, so `request()` is bypassed here —
 *  setting Content-Type manually would break the multipart boundary. */
export async function uploadDocument({ file, reportId, category, note, uploadedBy }) {
  const form = new FormData();
  form.append('file', file);
  if (reportId) form.append('reportId', reportId);
  if (category) form.append('category', category);
  if (note) form.append('note', note);
  if (uploadedBy) form.append('uploadedBy', uploadedBy);

  let res;
  const token = getAuthToken();
  try {
    // No Content-Type here on purpose — the browser must set the multipart
    // boundary itself.
    res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  } catch (err) {
    throw new ApiUnavailable(err);
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(payload?.message || payload?.detail || `Upload failed (${res.status})`, res.status);
  }
  return payload;
}

export const listDocuments = (params = {}) =>
  request(`/documents?${new URLSearchParams(params)}`);
export const deleteDocument = (id) => request(`/documents/${id}`, { method: 'DELETE' });
/** Direct link — used for the download anchor rather than a fetch. */
/** The download endpoint needs the auth header, so a plain href will not do.
 *  Fetches the file and hands the browser a temporary object URL. */
export async function downloadDocument(id, filename = 'document') {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/documents/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new ApiError(payload?.message || `Download failed (${res.status})`, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const listQueries = (params = {}) => request(`/queries?${new URLSearchParams(params)}`);
export const createQuery = (body) => request('/queries', { method: 'POST', body });
export const respondToQuery = (id, body) =>
  request(`/queries/${id}/respond`, { method: 'POST', body });
export const deleteQuery = (id) => request(`/queries/${id}`, { method: 'DELETE' });

export const listBrandEquity = (params = {}) =>
  request(`/brand-equity?${new URLSearchParams(params)}`);
export const submitBrandEquity = (body) => request('/brand-equity', { method: 'POST', body });

export const runModule      = (id, key, input) =>
  request(`/reports/${id}/modules/${key}`, { method: 'POST', body: input });

/**
 * Health, normalised across both backends.
 *
 * Express answers `{ ok: true, db: 'connected' | 'disconnected' }`. FastAPI
 * answers `{ status: 'ok', db: 'PostgreSQL' | 'SQLite (Local Fallback)' }` —
 * no `ok` key at all, and `db` names the driver rather than the connection
 * state. Checking for `db === 'connected'` therefore rejected FastAPI outright
 * and silently dropped the whole app into offline mode.
 *
 * The reason for testing the DB at all is Express-specific: when Mongo is down
 * the API still answers /health, but every real query then blocks for the full
 * 10s Mongoose buffer timeout. Only 'disconnected' means that; any other value
 * is a live database.
 *
 * @returns {Promise<{ ready: boolean, db: string, backend: string }>}
 */
export async function checkHealth(signal) {
  const payload = await getHealth(signal);
  const ok = payload?.ok === true || payload?.status === 'ok';
  const db = payload?.db ?? '';
  return {
    ready: ok && Boolean(db) && db !== 'disconnected',
    db,
    backend: payload?.service || 'Express + MongoDB',
  };
}

/* ---------- intake → module input mapping ---------- */

/** The server's `vertical` field is a strict five-value enum. Custom domains
 *  added in the UI carry ids like `domain_1738…`, which it would reject, so
 *  they fall back to `startups` and keep their real name in `tags`. */
const SERVER_VERTICALS = ['students', 'institutions', 'msmes', 'industries', 'startups'];
export const toServerVertical = (v) => (SERVER_VERTICALS.includes(v) ? v : 'startups');

/** The Client model's `stage` is an enum that has no "Scaleup" — the intake
 *  Select offers one. Anything unrecognised folds into the nearest valid value. */
const SERVER_STAGES = ['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Growth'];
export const toServerStage = (s) => (SERVER_STAGES.includes(s) ? s : s === 'Scaleup' ? 'Growth' : 'Idea');

/** Intake offers six business models; the modules and the Client model accept four. */
export function toServerBusinessModel(model = '') {
  if (/b2b2c/i.test(model)) return 'B2B2C';
  if (/marketplace/i.test(model)) return 'Marketplace';
  if (/b2c|d2c|consumer|p2p/i.test(model)) return 'B2C';
  return 'B2B'; // covers "B2B Enterprise" and "B2G Government"
}

/** Pull the first number out of a free-text field like "$1.2M seed" or "18 months". */
function parseAmount(text, fallback = 0) {
  if (typeof text !== 'string') return fallback;
  const m = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([kmb])?/i);
  if (!m) return fallback;
  const n = Number(m[1]);
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1;
  return n * mult;
}

/** A requirements number if the user answered it, else the fallback.
 *  Form fields arrive as strings; '' / null / non-numeric mean unanswered. */
function answered(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const pct = (value, fallback) => Math.min(100, Math.max(0, answered(value, fallback)));

/**
 * Derive inputs for all ten modules from the Layer 1 profile, Layer 2
 * clusters, and the requirements the intake form collected. Every
 * requirement is optional — unanswered fields keep the documented defaults
 * rather than blocking the run, so a minimal submission still scores.
 *
 * `requirements` (all optional): consumerCommunication, reachableConsumers,
 * interviewsCompleted, weeklyInteractions, tam, samPercent, conversionRate,
 * technical, operational, financial, regulatory, teamCapability, ourPrice,
 * competitorLowPrice, competitorHighPrice, capitalRequired,
 * monthsToBreakEven, expectedAnnualReturn, monthlyMarketingBudget.
 */
export function buildModuleInputs({ profile, clusters, vertical, tracks = [], customModules = [], requirements = {} }) {
  const req = requirements || {};
  const industry = profile.industry?.trim() || vertical || 'Technology';
  const company = profile.company?.trim() || 'New Strategic Venture';
  const businessModel = toServerBusinessModel(profile.model);
  const isConsumer = businessModel === 'B2C';

  const problem = clusters.market.problem?.trim() ||
    `Operational inefficiencies, manual friction, and scaling bottlenecks in the ${industry} industry.`;
  const icp = clusters.market.icp?.trim() ||
    `Decision makers operating across ${industry}.`;
  const geography = clusters.launch.geography?.trim() || profile.geography?.trim() || 'Global';

  const idea = `${company} — ${industry}. ${problem}`;
  const wtp = answered(req.ourPrice, parseAmount(clusters.market.wtp, isConsumer ? 49 : 2500));
  const capital = answered(req.capitalRequired, parseAmount(clusters.launch.ask, 1_200_000));
  const breakevenMonths = answered(req.monthsToBreakEven, parseAmount(clusters.viability.breakeven, 18) || 18);

  const competitorLow = answered(req.competitorLowPrice, wtp * 0.8);
  const competitorHigh = answered(req.competitorHighPrice, wtp * 1.4);
  const competitorMid = (competitorLow + competitorHigh) / 2;

  return {
    customerDiscovery: {
      businessIdea: idea,
      problemStatement: problem,
      // If the form asked, use the honest answer — "no" legitimately scores 0.
      consumerCommunication: req.consumerCommunication ?? true,
      reachableConsumers: Math.round(answered(req.reachableConsumers, isConsumer ? 50_000 : 2_500)),
      interviewsCompleted: Math.round(answered(req.interviewsCompleted, 12)),
      weeklyInteractions: Math.round(answered(req.weeklyInteractions, 40)),
      channels: isConsumer ? ['social', 'community', 'email'] : ['outbound', 'events', 'referral'],
    },

    profiling: {
      sector: industry,
      businessModel,
      targetDemographics: isConsumer ? icp : undefined,
      idealCompanyProfile: isConsumer ? undefined : icp,
      employeeCountRange: isConsumer ? undefined : '50-500',
      dataCompleteness: 70,
    },

    marketSize: {
      tam: Math.max(1, answered(req.tam, 500_000_000)),
      currency: 'USD',
      samPercent: pct(req.samPercent, 18),
      channelMix: { direct: 30, partner: 20, online: 25 },
      conversionRate: pct(req.conversionRate, isConsumer ? 3 : 12),
      averageContractValue: wtp * (isConsumer ? 12 : 12),
    },

    feasibility: {
      technical: pct(req.technical, 72),
      operational: pct(req.operational, 68),
      financial: pct(req.financial, 65),
      regulatory: pct(req.regulatory, 70),
      teamCapability: pct(req.teamCapability, 75),
      b2b: isConsumer ? undefined : {
        averageContractValue: wtp * 12,
        customerAcquisitionCost: wtp * 3,
        salesCycleDays: 90,
        expectedRetentionMonths: 24,
      },
      threshold: 60,
    },

    pricing: {
      ourPrice: wtp,
      ourModel: isConsumer ? 'subscription' : 'tiered',
      ourFeatures: customModules,
      currency: 'USD',
      // User-supplied competitor bracket when given; otherwise bracket our own
      // price so the comparison is at least directionally meaningful.
      competitors: [
        { name: 'Incumbent A', price: competitorHigh, model: 'subscription', billingPeriod: 'monthly' },
        { name: 'Incumbent B', price: competitorLow, model: 'subscription', billingPeriod: 'monthly' },
        { name: 'Incumbent C', price: competitorMid, model: 'tiered', billingPeriod: 'monthly' },
      ],
    },

    marketResearch: {
      productDescription: idea,
      targetKeywords: [industry, ...tracks].filter(Boolean).slice(0, 5),
      knownCompetitors: ['Incumbent A', 'Incumbent B'],
      marketMaturity: 55,
      differentiationStrength: 65,
      countryCode: 'US',
    },

    businessModelValidation: {
      primary: {
        formSubmissions: 45,
        surveyReach: 500,
        notes: clusters.market.pain?.trim() || undefined,
      },
      secondary: { useExistingModules: true, modules: [] },
      investment: {
        capitalRequired: capital,
        monthsToBreakEven: Math.max(1, breakevenMonths),
        founderMonthsCommitted: 24,
        expectedAnnualReturn: answered(req.expectedAnnualReturn, capital * 0.4),
      },
      currency: 'USD',
    },

    gtm: {
      audience: icp,
      businessModel,
      availability: {
        channels: isConsumer
          ? ['paid-social', 'seo', 'community', 'referral']
          : ['outbound', 'events', 'content', 'partnerships'],
        geography,
      },
      advertising: {
        monthlyBudget: answered(req.monthlyMarketingBudget, Math.max(3000, Math.round(capital / 100))),
        currentChannels: [],
      },
      commands: customModules,
      launchHorizonMonths: 6,
    },

    okr: {
      objectives: [
        {
          title: `Validate ${industry} product-market fit`,
          owner: profile.contact?.trim() || 'Founder',
          keyResults: [
            { description: 'Signed pilot accounts', metric: 'accounts', baseline: 0, target: 10, current: 2, unit: 'count' },
            { description: 'Monthly recurring revenue', metric: 'MRR', baseline: 0, target: wtp * 10, current: 0, unit: 'USD' },
          ],
        },
        {
          title: clusters.launch.milestones?.trim()?.slice(0, 120) || 'Launch and scale go-to-market',
          owner: 'GTM Lead',
          keyResults: [
            { description: 'Qualified pipeline generated', metric: 'pipeline', baseline: 0, target: 100, current: 15, unit: 'leads' },
          ],
        },
      ],
      enforceCompletion: true,
    },

    industryReport: {
      executiveContext:
        `${company} operates in ${industry} as a ${profile.model || businessModel} venture at ${profile.stage || 'Seed'} stage, ` +
        `targeting ${geography}. Problem: ${problem}`,
      threshold: 60,
    },
  };
}

/* ---------- pipeline orchestration ---------- */

/**
 * Submit intake data only — creates a report at RECEIVED status.
 * No modules are run. The admin will trigger report generation later.
 *
 * `onProgress(label, done, total)` is called between steps so the UI can show
 * where it is.
 */
export async function submitIntake(
  { name, vertical, tags, tracks, customModules, profile, clusters, requirements },
  onProgress = () => {}
) {
  const inputs = buildModuleInputs({ profile, clusters, vertical, tracks, customModules, requirements });
  const totalSteps = 2;
  let done = 0;
  const tick = (label) => onProgress(label, ++done, totalSteps);

  const { report } = await createReport({
    name,
    vertical: toServerVertical(vertical),
    tags,
    tracks,
    customModules,
    clusters,
    intakeData: inputs,
    client: {
      company: profile.company?.trim() || name,
      industry: profile.industry?.trim() || undefined,
      stage: toServerStage(profile.stage),
      geography: profile.geography?.trim() || undefined,
      businessModel: toServerBusinessModel(profile.model),
      contact: profile.contact?.trim() || undefined,
      email: profile.email?.trim() || undefined,
    },
  });
  tick('Intake submitted');

  const final = await getReport(report.id);
  tick('Complete');
  return final;
}

/**
 * Admin-triggered processing: run the ten gating modules using the report's
 * stored intakeData and advance the state machine through
 * RECEIVED → PENDING → PROCESSED → REVIEWING. Stops at REVIEWING so the admin
 * can add their manual analysis before publishing.
 *
 * The stage → modules mapping mirrors server_python/state.py PIPELINE_STAGES;
 * industryReport is NOT run here — the admin's manual score replaces it on
 * publish.
 */
const PROCESSING_STAGES = [
  { status: 'RECEIVED',  modules: ['customerDiscovery'] },
  { status: 'PENDING',   modules: ['profiling', 'businessModelValidation'] },
  { status: 'PROCESSED', modules: ['marketSize', 'feasibility', 'pricing', 'marketResearch', 'gtm', 'okr'] },
];

export async function processReport(reportId, onProgress = () => {}) {
  const { report } = await getReport(reportId);
  const inputs = report?.intakeData || {};
  if (!inputs || Object.keys(inputs).length === 0) {
    throw new ApiError(
      'This report has no stored intake data — it was created before intake persistence was added, or the intake never completed. Re-submit through the intake form.',
      409
    );
  }

  const startIdx = PROCESSING_STAGES.findIndex((s) => s.status === report.status);
  if (startIdx === -1) {
    // Already past PROCESSED (REVIEWING or PUBLISHED) — nothing to do.
    return await getReport(reportId);
  }

  const remaining = PROCESSING_STAGES.slice(startIdx);
  const total = remaining.reduce((n, s) => n + s.modules.length + 1, 0);
  let done = 0;
  const tick = (label) => onProgress(label, ++done, total);

  for (const stage of remaining) {
    for (const key of stage.modules) {
      const payload = inputs[key] || {};
      await runModule(reportId, key, payload);
      tick(`Ran ${key}`);
    }
    await advanceReport(reportId);
    tick(`Advanced past ${stage.status}`);
  }

  return await getReport(reportId);
}
