import React, { useState, useEffect } from "react";
import { getHealth, runAiAssessment } from "../api.js";
import { Brain, Loader2, ArrowDownToLine, AlertTriangle, CheckCircle2, Lightbulb, HelpCircle } from "lucide-react";

/* ============================================================
   AI REPORT ASSESSMENT — the analyst's recommendation.

   Reads the whole report and returns a mark with its reasoning,
   per-dimension breakdown, evidence-backed strengths/risks,
   concrete suggestions and the data gaps to chase.

   The mark is a RECOMMENDATION. "Use this mark" prefills the
   admin's review form; the admin can accept, adjust or ignore it,
   and what they submit is what publishes.
   ============================================================ */

const VERDICT_STYLES = {
  GO: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CONDITIONAL: "bg-amber-100 text-amber-800 border-amber-300",
  PIVOT: "bg-orange-100 text-orange-800 border-orange-300",
  REJECT: "bg-red-100 text-red-800 border-red-300",
};

const CONFIDENCE_STYLES = {
  HIGH: "bg-emerald-100 text-emerald-800 border-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-red-100 text-red-800 border-red-300",
};

const DIMENSION_LABELS = {
  marketOpportunity: "Market opportunity",
  customerEvidence: "Customer evidence",
  businessModel: "Business model",
  competitivePosition: "Competitive position",
  executionReadiness: "Execution readiness",
};

const CONFIDENCE_MEANING = {
  HIGH: "The intake is substantially complete with real numbers — the mark is well supported.",
  MEDIUM: "Some evidence is missing. Sanity-check the mark before publishing.",
  LOW: "Key evidence is missing. Ask the client for more before you publish a mark.",
};

function List({ title, items, tone, icon: Icon }) {
  if (!items?.length) return null;
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    gold: "border-[#D4AF37]/40 bg-[#FAF4E8] text-[#4A0A13]",
  };
  const heads = {
    emerald: "text-emerald-700",
    red: "text-red-700",
    blue: "text-blue-700",
    gold: "text-[#B8860B]",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <span className={`text-[0.65rem] uppercase font-bold flex items-center gap-1 ${heads[tone]}`}>
        {Icon && <Icon size={11} />} {title}
      </span>
      <ul className="mt-1.5 space-y-1 list-disc list-inside text-[0.7rem]">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

/**
 * @param {string} reportId
 * @param {(assessment: object) => void} onApply Prefills the review form from
 *   the recommendation. The admin still submits the final mark.
 * @param {string|number} currentAdminScore What the admin has typed so far,
 *   used to show how far they diverge from the recommendation.
 */
export default function AiAssessmentPanel({ reportId, onApply, currentAdminScore }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /* null until health answers; false means no API key is configured. */
  const [aiLive, setAiLive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((h) => { if (!cancelled) setAiLive(Boolean(h?.integrations?.gemini)); })
      .catch(() => { /* health unreachable — say nothing rather than guess */ });
    return () => { cancelled = true; };
  }, []);

  const run = async () => {
    if (!reportId) return;
    setLoading(true);
    setError("");
    try {
      // Admin-only endpoint, so this must carry the session token.
      const payload = await runAiAssessment(reportId);
      setAssessment(payload.assessment);
    } catch (err) {
      setError(err.message || "Assessment failed.");
    } finally {
      setLoading(false);
    }
  };

  const typed = Number(currentAdminScore);
  const divergence =
    assessment && Number.isFinite(typed) && currentAdminScore !== ""
      ? typed - assessment.recommendedScore
      : null;

  return (
    <div className="p-4 sm:p-5 border-t border-[#D4AF37]/30 space-y-3 bg-white">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-sm text-[#4A0A13] flex items-center gap-1.5">
            <Brain size={14} className="text-[#D4AF37]" />
            AI Report Assessment
          </h3>
          <p className="text-[0.65rem] text-[#7A1C29] max-w-xl">
            The analyst reads the intake, all module outputs, uploaded documents and the brand
            assessment, then recommends a mark with its reasoning. You decide the mark that
            publishes — this only advises.
          </p>
          {/* A missing key is otherwise invisible: the panel still works, it
              just returns the arithmetic baseline instead of a real review. */}
          {aiLive === false && (
            <p className="mt-1.5 text-[0.65rem] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 inline-block">
              AI model not configured — showing the deterministic baseline. Add
              <code className="mx-1 font-mono">GEMINI_API_KEY</code> to
              <code className="mx-1 font-mono">server_python/.env</code> for a reasoned review.
            </p>
          )}
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-full bg-[#4A0A13] text-[#F5D77F] px-4 py-1.5 text-[0.7rem] font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[#5C0F1A] disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
          {loading ? "Analysing the report…" : assessment ? "Re-run assessment" : "Run AI Assessment"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-[0.7rem] text-red-700">
          {error}
        </div>
      )}

      {assessment && (
        <div className="space-y-3">
          {/* Recommended mark */}
          <div className="rounded-xl border-2 border-[#D4AF37] bg-[#FBF7ED] p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <span className="text-[0.6rem] uppercase font-bold text-[#B8860B] tracking-wider block">
                Recommended mark
              </span>
              <span className="font-serif text-3xl font-extrabold text-[#B8860B]">
                {assessment.recommendedScore}
                <span className="text-base text-[#8C6D58]"> / 100</span>
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={`px-2.5 py-0.5 rounded-full border text-[0.65rem] font-extrabold uppercase ${VERDICT_STYLES[assessment.verdict] || VERDICT_STYLES.CONDITIONAL}`}>
                {assessment.verdict}
              </span>
              <span
                title={CONFIDENCE_MEANING[assessment.confidence]}
                className={`px-2.5 py-0.5 rounded-full border text-[0.6rem] font-bold uppercase ${CONFIDENCE_STYLES[assessment.confidence] || CONFIDENCE_STYLES.MEDIUM}`}
              >
                {assessment.confidence} confidence
              </span>
            </div>

            <button
              onClick={() => onApply?.(assessment)}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#F5D77F] text-[#4A0A13] px-4 py-2 text-[0.7rem] font-extrabold cursor-pointer border border-[#4A0A13]/20 shrink-0"
            >
              <ArrowDownToLine size={12} />
              Use this mark
            </button>
          </div>

          {/* Evidence + divergence, so a LOW-confidence mark is not published blind */}
          <div className="flex flex-wrap items-center gap-2 text-[0.65rem]">
            {assessment.evidence && (
              <span className="px-2 py-1 rounded-lg border border-[#D4AF37]/40 bg-[#FAF4E8] text-[#7A1C29]">
                Evidence: {assessment.evidence.completeness}% complete · {assessment.evidence.words} words
                {!assessment.evidence.enriched && " · thin"}
              </span>
            )}
            {assessment.live === false && (
              <span className="px-2 py-1 rounded-lg border border-[#D4AF37]/40 bg-[#FAF4E8] text-[#7A1C29]">
                deterministic baseline — no live model
              </span>
            )}
            {divergence !== null && divergence !== 0 && (
              <span className="px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 font-bold">
                Your mark is {divergence > 0 ? "+" : ""}{divergence} vs the recommendation
              </span>
            )}
          </div>

          {assessment.headline && (
            <p className="text-xs font-bold text-[#400A12]">{assessment.headline}</p>
          )}
          {assessment.analysis && (
            <p className="text-xs text-[#4A0A13] leading-relaxed whitespace-pre-wrap">
              {assessment.analysis}
            </p>
          )}

          {/* Per-dimension marks — makes the number auditable */}
          {assessment.scoreBreakdown?.length > 0 && (
            <div className="rounded-xl border border-[#D4AF37]/40 bg-white p-3">
              <span className="text-[0.65rem] uppercase font-bold text-[#B8860B]">
                How the mark was reached
              </span>
              <div className="mt-2 space-y-2">
                {assessment.scoreBreakdown.map((row) => (
                  <div key={row.dimension} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-[0.7rem]">
                      <span className="font-bold text-[#4A0A13]">
                        {DIMENSION_LABELS[row.dimension] || row.dimension}
                      </span>
                      <span className="font-mono font-bold text-[#400A12] shrink-0">{row.score}/100</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#4A0A13]/10 overflow-hidden">
                      <div className="h-1.5 rounded-full bg-[#B8860B]" style={{ width: `${row.score}%` }} />
                    </div>
                    <p className="text-[0.65rem] text-[#7A1C29]">{row.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <List title="Strengths" items={assessment.strengths} tone="emerald" icon={CheckCircle2} />
            <List title="Risks" items={assessment.risks} tone="red" icon={AlertTriangle} />
          </div>

          <List title="Suggestions for the client" items={assessment.suggestions} tone="blue" icon={Lightbulb} />
          <List title="Data gaps to chase" items={assessment.dataGaps} tone="gold" icon={HelpCircle} />

          {/* Module audit — where the pipeline's own scores look wrong */}
          {assessment.moduleNotes?.length > 0 && (
            <div className="rounded-xl border border-[#D4AF37]/40 bg-white p-3">
              <span className="text-[0.65rem] uppercase font-bold text-[#B8860B]">
                Module score audit
              </span>
              <div className="mt-2 space-y-1.5">
                {assessment.moduleNotes.map((m, i) => (
                  <div key={i} className="flex items-start gap-2 text-[0.7rem]">
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[0.55rem] shrink-0 ${
                      m.assessment === "over_scored" ? "bg-red-100 text-red-800"
                      : m.assessment === "under_scored" ? "bg-blue-100 text-blue-800"
                      : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {String(m.assessment).replace("_", " ")}
                    </span>
                    <span className="text-[#4A0A13]">
                      <strong>{m.moduleKey}</strong> — {m.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assessment.note && (
            <p className="text-[0.62rem] text-[#8C6D58] italic">{assessment.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
