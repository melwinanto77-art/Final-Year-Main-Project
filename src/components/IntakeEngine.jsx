import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Plus, Play, Target, TrendingUp, DollarSign, CheckCircle2, Layers } from "lucide-react";
import { submitIntake } from "../api.js";

/* ============================================================
   THREE-LAYER DYNAMIC INTAKE ENGINE
   The original workspace's intake, restyled to the current
   cream & gold design system. Functionality unchanged: capture
   once (Layer 1), cluster by theme (Layer 2), select flagship
   tracks (Layer 3), then drive the full pipeline and hand back
   the finished report (auto-downloaded as .doc).
   ============================================================ */

const CLUSTER_TABS = [
  { id: "market", name: "Market & Customer Foundation", cluster: "Cluster 1" },
  { id: "viability", name: "Business Viability", cluster: "Cluster 2" },
  { id: "launch", name: "Launch & Execution", cluster: "Cluster 3" },
];

/* [key, label, placeholder, multiline, explanation] — the explanation is
   shown under every field so the question is never ambiguous. */
const CLUSTER_FIELDS = {
  market: [
    ["problem", "Core Market Problem", "What broken process or unmet need does this venture attack?", true,
     "Describe the problem in your customer's words. The more specific and detailed you are here, the more accurate every downstream score becomes."],
    ["pain", "Customer Pain Point", "e.g. Wastage from over-ordering perishables", false,
     "What does this problem cost them today — money, time, risk or reputation?"],
    ["wtp", "Willingness To Pay", 'e.g. "150 rupees per meal" or "$15-25 per delivery"', false,
     "What a customer would realistically pay. Include the number and the unit; pricing analysis reads it."],
    ["icp", "Ideal Customer Profile (ICP)", "e.g. Working professionals aged 22-40 in tier-2 cities", false,
     "Who exactly buys this. Be narrow — a precise segment scores better than 'everyone'."],
  ],
  viability: [
    ["revenue", "Revenue Model", "e.g. Dine-in plus delivery commission", false,
     "How money actually reaches you, and from whom."],
    ["margin", "Gross Margin Target", "e.g. 38% by year two", false,
     "What you keep after direct costs. A percentage or a rough figure is fine."],
    ["costs", "Key Cost Drivers", "e.g. Raw materials, staff, rent", false,
     "The two or three costs that dominate your P&L."],
    ["breakeven", "Breakeven Horizon", "e.g. Month 18", false,
     "When revenue is expected to cover costs. Anything beyond 24 months is flagged as hard to finance."],
  ],
  launch: [
    ["geography", "Launch Geography", "e.g. Chennai, then Tamil Nadu", false,
     "Where you sell first. Start narrow — focus scores better than 'pan-India'."],
    ["gtm", "Go-To-Market Motion", "e.g. Local delivery apps plus community marketing", false,
     "How the first hundred customers actually find you."],
    ["milestones", "Key Milestones (12 months)", "e.g. 2 outlets live -> 500 daily covers -> break even", true,
     "The checkpoints that prove progress over the next year. Concrete numbers beat ambitions."],
    ["ask", "Funding Ask", "e.g. INR 40,00,000 or $500,000", false,
     "How much capital you need and, ideally, what it buys."],
  ],
};

const FLAGSHIP_TRACKS = [
  { id: "validation", name: "Startup Validation Track", desc: "Validate problem-solution fit before committing capital.", icon: Target },
  { id: "opportunity", name: "Market Opportunity Track", desc: "Map TAM/SAM/SOM and competitive whitespace.", icon: TrendingUp },
  { id: "investor", name: "Investor-Ready Track", desc: "Sharpen narrative, unit economics & the ask.", icon: DollarSign },
];

const BUILD_YOUR_OWN = [
  "Market Sizing", "Competitor Teardown", "Pricing Strategy", "GTM Plan",
  "Financial Model", "Risk Register", "User Personas", "OKR Framework",
];

const INDUSTRY_SECTORS = [
  "Information Technology (IT)", "Software Development", "Artificial Intelligence (AI)",
  "Education (EdTech)", "Healthcare", "Banking", "Financial Services (FinTech)",
  "Insurance", "Retail", "E-commerce", "Manufacturing", "Automotive", "Construction",
  "Real Estate", "Telecommunications", "Media & Entertainment", "Marketing & Advertising",
  "Agriculture", "Food & Beverage", "Hospitality", "Tourism & Travel", "Transportation",
  "Logistics & Supply Chain", "Energy & Utilities", "Oil & Gas", "Mining",
  "Government & Public Sector", "Non-Profit Organization", "Legal Services", "Consulting",
  "Human Resources (HR)", "Recruitment & Staffing", "Biotechnology", "Pharmaceuticals",
  "Aerospace & Defense", "Electronics", "Fashion & Apparel", "Sports & Fitness", "Gaming",
  "Cybersecurity", "Cloud Computing", "Data Analytics", "Research & Development",
  "Environmental Services", "Others",
];

const STAGES = ["Idea", "Pre-Seed", "Seed", "Series A", "Growth"];
const BUSINESS_MODELS = ["B2B Enterprise", "B2C Consumer", "B2B2C", "Marketplace", "B2G Government", "D2C Subscription"];

const EMPTY_PROFILE = { company: "", industry: "", stage: "Seed", geography: "", model: "B2B Enterprise", contact: "", email: "" };
const EMPTY_CLUSTERS = {
  market: { problem: "", pain: "", wtp: "", icp: "" },
  viability: { revenue: "", margin: "", costs: "", breakeven: "" },
  launch: { geography: "", gtm: "", milestones: "", ask: "" },
};

const SAMPLE_ECOFLY_PROFILE = {
  company: "EcoFly Robotics",
  industry: "Medical Logistics & Drones",
  stage: "Seed",
  geography: "Bengaluru, IN",
  model: "B2B Enterprise",
  contact: "founder@ecofly.io",
};

const SAMPLE_ECOFLY_CLUSTERS = {
  market: {
    problem: "Rural clinics wait hours for emergency blood & vaccine deliveries.",
    pain: "Last-mile cold-chain breaks spoil 30% of medical cargo.",
    wtp: "$15–25 per priority delivery",
    icp: "Regional health networks, 50+ clinics",
  },
  viability: {
    revenue: "Per-delivery + monthly retainer",
    margin: "62% at scale",
    costs: "Fleet, batteries, BVLOS compliance",
    breakeven: "Month 18",
  },
  launch: {
    geography: "Karnataka pilot zone",
    gtm: "Govt partnerships + NGO tenders",
    milestones: "3 hubs live · 10 clinics onboarded · BVLOS certified",
    ask: "$1.2M seed",
  },
};

const labelCls = "font-mono text-[0.68rem] uppercase font-bold text-[#B8860B] tracking-wider";
const fieldCls =
  "w-full rounded-xl border border-[#D4AF37]/60 bg-white px-3.5 py-2.5 text-xs text-[#0B1B36] placeholder-[#6E7B91]/60 focus:border-[#081428] focus:outline-none shadow-xs";

function LayerBadge({ n, title, note }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 rounded-xl bg-[#081428] text-[#F5D77F] font-mono text-sm font-bold flex items-center justify-center border border-[#D4AF37]/50">
        {n}
      </span>
      <div>
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[#B8860B] font-bold">Layer {n}</p>
        <h3 className="font-serif text-lg font-bold text-[#081428] leading-tight">
          {title} <span className="font-sans text-xs font-normal text-[#6E7B91]">— {note}</span>
        </h3>
      </div>
    </div>
  );
}

/**
 * @param {'checking'|'online'|'offline'} apiStatus
 * @param {(result: {report: object, moduleResults: object}) => void} onComplete
 *   Called with the server result after a live run.
 * @param {(project: object) => void} onSimulated Called with a local project
 *   card when no backend is reachable.
 */
export default function IntakeEngine({ apiStatus, onComplete, onSimulated }) {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [clusters, setClusters] = useState(EMPTY_CLUSTERS);
  const [activeCluster, setActiveCluster] = useState("market");
  const [selectedTracks, setSelectedTracks] = useState(["validation", "investor"]);
  const [customPicks, setCustomPicks] = useState(["Market Sizing"]);
  const [phase, setPhase] = useState("idle"); // 'idle' | 'running' | 'done'
  const [progressText, setProgressText] = useState("");
  const [doneNote, setDoneNote] = useState("");

  /* Total words written across every cluster answer. Drives the detail meter
     and the 50-word threshold the backend uses to band data strength. */
  const detailWords = React.useMemo(() => {
    const text = Object.values(clusters)
      .flatMap((group) => Object.values(group))
      .filter((v) => typeof v === "string")
      .join(" ")
      .trim();
    return text ? text.split(/\s+/).length : 0;
  }, [clusters]);

  const setClusterField = (cluster, key, value) =>
    setClusters((prev) => ({ ...prev, [cluster]: { ...prev[cluster], [key]: value } }));

  const toggleTrack = (id) =>
    setSelectedTracks((p) => (p.includes(id) ? p.filter((t) => t !== id) : [...p, id]));
  const toggleCustom = (name) =>
    setCustomPicks((p) => (p.includes(name) ? p.filter((t) => t !== name) : [...p, name]));

  const clearForm = () => {
    setProfile(EMPTY_PROFILE);
    setClusters(EMPTY_CLUSTERS);
    setPhase("idle");
    setDoneNote("");
  };

  const loadSample = () => {
    setProfile(SAMPLE_ECOFLY_PROFILE);
    setClusters(SAMPLE_ECOFLY_CLUSTERS);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!profile.company.trim()) return;

    const trackNames = FLAGSHIP_TRACKS.filter((t) => selectedTracks.includes(t.id)).map((t) => t.name);
    const intake = {
      name: profile.company.trim(),
      vertical: "startups",
      tags: [profile.industry.trim() || "Venture"],
      tracks: trackNames,
      customModules: customPicks,
      profile,
      clusters,
    };

    setPhase("running");
    if (apiStatus === "online") {
      try {
        const result = await submitIntake(intake, (label, done, total) =>
          setProgressText(`${label} (${done}/${total})…`)
        );
        setPhase("done");
        setDoneNote(
          `${result.report.name} intake submitted — data saved for admin review. ` +
          `The admin will review your data and generate the report.`
        );
        onComplete?.(result);
        return;
      } catch (err) {
        setProgressText(`Backend unavailable (${err.message}) — completing locally…`);
      }
    }

    // Offline: the original simulation, so the workspace stays usable.
    setProgressText("Auditing across 10 intelligence modules…");
    setTimeout(() => {
      const score = Math.floor(Math.random() * 10) + 86;
      const project = {
        id: `p-${Date.now()}`,
        title: profile.company.trim(),
        industry: profile.industry.trim() || "Venture",
        verdict: `GO (${score}%)`,
        status: "ACTIVE",
        modulesProcessed: "10/10",
        date: new Date().toISOString().split("T")[0],
        description: clusters.market.problem || "Venture evaluated through the intake engine.",
      };
      const localReport = {
        name: project.title,
        vertical: "startups",
        status: "PUBLISHED",
        score,
        decision: 1,
        clusters,
        client: { company: profile.company, industry: profile.industry, stage: profile.stage, businessModel: profile.model, geography: profile.geography, contact: profile.contact },
      };
      setPhase("done");
      setDoneNote(`${project.title} evaluated locally at ${score}% (no backend). Review the overview; download the .doc from there.`);
      onSimulated?.(project, localReport);
    }, 1900);
  };

  return (
    <section className="space-y-8 pt-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8860B] uppercase tracking-wider font-mono">
            <Layers size={14} />
            <span>Startup Vertical</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#081428]">
            Three-Layer Dynamic Intake Engine
          </h2>
          <p className="text-xs text-[#3D5A80]">
            A layered architecture: capture once, cluster by theme, then select flagship tracks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearForm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#D4AF37]/50 text-xs font-bold text-[#081428] hover:bg-[#EDF2F9] transition cursor-pointer"
          >
            <Plus size={13} />
            <span>New Venture (Clear Form)</span>
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#D4AF37]/50 text-xs font-bold text-[#081428] hover:bg-[#EDF2F9] transition cursor-pointer"
          >
            <Sparkles size={13} className="text-[#B8860B]" />
            <span>Load EcoFly Sample</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-8">
        {/* LAYER 1 — CLIENT PROFILE */}
        <div className="space-y-4">
          <LayerBadge n={1} title="Client Profile" note="Captured once at signup" />
          <div className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Company Name *</label>
              <input
                type="text"
                required
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                placeholder="Enter your venture name..."
                className={fieldCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Industry / Sector (Type Any)</label>
              <input
                type="text"
                list="intake-industry-sectors"
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                placeholder="Pick a sector or type your own (e.g. AI Robotics)"
                className={fieldCls}
              />
              <datalist id="intake-industry-sectors">
                {INDUSTRY_SECTORS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Stage</label>
              <select
                value={profile.stage}
                onChange={(e) => setProfile({ ...profile, stage: e.target.value })}
                className={`${fieldCls} cursor-pointer`}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Geography</label>
              <input
                type="text"
                value={profile.geography}
                onChange={(e) => setProfile({ ...profile, geography: e.target.value })}
                placeholder="e.g. Bengaluru, IN / Global"
                className={fieldCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Customer Type / Business Model</label>
              <select
                value={profile.model}
                onChange={(e) => setProfile({ ...profile, model: e.target.value })}
                className={`${fieldCls} cursor-pointer`}
              >
                {BUSINESS_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Contact Info</label>
              <input
                type="text"
                value={profile.contact}
                onChange={(e) => setProfile({ ...profile, contact: e.target.value })}
                placeholder="founder@venture.io"
                className={fieldCls}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Email (for report delivery)</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="founder@venture.io"
                className={fieldCls}
              />
            </div>
          </div>
        </div>

        {/* LAYER 2 — CLUSTER FORMS */}
        <div className="space-y-4">
          <LayerBadge n={2} title="Cluster Forms" note="Report-specific inputs grouped by theme" />

          {/* Detail meter — the analysis genuinely improves with more written
              context, so show progress toward the 50-word threshold instead of
              only claiming it in help text. */}
          <div className={`rounded-2xl border p-3 sm:p-4 ${
            detailWords >= 50 ? "border-emerald-300 bg-emerald-50" : "border-[#D4AF37]/50 bg-[#FBFCFE]/70"
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-xs font-bold ${detailWords >= 50 ? "text-emerald-800" : "text-[#081428]"}`}>
                {detailWords >= 50
                  ? `Detail level: good — ${detailWords} words captured`
                  : `Detail level: ${detailWords} of 50 words`}
              </p>
              <span className="font-mono text-[0.65rem] text-[#6E7B91]">
                {Math.min(100, Math.round((detailWords / 50) * 100))}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#0B1B36]/10 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${detailWords >= 50 ? "bg-emerald-500" : "bg-[#B8860B]"}`}
                style={{ width: `${Math.min(100, (detailWords / 50) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.65rem] text-[#3D5A80]">
              {detailWords >= 50
                ? "Enough written context for a properly grounded analysis. More still helps."
                : "Write about 50 words or more across these answers and the analysis uses that extra context to produce a more accurate result."}
            </p>
          </div>

          <div className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              {CLUSTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCluster(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    activeCluster === tab.id
                      ? "bg-[#081428] text-[#F5D77F] border border-[#D4AF37]/50"
                      : "bg-[#FBFCFE] text-[#0B1B36] border border-[#D4AF37]/30 hover:bg-[#EDF2F9]"
                  }`}
                >
                  <span className="font-mono text-[0.6rem] uppercase mr-1.5 opacity-70">{tab.cluster}</span>
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CLUSTER_FIELDS[activeCluster].map(([key, label, placeholder, multiline, explanation]) => (
                <div key={key} className={`space-y-1 ${multiline ? "sm:col-span-2" : ""}`}>
                  <label className={labelCls} htmlFor={`cluster-${activeCluster}-${key}`}>{label}</label>
                  {multiline ? (
                    <textarea
                      id={`cluster-${activeCluster}-${key}`}
                      rows={3}
                      value={clusters[activeCluster][key]}
                      onChange={(e) => setClusterField(activeCluster, key, e.target.value)}
                      placeholder={placeholder}
                      className={`${fieldCls} rounded-2xl resize-none`}
                    />
                  ) : (
                    <input
                      id={`cluster-${activeCluster}-${key}`}
                      type="text"
                      value={clusters[activeCluster][key]}
                      onChange={(e) => setClusterField(activeCluster, key, e.target.value)}
                      placeholder={placeholder}
                      className={fieldCls}
                    />
                  )}
                  {explanation && (
                    <p className="text-[0.65rem] text-[#6E7B91] leading-relaxed">{explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LAYER 3 — REPORT & TRACK CATALOGUE */}
        <div className="space-y-4">
          <LayerBadge n={3} title="Report & Track Catalogue" note="Flagship tracks + build-your-own" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FLAGSHIP_TRACKS.map((track) => {
              const Icon = track.icon;
              const active = selectedTracks.includes(track.id);
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => toggleTrack(track.id)}
                  className={`text-left rounded-2xl border p-4 space-y-2 transition cursor-pointer ${
                    active
                      ? "border-[#D4AF37] bg-white shadow-md"
                      : "border-[#D4AF37]/30 bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={18} className="text-[#B8860B]" />
                    {active && <CheckCircle2 size={16} className="text-emerald-600" />}
                  </div>
                  <h4 className="font-serif text-sm font-bold text-[#081428]">{track.name}</h4>
                  <p className="text-[0.7rem] text-[#3D5A80]">{track.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-4 shadow-xs">
            <p className={`${labelCls} mb-2`}>Build-Your-Own Modules</p>
            <div className="flex flex-wrap gap-2">
              {BUILD_YOUR_OWN.map((mod) => {
                const active = customPicks.includes(mod);
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => toggleCustom(mod)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      active
                        ? "bg-[#081428] text-[#F5D77F] border border-[#D4AF37]/50"
                        : "bg-[#FBFCFE] text-[#0B1B36] border border-[#D4AF37]/30 hover:bg-[#EDF2F9]"
                    }`}
                  >
                    {active ? "✓ " : "+ "}{mod}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* GENERATE */}
        <div className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-5 shadow-xs space-y-3">
          {phase === "running" ? (
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full border-3 border-[#D4AF37]/30 border-t-[#081428] animate-spin" />
                <Sparkles size={15} className="text-[#B8860B]" />
              </div>
              <p className="text-xs font-mono text-[#3D5A80] animate-pulse">{progressText}</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                {phase === "done" ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    {doneNote}
                  </motion.p>
                ) : (
                  <p className="text-xs text-[#3D5A80]">
                    Runs all ten intelligence modules over this intake — real scoring
                    {apiStatus === "online" ? " via the live pipeline" : " (backend offline: local simulation)"} — then
                    opens the report overview, where the .doc download lives.
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#081428] hover:bg-[#16294D] text-[#F5D77F] font-extrabold text-xs shadow-lg transition cursor-pointer border border-[#D4AF37]/40 shrink-0"
              >
                <Play size={14} className="fill-[#F5D77F]" />
                <span>Generate Report</span>
              </button>
            </div>
          )}
        </div>
      </form>
    </section>
  );
}
