import React from "react";

/* ============================================================
   STRENGTH BADGE — WEAK / MEDIUM / STRONG
   One component so the categorisation looks identical wherever
   it appears: client cards, project table, admin console, brand
   equity result.
   ============================================================ */

const STYLES = {
  STRONG: "bg-emerald-100 text-emerald-800 border-emerald-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  WEAK: "bg-red-100 text-red-800 border-red-300",
};

const TITLES = {
  STRONG: "Strong — well-evidenced and scoring highly",
  MEDIUM: "Medium — workable, with gaps to close",
  WEAK: "Weak — thin evidence or a low score",
};

/**
 * @param {'WEAK'|'MEDIUM'|'STRONG'} band
 * @param {string} [label] Optional prefix, e.g. "Data".
 * @param {'sm'|'md'} [size]
 */
export default function StrengthBadge({ band, label, size = "md", title }) {
  if (!band) return null;
  const key = String(band).toUpperCase();
  const style = STYLES[key] || STYLES.WEAK;
  const pad = size === "sm" ? "px-2 py-0.5 text-[0.6rem]" : "px-2.5 py-0.5 text-[0.65rem]";

  return (
    <span
      title={title || TITLES[key] || key}
      className={`inline-flex items-center gap-1 rounded-full border font-extrabold uppercase tracking-wide ${pad} ${style}`}
    >
      {label && <span className="font-bold opacity-70">{label}</span>}
      {key}
    </span>
  );
}
