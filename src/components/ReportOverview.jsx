import React from "react";
import { motion } from "framer-motion";
import { X, Download, FileText, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { downloadReportDoc } from "../reportDoc.js";
import { downloadReportDocx } from "../api.js";

/* ============================================================
   REPORT OVERVIEW — on-site preview of the generated strategy
   report. Mirrors the .doc's sections so the user can read the
   verdict first and download the Word document only if they
   want it, from the download box at the top.
   ============================================================ */

const MODULE_LABELS = {
  customerDiscovery: "MOD-01 Customer Discovery",
  profiling: "MOD-02 Profiling",
  marketSize: "MOD-03 Market Size",
  feasibility: "MOD-04 Feasibility",
  pricing: "MOD-05 Pricing",
  marketResearch: "MOD-06 Market Research",
  industryReport: "MOD-07 Industry Report",
  businessModelValidation: "MOD-08 Business Model",
  gtm: "MOD-09 Go-To-Market",
  okr: "MOD-10 OKR",
};

function Row({ label, value }) {
  if (!value || (typeof value === "string" && !value.trim())) return null;
  return (
    <div className="flex gap-3 text-xs">
      <span className="w-40 shrink-0 font-bold text-[#8C6D58]">{label}</span>
      <span className="text-[#4A0A13]">{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-[0.68rem] uppercase font-bold text-[#B8860B] tracking-wider border-b border-[#D4AF37]/30 pb-1">
        {title}
      </h3>
      <div className="space-y-1.5">{rows}</div>
    </div>
  );
}

export default function ReportOverview({ report, moduleResults = {}, onClose }) {
  if (!report) return null;

  const clusters = report.clusters || {};
  const market = clusters.market || {};
  const viability = clusters.viability || {};
  const launch = clusters.launch || {};
  const client = typeof report.client === "object" && report.client ? report.client : {};
  const verdict = moduleResults.industryReport?.output?.decision || null;

  const score = report.score ?? 0;
  const decisionLabel =
    report.decision === 1 ? "GO / PROCEED" : report.decision === 0 ? "PIVOT" : "PENDING";
  const decisionTone =
    report.decision === 1
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : report.decision === 0
      ? "bg-red-100 text-red-800 border-red-300"
      : "bg-amber-100 text-amber-800 border-amber-300";

  const scoredModules = Object.entries(MODULE_LABELS).filter(([key]) => moduleResults[key]);

  /* A report only becomes readable once an admin has reviewed and published
     it. Before that the client sees a waiting notice instead of a zero score,
     an empty verdict and a download of an unapproved document. */
  const pending = Boolean(report.status) && report.status !== "PUBLISHED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl border border-[#D4AF37] bg-[#FAF4E8] p-6 sm:p-8 shadow-2xl space-y-6 text-[#4A0A13]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8860B] uppercase tracking-wider font-mono">
              <FileText size={14} />
              <span>Executive Strategy Report</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#400A12]">{report.name}</h2>
            <p className="text-xs text-[#7A1C29] font-mono">
              {String(report.vertical || "startups").toUpperCase()} · {report.status || "PUBLISHED"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F5EAD4] text-[#8C6D58] hover:text-[#4A0A13] transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Waiting for approval — nothing below is released until then */}
        {pending && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center space-y-2">
            <p className="text-3xl">⏳</p>
            <p className="text-sm font-bold text-amber-900">Waiting for admin approval</p>
            <p className="text-xs text-amber-800 max-w-md mx-auto">
              Your intake has been submitted and is queued for review. An administrator will
              process the ten intelligence modules and approve the result — the score, verdict
              and downloadable report unlock here the moment that happens.
            </p>
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-amber-700 pt-1">
              Current stage: {report.status}
            </p>
          </div>
        )}

        {/* Admin verified score (when available) */}
        {!pending && report.adminScore !== null && report.adminScore !== undefined && (
          <div className="mb-2 p-4 border border-green-500/20 rounded-lg bg-green-500/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-semibold">Verified Score</span>
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                ✓ Verified
              </span>
            </div>
            <div className="text-4xl font-bold text-green-400">{report.adminScore}<span className="text-lg text-green-400/60">/100</span></div>
            {report.approvalNote && <p className="mt-2 text-sm text-[#CFCFCF]">{report.approvalNote}</p>}
          </div>
        )}

        {/* Score + verdict strip */}
        {!pending && (
        <div className="rounded-2xl border-2 border-[#D4AF37] bg-white p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="text-center">
            <p className="font-mono text-[0.65rem] uppercase font-bold text-[#B8860B] tracking-wider">Venture Orbital Score</p>
            <p className="font-serif text-4xl font-extrabold text-[#B8860B]">{score}<span className="text-lg text-[#8C6D58]"> / 100</span></p>
          </div>
          <span className={`px-3 py-1 rounded-full border text-xs font-extrabold ${decisionTone}`}>
            {decisionLabel}
          </span>
          {verdict?.headline && (
            <p className="text-xs italic text-[#7A1C29] flex-1 min-w-52">"{verdict.headline}"</p>
          )}
        </div>
        )}

        {/* Download box */}
        {!pending && (
        <div className="rounded-2xl border border-[#D4AF37]/60 bg-[#F5EAD4]/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileText size={26} className="text-[#B8860B] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#400A12]">Full report as Word document</p>
              <p className="text-[0.7rem] text-[#7A1C29]">
                Everything below plus module findings and history, formatted for sharing — opens in MS Word.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {/* The server-rendered .docx is the document the admin approved,
                including their written analysis — so it is the one to offer
                first. The client-side .doc stays as an offline fallback. */}
            {report.id && (
              <button
                onClick={() =>
                  downloadReportDocx(report.id, `${report.name || "strategy-report"}.docx`)
                    .catch((err) => alert(err.message || "Could not download the report."))
                }
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#400A12] hover:bg-[#5C0F1A] text-[#F5D77F] font-extrabold text-xs shadow-lg transition cursor-pointer border border-[#D4AF37]/40"
              >
                <Download size={14} />
                <span>Download .docx</span>
              </button>
            )}
            <button
              onClick={() => downloadReportDoc(report, moduleResults)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#D4AF37]/60 bg-[#FAF4E8] hover:bg-[#F5EAD4] text-[#400A12] font-bold text-xs transition cursor-pointer"
            >
              <FileText size={14} />
              <span>.doc</span>
            </button>
          </div>
        </div>
        )}

        {/* Executive verdict */}
        {!pending && verdict && (
          <div className="rounded-2xl border border-[#D4AF37]/40 bg-white p-5 space-y-3">
            <h3 className="font-mono text-[0.68rem] uppercase font-bold text-[#B8860B] tracking-wider">Executive Verdict</h3>
            {verdict.rationale && <p className="text-xs text-[#4A0A13]">{verdict.rationale}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {(verdict.strengths || []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={12} /> Strengths</p>
                  {verdict.strengths.map((s, i) => <p key={i} className="text-[#4A0A13]">• {s}</p>)}
                </div>
              )}
              {(verdict.risks || []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-red-700 flex items-center gap-1"><AlertTriangle size={12} /> Risks</p>
                  {verdict.risks.map((s, i) => <p key={i} className="text-[#4A0A13]">• {s}</p>)}
                </div>
              )}
              {(verdict.nextActions || []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-[#B8860B] flex items-center gap-1"><ArrowRight size={12} /> Next Actions</p>
                  {verdict.nextActions.map((s, i) => <p key={i} className="text-[#4A0A13]">• {s}</p>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Module scores — collapsible auto-generated pipeline scores */}
        {!pending && scoredModules.length > 0 && (
          <details className="rounded-2xl border border-[#D4AF37]/40 bg-white p-5 space-y-3">
            <summary className="text-sm text-[#9A9A9A] cursor-pointer hover:text-[#CFCFCF] font-mono text-[0.68rem] uppercase font-bold tracking-wider">
              Auto-generated Pipeline Score: {score}/100
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {scoredModules.map(([key, label]) => {
                const s = moduleResults[key]?.score;
                const adminOverride = report.adminOverrides?.[key];
                return (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/30 bg-[#FAF4E8] px-3 py-2">
                    <span className="text-xs font-medium text-[#4A0A13]">{label}</span>
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <div className="flex-1 bg-[#4A0A13]/10 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#B8860B] h-1.5 rounded-full" style={{ width: `${s ?? 0}%` }} />
                      </div>
                      <span className="font-mono text-xs font-bold text-[#400A12]">{s ?? "—"}</span>
                      {adminOverride !== undefined && (
                        <span className="text-[#D4AF37] flex items-center gap-1">
                          ✓ {adminOverride}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {/* Intake sections — mirrors the .doc */}
        <div className="rounded-2xl border border-[#D4AF37]/40 bg-white p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <Section title="1. Executive & Venture Profile">
            <Row label="Company" value={client.company || report.name} />
            <Row label="Industry" value={client.industry || (report.tags || [])[0]} />
            <Row label="Stage" value={client.stage} />
            <Row label="Business Model" value={client.businessModel} />
            <Row label="Geography" value={client.geography || launch.geography} />
            <Row label="Contact" value={client.contact} />
            <Row label="Capital Ask" value={launch.ask} />
          </Section>
          <Section title="2. Market Opportunity">
            <Row label="Core Problem" value={market.problem} />
            <Row label="Pain Point" value={market.pain} />
            <Row label="ICP" value={market.icp} />
            <Row label="Willingness To Pay" value={market.wtp} />
          </Section>
          <Section title="3. Business Economics">
            <Row label="Revenue Model" value={viability.revenue} />
            <Row label="Gross Margin" value={viability.margin} />
            <Row label="Cost Drivers" value={viability.costs} />
            <Row label="Breakeven" value={viability.breakeven} />
          </Section>
          <Section title="4. Launch & GTM">
            <Row label="GTM Strategy" value={launch.gtm} />
            <Row label="Milestones" value={launch.milestones} />
          </Section>
        </div>
      </motion.div>
    </div>
  );
}
