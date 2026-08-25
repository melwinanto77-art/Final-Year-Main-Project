import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Award, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { submitBrandEquity, listBrandEquity } from "../api.js";
import StrengthBadge from "./StrengthBadge.jsx";

/* ============================================================
   INDIAN BRAND EQUITY ASSESSMENT
   Five equity pillars (Aaker model, as applied in Indian brand
   assessments) plus behavioural proof. The backend scores it and
   bands the result WEAK / MEDIUM / STRONG.
   ============================================================ */

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Jammu & Kashmir", "Ladakh",
  "Puducherry", "Chandigarh", "Other / Pan-India",
];

const LANGUAGES = [
  "Hindi", "English", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi",
  "Bengali", "Gujarati", "Punjabi", "Odia", "Assamese", "Urdu",
];

/* Each pillar carries the plain-language question the client answers, so
   nobody has to guess what "associations" means. */
const PILLARS = [
  {
    key: "awareness",
    label: "Brand Awareness",
    question: "If you asked 10 people in your target market, how many would recognise your brand name?",
    low: "Nobody knows us yet",
    high: "Widely recognised",
  },
  {
    key: "perceivedQuality",
    label: "Perceived Quality",
    question: "How highly do your customers rate the quality of what you deliver?",
    low: "Frequent complaints",
    high: "Known for quality",
  },
  {
    key: "associations",
    label: "Brand Associations",
    question: "How strongly is your brand linked to a clear idea — heritage, trust, value, innovation?",
    low: "No clear identity",
    high: "Strong, distinct identity",
  },
  {
    key: "loyalty",
    label: "Customer Loyalty",
    question: "How likely are your customers to choose you again over a cheaper alternative?",
    low: "They switch easily",
    high: "Strongly loyal",
  },
  {
    key: "distributionReach",
    label: "Distribution Reach",
    question: "How easily can a customer actually find and buy from you — stores, online, delivery?",
    low: "Very limited access",
    high: "Available everywhere we target",
  },
];

/* Plain-language reason for each cap, so the client knows exactly which
   number to supply to lift it. */
const PILLAR_LABELS = {
  awareness: "Brand Awareness",
  perceivedQuality: "Perceived Quality",
  associations: "Brand Associations",
  loyalty: "Customer Loyalty",
  distributionReach: "Distribution Reach",
};

const CAP_REASONS = {
  loyalty: "loyalty is measured by customers coming back, so it needs a repeat-customer percentage.",
  perceivedQuality: "quality needs customers who could judge it, or a certification that vouches for it.",
  awareness: "awareness needs reach — monthly customers or a social following.",
  distributionReach: "reach needs customers actually buying from you somewhere.",
  associations: "an association takes time to form, so it needs years in market.",
};

const EMPTY = {
  brandName: "", category: "", homeState: "", yearsActive: "",
  languages: [],
  awareness: 50, perceivedQuality: 50, associations: 50, loyalty: 50, distributionReach: 50,
  monthlyCustomers: "", repeatRate: "", socialFollowing: "",
  certifications: "", differentiator: "",
};

const labelCls = "font-mono text-[0.68rem] uppercase font-bold text-[#B8860B] tracking-wider";
const fieldCls =
  "w-full rounded-xl border border-[#D4AF37]/60 bg-white px-3.5 py-2.5 text-xs text-[#4A0A13] placeholder-[#8C6D58]/60 focus:border-[#400A12] focus:outline-none";

function Field({ label, hint, htmlFor, children }) {
  return (
    <div className="space-y-1">
      <label className={labelCls} htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="text-[0.65rem] text-[#8C6D58]">{hint}</p>}
    </div>
  );
}

export default function BrandEquityForm({ reportId, clientEmail, defaultBrandName = "" }) {
  const [form, setForm] = useState({ ...EMPTY, brandName: defaultBrandName });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const loadExisting = useCallback(async () => {
    try {
      const params = {};
      if (reportId) params.reportId = reportId;
      else if (clientEmail) params.clientEmail = clientEmail;
      const data = await listBrandEquity(params);
      const latest = (data?.assessments || [])[0];
      if (latest) {
        setSaved(latest);
        setForm({
          brandName: latest.brandName || "",
          category: latest.category || "",
          homeState: latest.homeState || "",
          yearsActive: latest.yearsActive ?? "",
          languages: latest.languages || [],
          awareness: latest.pillars?.awareness ?? 50,
          perceivedQuality: latest.pillars?.perceivedQuality ?? 50,
          associations: latest.pillars?.associations ?? 50,
          loyalty: latest.pillars?.loyalty ?? 50,
          distributionReach: latest.pillars?.distributionReach ?? 50,
          monthlyCustomers: latest.monthlyCustomers ?? "",
          repeatRate: latest.repeatRate ?? "",
          socialFollowing: latest.socialFollowing ?? "",
          certifications: latest.certifications || "",
          differentiator: latest.differentiator || "",
        });
      }
    } catch { /* nothing saved yet */ }
  }, [reportId, clientEmail]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const toggleLanguage = (lang) =>
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.brandName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const num = (v) => (v === "" || v === null ? 0 : Number(v) || 0);
      const data = await submitBrandEquity({
        brandName: form.brandName.trim(),
        reportId: reportId || undefined,
        clientEmail: clientEmail || undefined,
        category: form.category.trim() || undefined,
        homeState: form.homeState || undefined,
        yearsActive: num(form.yearsActive),
        languages: form.languages,
        awareness: Number(form.awareness),
        perceivedQuality: Number(form.perceivedQuality),
        associations: Number(form.associations),
        loyalty: Number(form.loyalty),
        distributionReach: Number(form.distributionReach),
        monthlyCustomers: num(form.monthlyCustomers),
        repeatRate: num(form.repeatRate),
        socialFollowing: num(form.socialFollowing),
        certifications: form.certifications.trim() || undefined,
        differentiator: form.differentiator.trim() || undefined,
      });
      setSaved(data.brandEquity);
    } catch (err) {
      setError(err.message || "Could not save the assessment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3">
        <Award size={22} className="text-[#B8860B] shrink-0 mt-0.5" />
        <div>
          <h3 className="font-serif text-lg font-bold text-[#400A12]">Indian Brand Equity Assessment</h3>
          <p className="text-xs text-[#7A1C29]">
            Measures how much your brand itself is worth in the Indian market — beyond the product.
            Answer honestly; the score is only useful if it reflects reality.
          </p>
        </div>
      </div>

      {/* Saved result */}
      {saved && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-2xl border-2 border-[#D4AF37] bg-white p-4 flex flex-wrap items-center gap-x-6 gap-y-2"
        >
          <div>
            <p className={labelCls}>Brand Equity Score</p>
            <p className="font-serif text-3xl font-extrabold text-[#B8860B]">
              {saved.equityScore}<span className="text-base text-[#8C6D58]"> / 100</span>
            </p>
          </div>
          <StrengthBadge band={saved.strengthBand} />
          <p className="text-[0.7rem] text-[#7A1C29] flex-1 min-w-48">
            Saved for <strong>{saved.brandName}</strong>. Update any answer and save again to recalculate.
          </p>

          {/* Every pillar is self-reported, so a rating with no supporting
              number behind it is scored on what the evidence supports rather
              than on the claim. Say so plainly instead of silently marking down. */}
          {(saved.evidenceCaps || []).length > 0 && (
            <div className="w-full rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-1.5">
              <p className="text-[0.68rem] font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Some ratings were scored down for want of evidence
              </p>
              <ul className="space-y-1">
                {saved.evidenceCaps.map((c) => (
                  <li key={c.pillar} className="text-[0.65rem] text-amber-900">
                    <strong>{PILLAR_LABELS[c.pillar] || c.pillar}</strong>: you rated {c.claimed},
                    scored on {c.capped} — {CAP_REASONS[c.pillar]}
                  </li>
                ))}
              </ul>
              <p className="text-[0.62rem] text-amber-800">
                Fill in the real numbers below and save again; the cap lifts as soon as the
                supporting figure is there.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Brand basics */}
      <div className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 space-y-4">
        <p className={labelCls}>1 · Brand Basics</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Brand name *" hint="The name customers actually know you by." htmlFor="be-name">
            <input id="be-name" type="text" required value={form.brandName}
              onChange={(e) => set("brandName", e.target.value)}
              placeholder="e.g. Veera Foods" className={fieldCls} />
          </Field>
          <Field label="Product / service category" hint="What you sell, in a few words." htmlFor="be-cat">
            <input id="be-cat" type="text" value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="e.g. Regional restaurant chain" className={fieldCls} />
          </Field>
          <Field label="Home state" hint="Where the brand originates — it affects regional trust." htmlFor="be-state">
            <select id="be-state" value={form.homeState}
              onChange={(e) => set("homeState", e.target.value)}
              className={`${fieldCls} cursor-pointer`}>
              <option value="">Select a state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Years active" hint="How long the brand has traded. Enter 0 if pre-launch." htmlFor="be-years">
            <input id="be-years" type="number" min="0" step="0.5" value={form.yearsActive}
              onChange={(e) => set("yearsActive", e.target.value)}
              placeholder="e.g. 3" className={fieldCls} />
          </Field>
        </div>

        <Field label="Languages you market in" hint="Tap every language your customer-facing material uses.">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => {
              const on = form.languages.includes(lang);
              return (
                <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    on ? "bg-[#400A12] text-[#F5D77F] border border-[#D4AF37]/50"
                       : "bg-[#FAF4E8] text-[#4A0A13] border border-[#D4AF37]/30 hover:bg-[#F5EAD4]"
                  }`}>
                  {on ? "✓ " : "+ "}{lang}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      {/* Five pillars */}
      <div className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 space-y-5">
        <div>
          <p className={labelCls}>2 · The Five Equity Pillars</p>
          <p className="text-[0.7rem] text-[#7A1C29] mt-1">
            Drag each slider from 0 (not true at all) to 100 (completely true).
          </p>
        </div>
        {PILLARS.map((pillar) => (
          <div key={pillar.key} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-[#400A12]" htmlFor={`be-${pillar.key}`}>
                  {pillar.label}
                </label>
                <p className="text-[0.68rem] text-[#7A1C29]">{pillar.question}</p>
              </div>
              <span className="font-mono text-sm font-bold text-[#400A12] shrink-0">
                {form[pillar.key]}
              </span>
            </div>
            <input
              id={`be-${pillar.key}`}
              type="range" min="0" max="100"
              value={form[pillar.key]}
              onChange={(e) => set(pillar.key, Number(e.target.value))}
              className="w-full accent-[#400A12] cursor-pointer"
            />
            <div className="flex justify-between text-[0.62rem] text-[#8C6D58]">
              <span>{pillar.low}</span>
              <span>{pillar.high}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Behavioural proof */}
      <div className="bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-4 sm:p-5 space-y-4">
        <div>
          <p className={labelCls}>3 · Real Numbers (proof behind the ratings)</p>
          <p className="text-[0.7rem] text-[#7A1C29] mt-1">
            These verify the sliders above — a brand claiming high loyalty with no repeat customers
            is scored down, not up.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Customers per month" hint="Roughly how many people buy from you monthly." htmlFor="be-cust">
            <input id="be-cust" type="number" min="0" value={form.monthlyCustomers}
              onChange={(e) => set("monthlyCustomers", e.target.value)}
              placeholder="e.g. 1800" className={fieldCls} />
          </Field>
          <Field label="Repeat customers (%)" hint="Share who come back. Guess if you must." htmlFor="be-repeat">
            <input id="be-repeat" type="number" min="0" max="100" value={form.repeatRate}
              onChange={(e) => set("repeatRate", e.target.value)}
              placeholder="e.g. 64" className={fieldCls} />
          </Field>
          <Field label="Social following" hint="Total followers across your main channels." htmlFor="be-social">
            <input id="be-social" type="number" min="0" value={form.socialFollowing}
              onChange={(e) => set("socialFollowing", e.target.value)}
              placeholder="e.g. 4200" className={fieldCls} />
          </Field>
        </div>
        <Field label="Certifications & registrations"
               hint="e.g. FSSAI, ISI, GI tag, trademark, ISO — anything that signals credibility."
               htmlFor="be-cert">
          <input id="be-cert" type="text" value={form.certifications}
            onChange={(e) => set("certifications", e.target.value)}
            placeholder="e.g. FSSAI licence, registered trademark" className={fieldCls} />
        </Field>
        <Field label="What makes your brand different?"
               hint="One or two sentences. This is what a customer would repeat to a friend."
               htmlFor="be-diff">
          <textarea id="be-diff" rows={2} value={form.differentiator}
            onChange={(e) => set("differentiator", e.target.value)}
            placeholder="e.g. Authentic regional recipes at street-food pricing, cooked fresh daily."
            className={`${fieldCls} rounded-2xl resize-none`} />
        </Field>
      </div>

      {error && (
        <p className="text-[0.7rem] font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && !saving && (
          <span className="text-[0.7rem] text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 size={13} /> Saved
          </span>
        )}
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#400A12] hover:bg-[#5C0F1A] text-[#F5D77F] font-extrabold text-xs shadow-lg transition cursor-pointer border border-[#D4AF37]/40 disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
          <span>{saving ? "Saving…" : saved ? "Update Assessment" : "Save Assessment"}</span>
        </button>
      </div>
    </form>
  );
}
