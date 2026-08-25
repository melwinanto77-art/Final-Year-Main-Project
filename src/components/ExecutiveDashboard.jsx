import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { checkHealth, listReports, submitIntake, getReport, listQueries } from "../api.js";
import ReportOverview from "./ReportOverview.jsx";
import DocumentUpload from "./DocumentUpload.jsx";
import BrandEquityForm from "./BrandEquityForm.jsx";
import QueriesPanel from "./QueriesPanel.jsx";
import StrengthBadge from "./StrengthBadge.jsx";
import { StartupMarketEngine, MsmeOptimizationEngine, IndustryAnalysisEngine } from "./VerticalEngines.jsx";
import IntakeEngine from "./IntakeEngine.jsx";
import {
  Search,
  Bell,
  LogOut,
  HelpCircle,
  Sparkles,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  TrendingUp,
  Target,
  ShieldAlert,
  DollarSign,
  Layers,
  Cpu,
  FileText,
  X,
  Building2,
  Filter,
  ArrowRight,
  PieChart,
  Activity,
  Check,
  MessageSquare,
  Folder,
  FolderPlus,
  Play,
  Clock,
  Eye,
  Upload,
  Award,
  BarChart3,
  Zap,
  RotateCcw
} from "lucide-react";

/* ============================================================
   10 INTELLIGENCE MODULES INITIAL SEED DATA
   ============================================================ */
const INITIAL_INTELLIGENCE_MODULES = [
  {
    id: "mod-1",
    code: "MOD-01",
    name: "Market Sizing & Whitespace",
    category: "Market Foundation",
    icon: Target,
    status: "PENDING",
    score: null,
    desc: "TAM/SAM/SOM estimation, competitive whitespace mapping, and structural market sizing.",
    lastUpdated: null,
    project: null
  },
  {
    id: "mod-2",
    code: "MOD-02",
    name: "Competitor Intelligence",
    category: "Market Foundation",
    icon: Layers,
    status: "PENDING",
    score: null,
    desc: "Feature teardowns, pricing models, positioning matrices, and defensibility moats.",
    lastUpdated: null,
    project: null
  },
  {
    id: "mod-3",
    code: "MOD-03",
    name: "Financial Viability & Unit Economics",
    category: "Business Viability",
    icon: DollarSign,
    status: "PENDING",
    score: null,
    desc: "CAC, LTV, payback period, gross margin modeling, and break-even trajectory.",
    lastUpdated: null,
    project: null
  },
  {
    id: "mod-4",
    code: "MOD-04",
    name: "Go-To-Market Strategy",
    category: "Launch & Execution",
    icon: TrendingUp,
    status: "PENDING",
    score: null,
    desc: "Channel selection, sales cycle optimization, partner ecosystems, and early traction engines.",
    lastUpdated: null,
    project: null
  },
  {
    id: "mod-5",
    code: "MOD-05",
    name: "Risk & Vulnerability Audit",
    category: "Business Viability",
    icon: ShieldAlert,
    status: "PENDING",
    score: null,
    desc: "Single points of failure, supply chain exposure, key-person dependencies, and regulatory risks.",
    lastUpdated: null,
    project: null
  },
  {
    id: "mod-6",
    code: "MOD-06",
    name: "Customer Persona & Demand Signal",
    category: "Market Foundation",
    icon: Activity,
    status: "PENDING",
    score: null,
    desc: "Problem severity validation, willingness-to-pay signals, and user journey bottlenecks.",
    lastUpdated: null,
    project: null
  },
  {
    id: "mod-7",
    code: "MOD-07",
    name: "Regulatory & Compliance Framework",
    category: "Business Viability",
    icon: Building2,
    status: "PENDING",
    score: null,
    desc: "ISO, GDPR, HIPAA, and industry-specific compliance requirements audit.",
    lastUpdated: null,
    project: null
  },
  {
    id: "mod-8",
    code: "MOD-08",
    name: "Technology Architecture Audit",
    category: "Launch & Execution",
    icon: Cpu,
    status: "PENDING",
    score: null,
    desc: "System scalability, tech stack vulnerability, maintenance debt, and IP audit.",
    lastUpdated: null,
    project: null
  },
  {
    id: "mod-9",
    code: "MOD-09",
    name: "Operations & Supply Bottlenecks",
    category: "Launch & Execution",
    icon: PieChart,
    status: "PENDING",
    score: null,
    desc: "Process latency, fulfillment overheads, vendor SLA analysis, and operational yield.",
    lastUpdated: null,
    project: null
  },
  {
    id: "mod-10",
    code: "MOD-10",
    name: "Executive Verdict & Scorecard",
    category: "Executive Governance",
    icon: Sparkles,
    status: "PENDING",
    score: null,
    desc: "Synthesized binary GO/NO-GO recommendation, capital deployment verdict, and board summary.",
    lastUpdated: null,
    project: null
  }
];

/* ============================================================
   INITIAL CLIENT PROJECTS SEED DATA
   ============================================================ */
/* ---- Backend bridge ------------------------------------------------------
   The server's report shape ({ id, name, vertical, tags, status, score,
   decision, completedModules, clusters }) maps onto this dashboard's project
   cards. When no API is reachable the seeds below stay and every action keeps
   its original simulation, so the UI is unchanged offline. */

/** Server module keys in MOD-01…MOD-10 order, for scoring the module cards. */
const MODULE_KEY_ORDER = [
  "customerDiscovery", "profiling", "marketSize", "feasibility", "pricing",
  "marketResearch", "industryReport", "businessModelValidation", "gtm", "okr",
];

/** This form's stage labels → the Client model's STAGES enum. */
const STAGE_TO_SERVER = {
  "Idea & Problem Validation": "Idea",
  "Early Stage / Seed": "Seed",
  "Early Traction / Series A": "Series A",
  "Growth & Expansion": "Growth",
};

function projectFromReport(r) {
  // Prefer the admin's published values once they exist. Until the admin
  // publishes, the user sees "PENDING" — no score, no verdict — so the
  // score can't be inferred before an actual human has reviewed it. Once
  // published, the verdict comes from what the admin entered on approval.
  const score = r.adminScore ?? r.score ?? 0;
  const adminV = (r.adminVerdict || "").toUpperCase();
  const isPublished = r.status === "PUBLISHED";
  const verdict = !isPublished
    ? "PENDING — Awaiting admin approval"
    : adminV === "GO"          ? `GO (${score}%) — Approved to proceed`
    : adminV === "CONDITIONAL" ? `CONDITIONAL (${score}%) — Proceed with caveats`
    : adminV === "PIVOT"       ? `PIVOT (${score}%) — Rework recommended`
    : adminV === "REJECT"      ? `REJECT (${score}%) — Do not proceed`
    // Fallback if the admin didn't set an explicit verdict but the pipeline
    // did (older reports scored before the review UI existed).
    : r.decision === 1 ? `GO (${score}%) — Approved to proceed`
    : r.decision === 0 ? `PIVOT (${score}%) — Rework recommended`
    : score > 0        ? `CONDITIONAL (${score}%) — Proceed with caveats`
    : "PENDING — Awaiting admin approval";
  return {
    id: r.id,
    title: r.name,
    industry: r.tags?.[0] || r.vertical,
    verdict,
    status: isPublished ? "ACTIVE" : "UNDER_REVIEW",
    modulesProcessed: `${(r.completedModules || []).length}/10`,
    date: (r.createdAt || new Date().toISOString()).split("T")[0],
    description: r.clusters?.market?.problem || "Venture evaluated through the intelligence pipeline.",
    fromApi: true,
    rawStatus: r.status,
    adminScore: r.adminScore ?? null,
    adminVerdict: r.adminVerdict ?? null,
    adminAnalysis: r.adminAnalysis ?? null,
    adminStrengths: r.adminStrengths ?? null,
    adminRisks: r.adminRisks ?? null,
    approvalNote: r.approvalNote ?? null,
    adminOverrides: r.adminOverrides ?? null,
  };
}

/* The dashboard's sections, in order. Adding one here is all it takes —
   the tab row and the content switch both read from this list. `short` is
   what shows on a phone, where the numbered long label will not fit. */
const NAV_SECTIONS = [
  { id: "intake",    label: "Intake Engine",   short: "Intake",    icon: FileText,      hint: "Submit a venture for evaluation" },
  { id: "track",     label: "My Projects",     short: "Projects",  icon: Activity,      hint: "Status of everything you have submitted" },
  { id: "documents", label: "Documents",       short: "Files",     icon: Upload,        hint: "Upload files that support your submission" },
  { id: "brand",     label: "Brand Equity",    short: "Brand",     icon: Award,         hint: "Indian Brand Equity assessment" },
  { id: "queries",   label: "Queries",         short: "Queries",   icon: MessageSquare, hint: "Ask a question and read the response" },
  { id: "modules",   label: "Module Scores",   short: "Modules",   icon: Layers,        hint: "Score for each intelligence module" },
  { id: "engines",   label: "Vertical Engines", short: "Engines",  icon: Cpu,           hint: "Quick TAM/SAM/SOM calculators" },
];

const getStatusBadge = (report) => {
  if (report.rawStatus === 'REVIEWING') return { label: 'UNDER_REVIEW', color: 'amber' };
  if (report.rawStatus === 'PUBLISHED' && report.adminScore !== null) return { label: 'VERIFIED', color: 'green' };
  if (report.rawStatus === 'PUBLISHED') return { label: 'DRAFT', color: 'blue' };
  return { label: 'INTAKE', color: 'gray' };
};

const STATUS_BADGE_STYLES = {
  amber: "bg-amber-100 text-amber-800 border border-amber-300",
  green: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  blue: "bg-blue-100 text-blue-800 border border-blue-300",
  gray: "bg-gray-100 text-gray-800 border border-gray-300",
};

/* ---- New Project requirements wizard ------------------------------------
   Five steps that collect the actual inputs the ten calculators score on.
   Every field except the name is optional — blanks fall back to the
   documented defaults inside buildModuleInputs(), so a quick submission
   still runs; the more that is answered, the more the score is the user's
   own business rather than the placeholders'. */

const EMPTY_PROJECT_FORM = {
  startupName: "",
  sector: "Healthcare & Logistics",
  stage: "Early Stage / Seed",
  businessModel: "B2B Enterprise",
  geography: "",
  contact: "",
  description: "",
  // Market problem (report section 2)
  painPoint: "",
  icp: "",
  wtpText: "",
  // Business economics (report section 3)
  revenueModel: "",
  grossMargin: "",
  costDrivers: "",
  // Launch & GTM (report section 4)
  gtmStrategy: "",
  milestones: "",
  // Customer reach (MOD-01)
  consumerCommunication: true,
  reachableConsumers: "",
  interviewsCompleted: "",
  weeklyInteractions: "",
  // Market size (MOD-03)
  tam: "",
  samPercent: "",
  conversionRate: "",
  // Feasibility self-rating (MOD-04)
  technical: 70,
  operational: 70,
  financial: 70,
  regulatory: 70,
  teamCapability: 70,
  // Pricing & investment (MOD-05 / MOD-08 / MOD-09)
  ourPrice: "",
  competitorLowPrice: "",
  competitorHighPrice: "",
  capitalRequired: "",
  monthsToBreakEven: "",
  expectedAnnualReturn: "",
  monthlyMarketingBudget: "",
};

const WIZARD_STEPS = [
  "Venture Basics",
  "Market Problem",
  "Customer Reach",
  "Market Size",
  "Feasibility",
  "Pricing & Economics",
  "Investment & Launch",
];

function ReqText({ label, value, onChange, placeholder, hint, rows }) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${fieldCls} rounded-2xl resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={fieldCls}
        />
      )}
      {hint && <p className="text-[0.65rem] text-[#8C6D58]">{hint}</p>}
    </div>
  );
}

const fieldCls =
  "w-full rounded-xl border border-[#D4AF37]/60 bg-white px-3.5 py-2.5 text-xs text-[#4A0A13] placeholder-[#8C6D58]/60 focus:border-[#400A12] focus:outline-none shadow-xs";
const labelCls =
  "font-mono text-[0.68rem] uppercase font-bold text-[#B8860B] tracking-wider";

function ReqNumber({ label, value, onChange, placeholder, hint }) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldCls}
      />
      {hint && <p className="text-[0.65rem] text-[#8C6D58]">{hint}</p>}
    </div>
  );
}

function ReqSlider({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className={labelCls}>{label}</label>
        <span className="font-mono text-xs font-bold text-[#400A12]">{value}/100</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#400A12] cursor-pointer"
      />
    </div>
  );
}

const INITIAL_MY_PROJECTS = [];
/* No demo ventures: the portal lists only what this client actually
   submitted through the intake engine, loaded from the backend. */


/* ============================================================
   INITIAL POSTED BUSINESS QUESTIONS & RESPONSES
   ============================================================ */
const INITIAL_QUERIES = [];
/* No demo questions — the query desk starts empty and fills as the
   client posts real questions. */


export default function ExecutiveDashboard({ onLogout, onGoHome, userEmail }) {
  /* Display name derived from the signed-in email's domain:
     founder@venture.io -> "Venture". Falls back to the mailbox name,
     then to a generic label when no email was captured. */
  const emailName = (() => {
    const email = (userEmail || "").trim();
    const [mailbox, domain] = email.split("@");
    const base = (domain || "").split(".")[0] || mailbox || "";
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Executive";
  })();
  const emailInitials = emailName.slice(0, 2).toUpperCase();
  // Navigation & View States
  const [navbarSection, setNavbarSection] = useState("intake"); // 'intake' | 'modules' | 'track' | 'engines' | 'queries'
  const [engineTab, setEngineTab] = useState("startup");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Data States
  const [projectsList, setProjectsList] = useState(INITIAL_MY_PROJECTS);
  const [modulesList, setModulesList] = useState(INITIAL_INTELLIGENCE_MODULES);

  // Dropdowns & Modals
  const [isMyProjectsDropdownOpen, setIsMyProjectsDropdownOpen] = useState(false);
  const [isViewProjectsModalOpen, setIsViewProjectsModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  /* Answered questions show up as notifications, so the client learns a
     reply arrived without opening the Queries tab. */
  const [answeredQueries, setAnsweredQueries] = useState([]);
  const [notificationsRead, setNotificationsRead] = useState(false);

  // Question Form State
  const [questionText, setQuestionText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Market Foundation");
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [questionSuccess, setQuestionSuccess] = useState(false);

  // New Project Form & Analysis State
  const [newProjectForm, setNewProjectForm] = useState(EMPTY_PROJECT_FORM);
  const [wizardStep, setWizardStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatusText, setAnalysisStatusText] = useState("Initializing orbital synthesis engine...");

  /* 'checking' until the health probe answers; 'offline' keeps every flow on
     its original simulation. */
  const [apiStatus, setApiStatus] = useState("checking");

  /* { report, moduleResults } — opens the on-site report overview, which
     carries the .doc download box. */
  const [reportOverview, setReportOverview] = useState(null);

  /* Which submission new uploads attach to; "" means general. */
  const [docReportId, setDocReportId] = useState("");

  /* The approved report the Module Scores section is showing. The ref stops
     the poll refetching the same report every 20 seconds. */
  const [moduleSourceProject, setModuleSourceProject] = useState(null);
  const moduleSourceIdRef = useRef(null);

  // Newest first — a defensive sort so a freshly-created project always
  // sits at the top of every list, even if the backend or a local prepend
  // ever hands us data in a different order.
  const sortNewestFirst = (arr) =>
    [...arr].sort((a, b) => (b?.date || "").localeCompare(a?.date || ""));

  /* Module scores come from the client's most recent APPROVED report.
     Submitting an intake no longer runs the modules — an admin processes and
     publishes it — so this section has to read from the published report
     rather than from the (now empty) submission result, otherwise it would
     sit permanently blank. */
  const loadModuleScores = useCallback(async (reports) => {
    const published = (reports || []).find((r) => r.status === "PUBLISHED");
    if (!published) {
      setModuleSourceProject(null);
      setModulesList(INITIAL_INTELLIGENCE_MODULES);
      return;
    }
    // Skip the refetch when the same report is already on screen.
    if (moduleSourceIdRef.current === published.id) return;

    try {
      const detail = await getReport(published.id);
      const results = detail.moduleResults || {};
      moduleSourceIdRef.current = published.id;
      setModuleSourceProject({ id: published.id, name: published.name, score: detail.report.score });
      setModulesList((prev) =>
        prev.map((mod, i) => {
          const run = results[MODULE_KEY_ORDER[i]];
          return run
            ? {
                ...mod,
                project: published.name,
                status: "COMPLETED",
                score: Math.round(run.score ?? 0),
                lastUpdated: (detail.report.publishedAt || detail.report.updatedAt || "").split("T")[0] || "Recently",
              }
            : { ...mod, project: published.name, status: "PENDING", score: null };
        })
      );
    } catch {
      /* Leave whatever is on screen; the poll will try again. */
    }
  }, []);

  // Pulls the report list from the backend and merges it into projectsList.
  // Kept as a stable callback so it can be reused by the polling effects below
  // — the admin publishing a report happens on their side, so the executive
  // portal needs to refresh to see the update; without this the "My Projects"
  // list stayed frozen on whatever was loaded at mount time.
  const refreshProjects = useCallback(async (signal) => {
    try {
      const data = await listReports(signal);
      setApiStatus("online");
      const rows = (data?.reports || []).map(projectFromReport);
      // Empty DB on first mount shouldn't blank the portal — but once we've
      // ever seen live rows, trust the server (including "now zero").
      setProjectsList((prev) => {
        const wasLive = prev.some((p) => p.fromApi);
        if (!rows.length && !wasLive) return prev;
        return sortNewestFirst(rows);
      });
      // Keep the Module Scores section in step with the latest approved report.
      loadModuleScores(data?.reports || []);
      // Answered questions become notifications.
      listQueries({ status: "ANSWERED" })
        .then((q) => setAnsweredQueries(q?.queries || []))
        .catch(() => {});
    } catch (err) {
      if (err?.name !== "AbortError") setApiStatus("offline");
    }
  }, [loadModuleScores]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const health = await checkHealth(controller.signal);
        if (!health.ready) { setApiStatus("offline"); return; }
        await refreshProjects(controller.signal);
      } catch (err) {
        if (err.name !== "AbortError") setApiStatus("offline");
      }
    })();
    return () => controller.abort();
  }, [refreshProjects]);

  // Auto-refresh whenever the user is likely to be looking at their projects:
  //  - navbar switches to the projects section
  //  - the View Projects modal is opened
  //  - browser tab regains focus
  //  - every 20s while either projects surface is visible
  // Ensures a report the admin publishes appears here without a page reload.
  const projectsVisibleRef = useRef(false);
  projectsVisibleRef.current =
    navbarSection === "track" || isViewProjectsModalOpen;

  useEffect(() => {
    if (!projectsVisibleRef.current || apiStatus !== "online") return;
    refreshProjects();
    const id = setInterval(() => {
      if (projectsVisibleRef.current) refreshProjects();
    }, 20000);
    const onFocus = () => refreshProjects();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [navbarSection, isViewProjectsModalOpen, apiStatus, refreshProjects]);

  /* Real notifications, derived from what actually happened to this client's
     reports and questions. Nothing here is invented — if there is no news,
     the panel says so rather than showing filler. */
  const notifications = React.useMemo(() => {
    const items = [];

    for (const p of projectsList) {
      if (p.rawStatus === "PUBLISHED") {
        const mark = p.adminScore ?? null;
        items.push({
          id: `pub-${p.id}`,
          title: `${p.title} was approved${mark !== null ? ` — ${mark}/100` : ""}`,
          detail: p.verdict,
          time: p.date,
          tone: "good",
        });
      } else if (p.rawStatus === "REVIEWING") {
        items.push({
          id: `rev-${p.id}`,
          title: `${p.title} is with the review panel`,
          detail: "An administrator is assessing your submission.",
          time: p.date,
          tone: "pending",
        });
      } else if (p.rawStatus) {
        items.push({
          id: `int-${p.id}`,
          title: `${p.title} submitted`,
          detail: "Queued for processing and review.",
          time: p.date,
          tone: "info",
        });
      }
    }

    for (const q of answeredQueries) {
      items.push({
        id: `q-${q.id}`,
        title: `Your question was answered`,
        detail: q.subject,
        time: (q.respondedAt || q.updatedAt || "").split("T")[0],
        tone: "good",
      });
    }

    // Newest first, and keep the panel short enough to scan.
    return items.sort((a, b) => String(b.time).localeCompare(String(a.time))).slice(0, 8);
  }, [projectsList, answeredQueries]);

  const unreadCount = notifications.length;

  // Submit Business Question Handler

  // "Do Analysis" Handler for New Project — drives the real pipeline when the
  // API is up, otherwise falls through to the original simulation below.
  const handleDoAnalysis = async (e) => {
    e.preventDefault();
    if (!newProjectForm.startupName.trim()) return;

    // Enter / "Next" advances the wizard; only the last step submits.
    if (wizardStep < WIZARD_STEPS.length - 1) {
      setWizardStep((s) => s + 1);
      return;
    }

    if (apiStatus === "online") {
      setIsAnalyzing(true);
      try {
        const result = await submitIntake(
          {
            name: newProjectForm.startupName,
            vertical: "startups",
            tags: [newProjectForm.sector],
            tracks: [],
            customModules: [],
            profile: {
              company: newProjectForm.startupName,
              industry: newProjectForm.sector,
              stage: STAGE_TO_SERVER[newProjectForm.stage] || "Seed",
              geography: newProjectForm.geography,
              model: newProjectForm.businessModel,
              contact: newProjectForm.contact,
            },
            /* The clusters carry the narrative sections of the exported
               strategy report verbatim, and feed the calculators' text
               fallbacks (wtp, breakeven, ask). */
            clusters: {
              market: {
                problem: newProjectForm.description,
                pain: newProjectForm.painPoint,
                wtp: newProjectForm.wtpText,
                icp: newProjectForm.icp,
              },
              viability: {
                revenue: newProjectForm.revenueModel,
                margin: newProjectForm.grossMargin,
                costs: newProjectForm.costDrivers,
                breakeven: newProjectForm.monthsToBreakEven ? `${newProjectForm.monthsToBreakEven} months` : "",
              },
              launch: {
                geography: newProjectForm.geography,
                gtm: newProjectForm.gtmStrategy,
                milestones: newProjectForm.milestones,
                ask: newProjectForm.capitalRequired
                  ? `USD ${Number(newProjectForm.capitalRequired).toLocaleString()}`
                  : "",
              },
            },
            requirements: {
              consumerCommunication: newProjectForm.consumerCommunication,
              reachableConsumers: newProjectForm.reachableConsumers,
              interviewsCompleted: newProjectForm.interviewsCompleted,
              weeklyInteractions: newProjectForm.weeklyInteractions,
              tam: newProjectForm.tam,
              samPercent: newProjectForm.samPercent,
              conversionRate: newProjectForm.conversionRate,
              technical: newProjectForm.technical,
              operational: newProjectForm.operational,
              financial: newProjectForm.financial,
              regulatory: newProjectForm.regulatory,
              teamCapability: newProjectForm.teamCapability,
              ourPrice: newProjectForm.ourPrice,
              competitorLowPrice: newProjectForm.competitorLowPrice,
              competitorHighPrice: newProjectForm.competitorHighPrice,
              capitalRequired: newProjectForm.capitalRequired,
              monthsToBreakEven: newProjectForm.monthsToBreakEven,
              expectedAnnualReturn: newProjectForm.expectedAnnualReturn,
              monthlyMarketingBudget: newProjectForm.monthlyMarketingBudget,
            },
          },
          (label, done, total) => setAnalysisStatusText(`${label} (${done}/${total})…`)
        );

        // Intake only — the report sits at RECEIVED until admin runs the
        // modules, gets Orbita's analysis, adds their own notes, and publishes.
        // Do NOT populate module scores or open the report overview: nothing has
        // been scored yet.
        setProjectsList((prev) => sortNewestFirst([projectFromReport(result.report), ...prev]));
        setIsAnalyzing(false);
        setIsNewProjectModalOpen(false);
        setNewProjectForm(EMPTY_PROJECT_FORM);
        setWizardStep(0);
        setNavbarSection("track");
        alert(
          "Report sent to admin for approval.\n\n" +
          "Our team will review your submission with Orbita AI and publish your strategy report. " +
          "You'll receive the final report by email once it's approved, and it will appear here in My Projects."
        );
        return;
      } catch (err) {
        setIsAnalyzing(false);
        alert(
          `Could not submit your report: ${err.message}\n\n` +
          `The backend must be running to send your submission to admin for review.`
        );
        return;
      }
    }

    // No backend — cannot route to admin, so cannot proceed. Do not fabricate
    // a score: that was the old behaviour that made it look like the report
    // was auto-generated from the user's input.
    setIsAnalyzing(false);
    alert(
      "The intelligence pipeline is offline. Your submission cannot be sent to admin for review right now — " +
      "please try again once the backend is available."
    );
  };

  /* Open a project's report overview on-site. API rows get the full pipeline
     output (module scores + verdict); local sample rows get an overview built
     from what the card knows. The .doc download lives inside the overview. */
  const handleOpenReportOverview = async (p) => {
    if (p.fromApi && apiStatus === "online") {
      try {
        const data = await getReport(p.id);
        setReportOverview({ report: data.report, moduleResults: data.moduleResults || {} });
        return;
      } catch {
        /* fall through to the local shape */
      }
    }
    const m = /\((\d+)%\)/.exec(p.verdict || "");
    setReportOverview({
      report: {
        name: p.title,
        vertical: p.industry,
        status: p.status === "ACTIVE" ? "PUBLISHED" : "PROCESSED",
        score: m ? Number(m[1]) : 0,
        decision: /GO/.test(p.verdict || "") ? 1 : /PIVOT/.test(p.verdict || "") ? 0 : null,
        clusters: { market: { problem: p.description } },
        adminScore: p.adminScore ?? null,
        approvalNote: p.approvalNote ?? null,
        adminOverrides: p.adminOverrides ?? null,
      },
      moduleResults: {},
    });
  };


  // Filtered modules based on search
  const filteredModules = modulesList.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.project.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#4A0A13] font-sans selection:bg-[#D4AF37] selection:text-[#4A0A13] flex flex-col w-full pb-16">
      
      {/* ============================================================
         1. EXECUTIVE TOP NAVBAR (HEADER)
         ============================================================ */}
      <header className="sticky top-0 z-30 w-full bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#D4AF37]/20 px-4 sm:px-8 py-4">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left Title & Breadcrumbs */}
          <div className="flex flex-col text-center md:text-left w-full md:w-auto">
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#4A0A13] tracking-tight">
              Dashboard
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-semibold text-[#8C6D58] mt-0.5">
              <button
                onClick={onGoHome}
                className="hover:text-[#4A0A13] transition cursor-pointer"
              >
                Home
              </button>
              <span>/</span>
              <span className="text-[#4A0A13]">Dashboard</span>
            </div>
          </div>

          {/* Right Header Controls (Search, Bell, Profile Avatar, Logout) */}
          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 w-full md:w-auto">
            
            {/* Search Input Box */}
            <div className="relative flex-1 md:w-72 lg:w-80">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C6D58]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queries, modules, projects..."
                className="w-full bg-[#F5EAD4]/90 border border-[#D4AF37]/40 rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm text-[#4A0A13] placeholder-[#8C6D58]/70 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30 transition shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C6D58] hover:text-[#4A0A13]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setNotificationsRead(true);
                }}
                className="relative p-2 rounded-full hover:bg-[#F5EAD4] text-[#B8860B] transition cursor-pointer"
                title="Notifications"
              >
                <Bell size={20} />
                {!notificationsRead && unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#FAF7F2]" />
                )}
              </button>

              {/* Notifications Popover */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#FAF4E8] border border-[#D4AF37]/50 rounded-2xl shadow-xl p-4 z-50 text-[#4A0A13]"
                  >
                    <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-2 mb-3">
                      <span className="font-bold text-xs uppercase font-mono tracking-wider text-[#B8860B]">
                        Notifications
                      </span>
                      <button
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-[#8C6D58] hover:text-[#4A0A13]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-[#8C6D58] py-4 text-center">
                          Nothing new yet. Submit a venture and you will be told here when it is
                          reviewed and approved.
                        </p>
                      ) : notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl border transition text-xs ${
                            n.tone === "good"
                              ? "bg-emerald-50 border-emerald-200"
                              : n.tone === "pending"
                              ? "bg-amber-50 border-amber-200"
                              : "bg-white/60 border-[#D4AF37]/20"
                          }`}
                        >
                          <p className="font-semibold text-[#4A0A13]">{n.title}</p>
                          {n.detail && (
                            <p className="text-[0.68rem] text-[#7A1C29] mt-0.5 break-words">{n.detail}</p>
                          )}
                          <span className="text-[0.65rem] text-[#8C6D58]">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar */}
            <div
              className="w-9 h-9 rounded-full bg-[#B8860B] hover:bg-[#9A7008] text-white font-extrabold text-xs flex items-center justify-center shadow-xs cursor-pointer select-none transition"
              title={`Executive Profile (${emailName})`}
            >
              {emailInitials}
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout || onGoHome}
              type="button"
              className="flex items-center gap-1 text-xs font-bold text-[#7A1C29] hover:text-[#4A0A13] transition cursor-pointer px-2 py-1 rounded-lg hover:bg-[#F5EAD4]"
              title="Log Out"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>

          </div>
        </div>
      </header>

      {/* ============================================================
         2. MAIN HERO WORKSPACE BANNER (WITH 3 WELCOME CARD BUTTONS)
         ============================================================ */}
      <main className="w-full px-4 sm:px-8 pt-6 sm:pt-8 space-y-8 flex-1">
        
        {/* Banner Card */}
        <div className="relative w-full bg-[#400A12] border border-[#D4AF37]/30 rounded-2xl p-5 sm:p-7 text-[#FAF4E8] shadow-xl">
          
          {/* Subtle Ambient Lighting Background */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(212,175,55,0.18)_0%,transparent_60%)]" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_80%_20%,rgba(245,215,127,0.1)_0%,transparent_50%)]" />
          </div>

          <div className="relative z-10 space-y-3">
            
            {/* Pill Tag: Client Workspace */}
            <div className="inline-block bg-[#FAF4E8] text-[#400A12] font-bold text-[0.7rem] px-3 py-1 rounded-full shadow-xs tracking-wide">
              Client Executive Workspace
            </div>

            {/* Headline: Welcome back, <name from email>! 👋 */}
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#FAF4E8] tracking-tight leading-tight flex items-center gap-2">
              <span>Welcome back, {emailName}!</span>
              <span className="animate-bounce inline-block">👋</span>
            </h2>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-[#FAF4E8]/85 font-sans max-w-3xl leading-relaxed">
              Ready to validate a new business idea? Post your question or problem statement to start structured evaluation across 10 intelligence modules.
            </p>

            {/* ============================================================
               THREE WELCOME CARD BUTTONS (WITH DROPDOWN MENU FOR MY PROJECTS)
               ============================================================ */}
            <div className="pt-2 flex flex-wrap items-center gap-3 relative z-30">
              
              {/* BUTTON 1: ? Post Business Question */}
              <button
                onClick={() => setNavbarSection("queries")}
                type="button"
                className="group flex items-center gap-2 bg-[#C89B3C] hover:bg-[#D4AF37] active:scale-[0.98] text-[#400A12] font-extrabold px-4 sm:px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer border border-[#F5D77F]/40 text-xs tracking-wide"
              >
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#400A12] text-[#C89B3C] font-mono text-[0.65rem] font-bold">
                  ?
                </span>
                <span>Post Business Question</span>
              </button>

              {/* BUTTON 2: My Projects (With Dropdown Menu for View Projects & New Project) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMyProjectsDropdownOpen(!isMyProjectsDropdownOpen)}
                  className="flex items-center gap-2 border border-[#FAF4E8]/40 hover:border-[#FAF4E8] bg-white/10 hover:bg-white/20 active:scale-[0.98] text-[#FAF4E8] font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer text-xs tracking-wide"
                >
                  <Folder size={15} className="text-[#F5D77F]" />
                  <span>My Projects</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 text-[#F5D77F] ${
                      isMyProjectsDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu Popover (Positioned ABOVE the button) */}
                <AnimatePresence>
                  {isMyProjectsDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-2 w-64 bg-[#FAF4E8] border border-[#D4AF37] rounded-2xl shadow-2xl p-2 z-50 text-[#4A0A13] space-y-1"
                    >
                      <div className="px-3 py-1.5 border-b border-[#D4AF37]/30">
                        <p className="font-mono text-[0.68rem] font-extrabold uppercase text-[#B8860B]">
                          Project Directory ({projectsList.length})
                        </p>
                      </div>

                      {/* Dropdown Item 1: View Projects */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMyProjectsDropdownOpen(false);
                          setIsViewProjectsModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F5EAD4] transition text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-[#400A12] text-[#F5D77F]">
                            <Folder size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#4A0A13] group-hover:text-[#B8860B]">
                              View Projects
                            </p>
                            <p className="text-[0.65rem] text-[#8C6D58]">
                              Previous client projects & status
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={13} className="text-[#8C6D58] group-hover:translate-x-0.5 transition" />
                      </button>

                      {/* Dropdown Item 2: New Project */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMyProjectsDropdownOpen(false);
                          setIsNewProjectModalOpen(true);
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F5EAD4] transition text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-[#B8860B] text-white">
                            <FolderPlus size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#4A0A13] group-hover:text-[#B8860B]">
                              New Project
                            </p>
                            <p className="text-[0.65rem] text-[#8C6D58]">
                              Post new startup & run analysis
                            </p>
                          </div>
                        </div>
                        <Sparkles size={13} className="text-[#B8860B]" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* BUTTON 3: New Project Analysis Action */}
              <button
                onClick={() => setIsNewProjectModalOpen(true)}
                type="button"
                className="flex items-center gap-2 bg-[#5C0F1A] hover:bg-[#7A1C29] border border-[#D4AF37]/50 active:scale-[0.98] text-[#FAF4E8] font-extrabold px-4 sm:px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer text-xs tracking-wide"
              >
                <Sparkles size={14} className="text-[#F5D77F]" />
                <span>+ New Project Analysis</span>
              </button>

            </div>

          </div>
        </div>

        {/* ============================================================
           3. THREE NAV SECTIONS BELOW WELCOME CARD (HOMEPAGE NAVBAR FORMAT)
           ============================================================ */}
        <div className="relative z-20 bg-[#F5EAD4]/90 border border-[#D4AF37]/40 rounded-2xl p-2.5 sm:px-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Section tabs. Data-driven so the set stays consistent and the row
              scrolls cleanly on a phone instead of wrapping into a wall. */}
          <nav
            aria-label="Dashboard sections"
            className="flex items-center gap-1.5 sm:gap-2 w-full overflow-x-auto py-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {NAV_SECTIONS.map((section, i) => {
              const Icon = section.icon;
              const active = navbarSection === section.id;
              const count = section.id === "modules" ? 10 : null;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setNavbarSection(section.id)}
                  aria-current={active ? "page" : undefined}
                  title={section.hint}
                  className={`group relative text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap py-2 px-3 sm:px-4 rounded-xl flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                    active
                      ? "bg-[#400A12] text-[#FAF4E8] shadow-md border border-[#D4AF37]/50"
                      : "text-[#4A0A13] hover:bg-[#FAF4E8]/80 hover:text-[#7A1C29]"
                  }`}
                >
                  <Icon size={16} className={active ? "text-[#F5D77F]" : "text-[#B8860B]"} />
                  <span className="hidden sm:inline">{i + 1}. {section.label}</span>
                  <span className="sm:hidden">{section.short}</span>
                  {count !== null && (
                    <span className="text-[0.65rem] px-1.5 rounded-full bg-[#D4AF37]/20 font-mono font-normal">
                      {count}
                    </span>
                  )}
                  {active && (
                    <motion.span layoutId="navbarUnderline" className="absolute -bottom-1 left-3 right-3 h-0.5 bg-[#D4AF37] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Live System Telemetry Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-[#8C6D58] shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[0.68rem]">Systemic Telemetry Live</span>
          </div>

        </div>

        {/* ============================================================
           4. DYNAMIC SECTION CONTENT RENDERER
           ============================================================ */}

        {/* ---------------- SECTION 1: QUERY SECTION ---------------- */}
        {/* ---------------- QUERIES — real client/admin thread ---------------- */}
        {navbarSection === "queries" && (
          <section className="pt-2">
            <QueriesPanel
              role="client"
              clientEmail={userEmail}
              clientName={emailName}
              reportId={projectsList.find((p) => p.fromApi)?.id}
            />
          </section>
        )}

        {/* ---------------- DOCUMENTS — client uploads ---------------- */}
        {navbarSection === "documents" && (
          <section className="space-y-4 pt-2">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-extrabold text-[#400A12]">
                Document Upload
              </h2>
              <p className="text-xs text-[#7A1C29] max-w-2xl">
                Upload the files that support your venture — the reviewer reads these alongside your
                intake answers, so real documents lead to a better-grounded assessment.
              </p>
            </div>

            {/* Attach to a specific submission when one exists. */}
            <div className="space-y-1">
              <label className="font-mono text-[0.68rem] uppercase font-bold text-[#B8860B] tracking-wider" htmlFor="doc-report">
                Attach to which submission?
              </label>
              <select
                id="doc-report"
                value={docReportId}
                onChange={(e) => setDocReportId(e.target.value)}
                className="w-full sm:max-w-md rounded-xl border border-[#D4AF37]/60 bg-white px-3.5 py-2.5 text-xs text-[#4A0A13] focus:border-[#400A12] focus:outline-none cursor-pointer"
              >
                <option value="">General — not tied to one venture</option>
                {projectsList.filter((p) => p.fromApi).map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <p className="text-[0.65rem] text-[#8C6D58]">
                Linking a file to a venture puts it in front of the reviewer handling that report.
              </p>
            </div>

            <DocumentUpload
              key={docReportId || "general"}
              reportId={docReportId || undefined}
              uploadedBy={userEmail}
            />
          </section>
        )}

        {/* ---------------- BRAND EQUITY — Indian assessment ---------------- */}
        {navbarSection === "brand" && (
          <section className="space-y-4 pt-2">
            <BrandEquityForm
              reportId={projectsList.find((p) => p.fromApi)?.id}
              clientEmail={userEmail}
              defaultBrandName={projectsList.find((p) => p.fromApi)?.title || ""}
            />
          </section>
        )}

        {/* ---------------- SECTION 2: MODULE WISE SCORE ---------------- */}
        {navbarSection === "modules" && (
          <section className="space-y-6 pt-2">
            
            {/* Clean Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37]/30 pb-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#4A0A13] flex items-center gap-2">
                  <Layers size={22} className="text-[#B8860B]" />
                  <span>Module Wise Score</span>
                </h3>
                <p className="text-xs text-[#8C6D58] mt-0.5">
                  {moduleSourceProject
                    ? <>Scores from your approved report <strong className="text-[#400A12]">{moduleSourceProject.name}</strong>{typeof moduleSourceProject.score === "number" ? ` — overall ${moduleSourceProject.score}/100` : ""}.</>
                    : "Module scores appear here once an administrator approves one of your reports."}
                </p>
              </div>

              <div className="flex items-center gap-2 bg-[#F5EAD4] px-3.5 py-1.5 rounded-full border border-[#D4AF37]/30 text-xs font-bold text-[#4A0A13]">
                <span className="text-[#B8860B]">Avg Orbital Score:</span>
                <span className="font-mono text-[#400A12] font-extrabold text-sm">84.8%</span>
              </div>
            </div>

            {/* 10 Intelligence Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredModules.map((mod) => {
                const IconComponent = mod.icon;
                return (
                  <div
                    key={mod.id}
                    className="group bg-white/95 border border-[#D4AF37]/35 hover:border-[#D4AF37] rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Code & Score Pill */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[0.68rem] font-bold text-[#B8860B] uppercase bg-[#F5EAD4] px-2.5 py-0.5 rounded-md">
                          {mod.code}
                        </span>
                        
                        {/* HIGHLIGHTED SCORE BADGE */}
                        <div className="flex items-center gap-1.5 bg-[#400A12] text-[#F5D77F] px-3 py-1 rounded-xl border border-[#D4AF37]/40 shadow-xs">
                          <span className="font-mono text-sm font-extrabold">
                            {mod.score}%
                          </span>
                        </div>
                      </div>

                      {/* Icon & Title */}
                      <div className="flex items-start gap-3 pt-1">
                        <div className="p-2.5 rounded-xl bg-[#400A12] text-[#F5D77F] shrink-0 shadow-xs">
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <h4 className="font-serif text-base font-bold text-[#4A0A13] group-hover:text-[#B8860B] transition">
                            {mod.name}
                          </h4>
                          <p className="text-[0.68rem] font-mono text-[#8C6D58]">
                            {mod.category}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#6A4B3A] leading-relaxed line-clamp-2">
                        {mod.desc}
                      </p>

                      {/* Progress Bar */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[0.65rem] font-mono text-[#8C6D58] mb-1">
                          <span>Readiness Metric</span>
                          <span className="font-bold text-[#400A12]">{mod.score}/100</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#F5EAD4] rounded-full overflow-hidden border border-[#D4AF37]/20">
                          <div
                            className="h-full bg-gradient-to-r from-[#C89B3C] to-[#400A12] rounded-full transition-all duration-500"
                            style={{ width: `${mod.score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="pt-3 mt-3 border-t border-[#D4AF37]/20 flex items-center justify-between text-[0.68rem] text-[#8C6D58]">
                      <span className="font-mono">{mod.project}</span>
                      <span className="font-mono">Updated {mod.lastUpdated}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </section>
        )}

        {/* ---------------- SECTION 3: TRACK STATUS ---------------- */}
        {navbarSection === "track" && (
          <section className="space-y-6 pt-2">
            
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37]/30 pb-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-[#4A0A13] flex items-center gap-2">
                  <Activity size={22} className="text-[#B8860B]" />
                  <span>Track Status — Project Evaluation Status Location</span>
                </h3>
                <p className="text-xs text-[#8C6D58] mt-0.5">
                  Pipeline tracking stages, systemic intake telemetry, and active project evaluation status.
                </p>
              </div>

              {/* Global Telemetry Card */}
              <div className="flex items-center gap-3 bg-white/90 border border-[#D4AF37]/40 px-4 py-2 rounded-2xl shadow-xs">
                <div className="flex flex-col">
                  <span className="text-[0.68rem] font-mono text-[#8C6D58]">Overall System Readiness</span>
                  <span className="font-mono text-sm font-extrabold text-[#400A12]">70% (7/10 Modules Complete)</span>
                </div>
              </div>
            </div>

            {/* Pipeline Stage Tracker Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/80 border border-[#D4AF37]/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.65rem] font-bold text-[#B8860B]">STAGE 01</span>
                  <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    RECEIVED
                  </span>
                </div>
                <h4 className="font-serif text-base font-bold text-[#400A12]">Raw Idea Intake</h4>
                <p className="text-xs text-[#8C6D58]">Reviewing problem statement & founder inputs.</p>
              </div>

              <div className="bg-white/80 border border-[#D4AF37]/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.65rem] font-bold text-[#B8860B]">STAGE 02</span>
                  <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    REQUIREMENTS
                  </span>
                </div>
                <h4 className="font-serif text-base font-bold text-[#400A12]">Market Sizing Audit</h4>
                <p className="text-xs text-[#8C6D58]">Mapping TAM/SAM/SOM whitespace vectors.</p>
              </div>

              <div className="bg-white/80 border border-[#D4AF37]/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.65rem] font-bold text-[#B8860B]">STAGE 03</span>
                  <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                    MAPPING
                  </span>
                </div>
                <h4 className="font-serif text-base font-bold text-[#400A12]">Financial Viability</h4>
                <p className="text-xs text-[#8C6D58]">Auditing gross margin & unit payback cycles.</p>
              </div>

              <div className="bg-white/80 border border-[#D4AF37]/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.65rem] font-bold text-[#B8860B]">STAGE 04</span>
                  <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                    DELIVERED
                  </span>
                </div>
                <h4 className="font-serif text-base font-bold text-[#400A12]">Executive Scorecard</h4>
                <p className="text-xs text-[#8C6D58]">Synthesizing final binary verdict matrix.</p>
              </div>
            </div>

            {/* Project table - scrolls inside its own container on desktop and
                collapses to stacked cards on phones, so the page itself never
                scrolls sideways. */}
            <div className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-serif text-base sm:text-lg font-bold text-[#4A0A13]">
                  Project Evaluation Status
                </h4>
                <span className="font-mono text-[0.65rem] text-[#8C6D58]">
                  {projectsList.length} {projectsList.length === 1 ? "venture" : "ventures"}
                </span>
              </div>

              {projectsList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D4AF37]/50 bg-[#FAF4E8]/60 p-8 text-center">
                  <p className="text-sm font-semibold text-[#400A12]">No ventures submitted yet</p>
                  <p className="text-xs text-[#7A1C29] mt-1">
                    Use the Intake Engine to submit your first venture for evaluation.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop / tablet: real table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#4A0A13]">
                      <thead className="bg-[#F5EAD4] font-mono text-[0.66rem] text-[#B8860B] uppercase">
                        <tr>
                          <th scope="col" className="p-3 rounded-l-xl">Project</th>
                          <th scope="col" className="p-3">Industry</th>
                          <th scope="col" className="p-3">Status</th>
                          <th scope="col" className="p-3">Strength</th>
                          <th scope="col" className="p-3">Modules</th>
                          <th scope="col" className="p-3">Date</th>
                          <th scope="col" className="p-3 rounded-r-xl text-right">Report</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D4AF37]/20">
                        {projectsList.map((p) => {
                          const badge = getStatusBadge(p);
                          return (
                            <tr key={p.id} className="hover:bg-[#FAF4E8] transition align-top">
                              <td className="p-3">
                                <span className="font-bold text-[#400A12]">{p.title}</span>
                                <span className="block text-[0.68rem] text-[#8C6D58] font-normal max-w-xs truncate">
                                  {p.verdict}
                                </span>
                              </td>
                              <td className="p-3 text-[#8C6D58] font-mono">{p.industry}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[0.65rem] ${STATUS_BADGE_STYLES[badge.color]}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1">
                                  {p.scoreBand && <StrengthBadge band={p.scoreBand} label="Score" size="sm" />}
                                  {p.dataBand?.band && (
                                    <StrengthBadge
                                      band={p.dataBand.band}
                                      label="Data"
                                      size="sm"
                                      title={`Intake ${p.dataBand.completeness}% complete, ${p.dataBand.words} words of detail`}
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-mono font-bold">{p.modulesProcessed}</td>
                              <td className="p-3 font-mono text-[#8C6D58]">{p.date}</td>
                              <td className="p-3 text-right">
                                {p.rawStatus === "PUBLISHED" ? (
                                  <button
                                    onClick={() => handleOpenReportOverview(p)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#400A12] hover:bg-[#5C0F1A] text-[#F5D77F] text-[0.68rem] font-bold cursor-pointer border border-[#D4AF37]/40"
                                  >
                                    <Eye size={12} /> View
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenReportOverview(p)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-[0.68rem] font-bold cursor-pointer hover:bg-amber-100"
                                  >
                                    <Clock size={12} /> Pending
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Phone: one card per project, same information */}
                  <div className="sm:hidden space-y-3">
                    {projectsList.map((p) => {
                      const badge = getStatusBadge(p);
                      return (
                        <div key={p.id} className="rounded-xl border border-[#D4AF37]/40 bg-[#FAF4E8] p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-[#400A12] break-words">{p.title}</p>
                              <p className="text-[0.68rem] text-[#8C6D58] font-mono">{p.industry}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[0.6rem] shrink-0 ${STATUS_BADGE_STYLES[badge.color]}`}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-[0.7rem] font-bold text-[#400A12]">{p.verdict}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.scoreBand && <StrengthBadge band={p.scoreBand} label="Score" size="sm" />}
                            {p.dataBand?.band && <StrengthBadge band={p.dataBand.band} label="Data" size="sm" />}
                            <span className="font-mono text-[0.62rem] text-[#8C6D58]">
                              {p.modulesProcessed} - {p.date}
                            </span>
                          </div>
                          <button
                            onClick={() => handleOpenReportOverview(p)}
                            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[0.7rem] font-bold cursor-pointer ${
                              p.rawStatus === "PUBLISHED"
                                ? "bg-[#400A12] text-[#F5D77F] border border-[#D4AF37]/40"
                                : "border border-amber-300 bg-amber-50 text-amber-800"
                            }`}
                          >
                            {p.rawStatus === "PUBLISHED"
                              ? <><Eye size={12} /> View Report &amp; Score</>
                              : <><Clock size={12} /> Awaiting Approval</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>


          </section>
        )}

        {/* ---------------- SECTION 4: VERTICAL ENGINES ---------------- */}
        {navbarSection === "engines" && (
          <section className="space-y-6 pt-2">
            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-extrabold text-[#400A12]">Vertical Engines</h2>
              <p className="text-xs text-[#7A1C29]">
                Standalone TAM/SAM/SOM, unit-economics and feasibility calculators per vertical — run
                what-if numbers instantly, no report required.
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                ["startup", "Startups — Market Sizing"],
                ["msme", "MSMEs — Optimization"],
                ["industry", "Industries — Analysis"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setEngineTab(id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    engineTab === id
                      ? "bg-[#400A12] text-[#F5D77F] border border-[#D4AF37]/50"
                      : "bg-[#FAF4E8] text-[#4A0A13] border border-[#D4AF37]/30 hover:bg-[#F5EAD4]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div>
              {engineTab === "startup" && <StartupMarketEngine />}
              {engineTab === "msme" && <MsmeOptimizationEngine />}
              {engineTab === "industry" && <IndustryAnalysisEngine />}
            </div>
          </section>
        )}

        {/* ---------------- SECTION 5: THREE-LAYER INTAKE ENGINE ---------------- */}
        {navbarSection === "intake" && (
          <IntakeEngine
            apiStatus={apiStatus}
            onComplete={(result) => {
              setProjectsList((prev) => sortNewestFirst([projectFromReport(result.report), ...prev]));
              setReportOverview({ report: result.report, moduleResults: result.moduleResults || {} });
              const results = result.moduleResults || {};
              setModulesList((prev) =>
                prev.map((mod, i) => {
                  const run = results[MODULE_KEY_ORDER[i]];
                  return run
                    ? { ...mod, project: result.report.name, status: "COMPLETED", score: Math.round(run.score ?? mod.score), lastUpdated: "Just now" }
                    : mod;
                })
              );
            }}
            onSimulated={(project, localReport) => {
              setProjectsList((prev) => sortNewestFirst([project, ...prev]));
              if (localReport) setReportOverview({ report: localReport, moduleResults: {} });
            }}
          />
        )}

      </main>

      {/* ============================================================
         5. MODAL 1: POST BUSINESS QUESTION
         ============================================================ */}
      <AnimatePresence>
      </AnimatePresence>

      {/* ============================================================
         6. MODAL 2: VIEW MY PROJECTS
         ============================================================ */}
      <AnimatePresence>
        {isViewProjectsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#FAF4E8] border border-[#D4AF37] rounded-3xl p-6 sm:p-8 shadow-2xl relative text-[#4A0A13] max-h-[85vh] flex flex-col"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsViewProjectsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-[#F5EAD4] text-[#8C6D58] hover:text-[#4A0A13] transition cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="space-y-1 mb-5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8860B] uppercase tracking-wider font-mono">
                  <Folder size={14} />
                  <span>Client Portfolio</span>
                </div>
                <h3 className="font-serif text-2xl font-extrabold text-[#400A12]">
                  My Projects & Status Directory
                </h3>
                <p className="text-xs text-[#7A1C29]">
                  All projects posted or updated previously by this client account.
                </p>
              </div>

              {/* Projects List Scrollable Area */}
              <div className="overflow-y-auto space-y-3 pr-1 flex-1 [scrollbar-width:thin]">
                {projectsList.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-4 rounded-2xl border border-[#D4AF37]/35 hover:border-[#D4AF37] transition space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[0.68rem] font-bold text-[#B8860B] uppercase bg-[#F5EAD4] px-2 py-0.5 rounded-md">
                        {p.industry}
                      </span>
                      {(() => {
                        const badge = getStatusBadge(p);
                        return (
                          <span className={`text-[0.65rem] font-bold px-2.5 py-0.5 rounded-full ${STATUS_BADGE_STYLES[badge.color]}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>

                    <h4 className="font-serif text-lg font-bold text-[#400A12]">
                      {p.title}
                    </h4>

                    <p className="text-xs text-[#6A4B3A]">
                      {p.description}
                    </p>

                    <div className="pt-2 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs">
                      <span className="text-[#8C6D58] font-mono text-[0.68rem]">
                        Modules: {p.modulesProcessed}
                      </span>
                      <span className="font-extrabold text-[#400A12]">
                        Verdict: {p.verdict}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenReportOverview(p)}
                      className={`w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.68rem] font-bold transition cursor-pointer ${
                        p.rawStatus === "PUBLISHED"
                          ? "bg-[#400A12] hover:bg-[#5C0F1A] text-[#F5D77F] border border-[#D4AF37]/40"
                          : "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      }`}
                    >
                      {p.rawStatus === "PUBLISHED" ? (
                        <>
                          <Eye size={12} />
                          <span>View Report & Score</span>
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          <span>Awaiting Admin Approval</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 mt-2 border-t border-[#D4AF37]/30 flex items-center justify-between">
                <span className="text-xs text-[#8C6D58] font-mono">
                  Total: {projectsList.length} ventures registered
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewProjectsModalOpen(false);
                    setIsNewProjectModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#400A12] hover:bg-[#5C0F1A] text-[#F5D77F] text-xs font-bold transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>New Project</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
         7. MODAL 3: NEW PROJECT DIALOG BOX (WITH "DO ANALYSIS" BUTTON)
         ============================================================ */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-[#FAF4E8] border border-[#D4AF37] rounded-3xl p-6 sm:p-8 shadow-2xl relative text-[#4A0A13]"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setIsNewProjectModalOpen(false);
                  setWizardStep(0);
                }}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-[#F5EAD4] text-[#8C6D58] hover:text-[#4A0A13] transition cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="space-y-1 mb-5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8860B] uppercase tracking-wider font-mono">
                  <FolderPlus size={14} />
                  <span>Venture Onboarding</span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#400A12]">
                  New Project Analysis
                </h3>
                <p className="text-xs text-[#7A1C29]">
                  Answer the requirements below — the 10 intelligence modules score exactly what you enter.
                  Blank fields fall back to standard assumptions.
                </p>
                {!isAnalyzing && (
                  <div className="flex items-center gap-1.5 pt-2">
                    {WIZARD_STEPS.map((title, i) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => newProjectForm.startupName.trim() && setWizardStep(i)}
                        title={title}
                        className={`h-1.5 flex-1 rounded-full transition cursor-pointer ${
                          i <= wizardStep ? "bg-[#400A12]" : "bg-[#D4AF37]/30"
                        }`}
                      />
                    ))}
                  </div>
                )}
                {!isAnalyzing && (
                  <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[#8C6D58] pt-1">
                    Step {wizardStep + 1} of {WIZARD_STEPS.length} — {WIZARD_STEPS[wizardStep]}
                  </p>
                )}
              </div>

              {isAnalyzing ? (
                <div className="py-10 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-[#D4AF37]/30 border-t-[#400A12] animate-spin" />
                    <Sparkles size={24} className="text-[#B8860B] animate-pulse" />
                  </div>
                  <h4 className="font-serif text-xl font-bold text-[#400A12]">
                    Running Analysis across 10 Modules...
                  </h4>
                  <p className="text-xs font-mono text-[#8C6D58] animate-pulse max-w-md mx-auto">
                    {analysisStatusText}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDoAnalysis} className="space-y-4">
                  {/* STEP 1 — Venture Basics */}
                  {wizardStep === 0 && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className={labelCls}>Startup / Project Name *</label>
                        <input
                          type="text"
                          required
                          value={newProjectForm.startupName}
                          onChange={(e) => setNewProjectForm({ ...newProjectForm, startupName: e.target.value })}
                          placeholder="e.g. AeroPulse Cold-Chain AI"
                          className={fieldCls}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className={labelCls}>Sector / Industry Vertical</label>
                          <select
                            value={newProjectForm.sector}
                            onChange={(e) => setNewProjectForm({ ...newProjectForm, sector: e.target.value })}
                            className={`${fieldCls} cursor-pointer`}
                          >
                            <option value="Healthcare & Logistics">Healthcare & Logistics</option>
                            <option value="HR Tech & Enterprise SaaS">HR Tech & Enterprise SaaS</option>
                            <option value="Fintech & Insurtech">Fintech & Insurtech</option>
                            <option value="AgriTech & Climate">AgriTech & Climate</option>
                            <option value="Retail & E-commerce">Retail & E-commerce</option>
                            <option value="DeepTech & AI">DeepTech & AI Infrastructure</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className={labelCls}>Venture Stage</label>
                          <select
                            value={newProjectForm.stage}
                            onChange={(e) => setNewProjectForm({ ...newProjectForm, stage: e.target.value })}
                            className={`${fieldCls} cursor-pointer`}
                          >
                            <option value="Idea & Problem Validation">Idea & Problem Validation</option>
                            <option value="Early Stage / Seed">Early Stage / Seed (Pre-Revenue)</option>
                            <option value="Early Traction / Series A">Early Traction / Series A</option>
                            <option value="Growth & Expansion">Growth & Expansion</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className={labelCls}>Business Model</label>
                        <select
                          value={newProjectForm.businessModel}
                          onChange={(e) => setNewProjectForm({ ...newProjectForm, businessModel: e.target.value })}
                          className={`${fieldCls} cursor-pointer`}
                        >
                          <option value="B2B Enterprise">B2B — selling to businesses</option>
                          <option value="B2C Consumer">B2C — selling to consumers</option>
                          <option value="B2B2C">B2B2C — through businesses to consumers</option>
                          <option value="Marketplace">Marketplace / platform</option>
                        </select>
                        <p className="text-[0.65rem] text-[#8C6D58]">
                          Drives sector routing, pricing norms and channel strategy across the modules.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ReqText
                          label="Geographic target"
                          value={newProjectForm.geography}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, geography: v })}
                          placeholder="e.g. Chennai, TN"
                        />
                        <ReqText
                          label="Founder contact"
                          value={newProjectForm.contact}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, contact: v })}
                          placeholder="e.g. founder@venture.io"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2 — Market Problem (report section 2) */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <ReqText
                        label="Core market problem"
                        value={newProjectForm.description}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, description: v })}
                        placeholder="What problem do you solve, for whom, and what makes your approach different..."
                        rows={3}
                      />
                      <ReqText
                        label="Customer pain point"
                        value={newProjectForm.painPoint}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, painPoint: v })}
                        placeholder="The specific pain the customer feels today"
                        rows={2}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ReqText
                          label="Ideal customer profile (ICP)"
                          value={newProjectForm.icp}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, icp: v })}
                          placeholder="Who exactly buys this"
                        />
                        <ReqText
                          label="Willingness to pay (WTP)"
                          value={newProjectForm.wtpText}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, wtpText: v })}
                          placeholder='e.g. "150 rupees per order"'
                          hint="Free text — the number in it seeds pricing if you skip the price step."
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 3 — Customer Reach (MOD-01) */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-xl border border-[#D4AF37]/60 bg-white px-3.5 py-3">
                        <div>
                          <p className="text-xs font-bold text-[#4A0A13]">Can you directly reach your customers today?</p>
                          <p className="text-[0.65rem] text-[#8C6D58]">
                            Honest answer — "No" scores customer discovery at 0 and the verdict will say so.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewProjectForm({ ...newProjectForm, consumerCommunication: !newProjectForm.consumerCommunication })}
                          className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer ${
                            newProjectForm.consumerCommunication
                              ? "bg-[#400A12] text-[#F5D77F]"
                              : "bg-[#F5EAD4] text-[#7A1C29]"
                          }`}
                        >
                          {newProjectForm.consumerCommunication ? "YES" : "NO"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ReqNumber
                          label="Reachable customers"
                          value={newProjectForm.reachableConsumers}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, reachableConsumers: v })}
                          placeholder="e.g. 2500"
                          hint="How many you can contact through your current channels."
                        />
                        <ReqNumber
                          label="Discovery interviews done"
                          value={newProjectForm.interviewsCompleted}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, interviewsCompleted: v })}
                          placeholder="e.g. 12"
                          hint="Conversations held to validate the problem."
                        />
                      </div>
                      <ReqNumber
                        label="Customer interactions per week"
                        value={newProjectForm.weeklyInteractions}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, weeklyInteractions: v })}
                        placeholder="e.g. 40"
                        hint="Calls, demos, support chats — any direct contact."
                      />
                    </div>
                  )}

                  {/* STEP 4 — Market Size (MOD-03) */}
                  {wizardStep === 3 && (
                    <div className="space-y-4">
                      <ReqNumber
                        label="Total addressable market (TAM, USD)"
                        value={newProjectForm.tam}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, tam: v })}
                        placeholder="e.g. 500000000"
                        hint="Annual value if every possible customer bought."
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ReqNumber
                          label="Serviceable share (SAM, %)"
                          value={newProjectForm.samPercent}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, samPercent: v })}
                          placeholder="e.g. 18"
                          hint="% of TAM your model can actually serve."
                        />
                        <ReqNumber
                          label="Lead-to-customer conversion (%)"
                          value={newProjectForm.conversionRate}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, conversionRate: v })}
                          placeholder="e.g. 12"
                          hint="Share of qualified leads that become paying customers."
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 5 — Feasibility self-rating (MOD-04) */}
                  {wizardStep === 4 && (
                    <div className="space-y-4">
                      <p className="text-[0.7rem] text-[#7A1C29]">
                        Rate each dimension 0–100 as honestly as you can — these weight directly into the feasibility score.
                      </p>
                      <ReqSlider label="Technical feasibility" value={newProjectForm.technical}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, technical: v })} />
                      <ReqSlider label="Operational readiness" value={newProjectForm.operational}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, operational: v })} />
                      <ReqSlider label="Financial runway" value={newProjectForm.financial}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, financial: v })} />
                      <ReqSlider label="Regulatory clearance" value={newProjectForm.regulatory}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, regulatory: v })} />
                      <ReqSlider label="Team capability" value={newProjectForm.teamCapability}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, teamCapability: v })} />
                    </div>
                  )}

                  {/* STEP 6 — Pricing & Economics (MOD-05, report section 3) */}
                  {wizardStep === 5 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <ReqNumber
                          label="Your monthly price (USD)"
                          value={newProjectForm.ourPrice}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, ourPrice: v })}
                          placeholder="e.g. 2500"
                        />
                        <ReqNumber
                          label="Cheapest competitor"
                          value={newProjectForm.competitorLowPrice}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, competitorLowPrice: v })}
                          placeholder="e.g. 1800"
                        />
                        <ReqNumber
                          label="Priciest competitor"
                          value={newProjectForm.competitorHighPrice}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, competitorHighPrice: v })}
                          placeholder="e.g. 4000"
                        />
                      </div>
                      <ReqText
                        label="Revenue model"
                        value={newProjectForm.revenueModel}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, revenueModel: v })}
                        placeholder="e.g. B2C subscription + per-order commission"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ReqText
                          label="Gross margin target"
                          value={newProjectForm.grossMargin}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, grossMargin: v })}
                          placeholder="e.g. 65% by year 2"
                        />
                        <ReqText
                          label="Key cost drivers"
                          value={newProjectForm.costDrivers}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, costDrivers: v })}
                          placeholder="e.g. raw materials, delivery, staff"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 7 — Investment & Launch (MOD-08 / MOD-09, report section 4) */}
                  {wizardStep === 6 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ReqNumber
                          label="Capital required (USD)"
                          value={newProjectForm.capitalRequired}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, capitalRequired: v })}
                          placeholder="e.g. 1200000"
                          hint="Total investment you're asking for."
                        />
                        <ReqNumber
                          label="Months to break even"
                          value={newProjectForm.monthsToBreakEven}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, monthsToBreakEven: v })}
                          placeholder="e.g. 18"
                          hint="Over 24 months is flagged as hard to justify."
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ReqNumber
                          label="Expected annual return (USD)"
                          value={newProjectForm.expectedAnnualReturn}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, expectedAnnualReturn: v })}
                          placeholder="e.g. 480000"
                        />
                        <ReqNumber
                          label="Monthly marketing budget (USD)"
                          value={newProjectForm.monthlyMarketingBudget}
                          onChange={(v) => setNewProjectForm({ ...newProjectForm, monthlyMarketingBudget: v })}
                          placeholder="e.g. 12000"
                          hint="Determines which go-to-market channels are affordable."
                        />
                      </div>
                      <ReqText
                        label="GTM strategy"
                        value={newProjectForm.gtmStrategy}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, gtmStrategy: v })}
                        placeholder="e.g. Performance marketing + creator amplification + PLG"
                        rows={2}
                      />
                      <ReqText
                        label="Growth milestones"
                        value={newProjectForm.milestones}
                        onChange={(v) => setNewProjectForm({ ...newProjectForm, milestones: v })}
                        placeholder="e.g. Launch -> 10 pilot accounts -> scaled expansion"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Footer: Back / Next / Do Analysis */}
                  <div className="pt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewProjectModalOpen(false);
                        setWizardStep(0);
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#7A1C29] hover:bg-[#F5EAD4] transition cursor-pointer"
                    >
                      Cancel
                    </button>

                    <div className="flex items-center gap-3">
                      {wizardStep > 0 && (
                        <button
                          type="button"
                          onClick={() => setWizardStep((s) => s - 1)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#400A12] border border-[#D4AF37]/60 hover:bg-[#F5EAD4] transition cursor-pointer"
                        >
                          Back
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#400A12] hover:bg-[#5C0F1A] text-[#F5D77F] font-extrabold text-xs shadow-lg transition cursor-pointer border border-[#D4AF37]/40"
                      >
                        {wizardStep < WIZARD_STEPS.length - 1 ? (
                          <>
                            <span>Next</span>
                            <ChevronRight size={14} />
                          </>
                        ) : (
                          <>
                            <Play size={14} className="fill-[#F5D77F]" />
                            <span>Do Analysis</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generated-report overview with the .doc download box */}
      <AnimatePresence>
        {reportOverview && (
          <ReportOverview
            report={reportOverview.report}
            moduleResults={reportOverview.moduleResults}
            onClose={() => setReportOverview(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
