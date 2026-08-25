/* ============================================================
   EXECUTIVE STRATEGY REPORT — .doc EXPORT

   Reproduces the original site's Word-HTML report format exactly
   (Word opens HTML saved with a .doc extension natively), filled
   with the real pipeline output: the venture profile, the four
   intake sections, every module's actual score, and the decision
   engine's verdict.
   ============================================================ */

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const or = (v, fallback = '—') => {
  const s = typeof v === 'string' ? v.trim() : v;
  return s ? esc(s) : fallback;
};

const MODULE_TITLES = {
  customerDiscovery: 'MOD-01 · Customer Discovery',
  profiling: 'MOD-02 · Profiling',
  marketSize: 'MOD-03 · Market Size (TAM/SAM/SOM)',
  feasibility: 'MOD-04 · Feasibility',
  pricing: 'MOD-05 · Pricing',
  marketResearch: 'MOD-06 · Market Research',
  industryReport: 'MOD-07 · Industry Report',
  businessModelValidation: 'MOD-08 · Business Model Validation',
  gtm: 'MOD-09 · Go-To-Market',
  okr: 'MOD-10 · OKR',
};

/**
 * Build the report document HTML.
 * @param {object} report  Server report ({ name, vertical, status, score,
 *   decision, clusters, client, publishedAt }) or an equivalent local shape.
 * @param {object} moduleResults  Keyed by module key ({ score, output }).
 */
export function buildReportDoc(report = {}, moduleResults = {}) {
  const clusters = report.clusters || {};
  const market = clusters.market || {};
  const viability = clusters.viability || {};
  const launch = clusters.launch || {};
  const client = typeof report.client === 'object' && report.client ? report.client : {};

  const score = report.score ?? 0;
  const decision = report.decision;
  const badge =
    decision === 1 ? '✔ High Commercial &amp; Execution Viability'
    : decision === 0 ? '⚠ Pivot Recommended — Below Viability Threshold'
    : '◌ Verdict Pending — Pipeline Incomplete';
  const badgeStyle =
    decision === 0
      ? 'color: #721c24; background: #f8d7da;'
      : decision === 1
        ? 'color: #155724; background: #d4edda;'
        : 'color: #856404; background: #fff3cd;';

  const date = new Date(report.publishedAt || report.createdAt || Date.now())
    .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const moduleRows = Object.entries(MODULE_TITLES)
    .filter(([key]) => moduleResults[key])
    .map(([key, title]) => {
      const r = moduleResults[key];
      const s = r.score ?? '—';
      return `<tr><td class="label">${title}</td><td><strong>${esc(s)}</strong> / 100 — ${or(r.output?.summary, '')}</td></tr>`;
    })
    .join('\n');

  const verdict = moduleResults.industryReport?.output?.decision || null;
  const list = (items) =>
    (items || []).length
      ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
      : '—';

  return `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${esc(report.name)} - Executive Strategy Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; line-height: 1.6; padding: 25px; }
          .header { border-bottom: 3px solid #D4AF37; padding-bottom: 15px; margin-bottom: 25px; }
          .brand { font-size: 11pt; color: #D4AF37; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
          .title { font-size: 24pt; font-weight: bold; color: #050505; margin: 8px 0 4px 0; }
          .meta { color: #666; font-size: 10pt; margin: 0; }
          .score-card { background: #FCF8EC; border: 2px solid #D4AF37; padding: 18px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .score-title { font-size: 10pt; color: #856404; text-transform: uppercase; font-weight: bold; }
          .score-num { font-size: 34pt; font-weight: bold; color: #D4AF37; margin: 4px 0; }
          .score-badge { font-size: 10pt; font-weight: bold; ${badgeStyle} padding: 3px 10px; border-radius: 12px; display: inline-block; }
          .section-heading { font-size: 14pt; font-weight: bold; color: #050505; border-bottom: 2px solid #D4AF37; padding-bottom: 5px; margin-top: 28px; margin-bottom: 12px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
          th { background: #0E0E0E; color: #D4AF37; text-align: left; padding: 10px; font-size: 10pt; text-transform: uppercase; }
          td { border: 1px solid #E2E8F0; padding: 10px; font-size: 10pt; vertical-align: top; background: #FFFFFF; }
          .label { font-weight: bold; color: #333333; width: 32%; background: #F8FAFC; }
          ul { margin: 4px 0 4px 18px; padding: 0; }
          .footer { margin-top: 40px; border-top: 1px solid #CBD5E1; padding-top: 12px; font-size: 9pt; color: #64748B; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">The Venture Orbital · Venture Intelligence Suite</div>
          <h1 class="title">${esc(report.name)}</h1>
          <p class="meta">Vertical: <strong>${esc(String(report.vertical || 'startups').toUpperCase())}</strong> | Date: <strong>${date}</strong> | Status: <strong>${esc(report.status || 'RECEIVED')}</strong></p>
        </div>

        <div class="score-card">
          <div class="score-title">Venture Orbital Score</div>
          <div class="score-num">${esc(score)} / 100</div>
          <div class="score-badge">${badge}</div>
        </div>

        <div class="section-heading">1. Executive &amp; Venture Profile</div>
        <table>
          <tr><td class="label">Company / Venture Name</td><td>${or(client.company || report.name)}</td></tr>
          <tr><td class="label">Industry &amp; Sector</td><td>${or(client.industry || (report.tags || [])[0])}</td></tr>
          <tr><td class="label">Venture Stage</td><td>${or(client.stage)}</td></tr>
          <tr><td class="label">Business Model</td><td>${or(client.businessModel)}</td></tr>
          <tr><td class="label">Geographic Target</td><td>${or(client.geography || launch.geography)}</td></tr>
          <tr><td class="label">Founder Contact</td><td>${or(client.contact)}</td></tr>
          <tr><td class="label">Capital Ask</td><td><strong>${or(launch.ask)}</strong></td></tr>
        </table>

        <div class="section-heading">2. Market Opportunity &amp; Problem Validation</div>
        <table>
          <tr><td class="label">Core Market Problem</td><td>${or(market.problem)}</td></tr>
          <tr><td class="label">Customer Pain Point</td><td>${or(market.pain)}</td></tr>
          <tr><td class="label">Ideal Customer Profile (ICP)</td><td>${or(market.icp)}</td></tr>
          <tr><td class="label">Willingness to Pay (WTP)</td><td>${or(market.wtp)}</td></tr>
        </table>

        <div class="section-heading">3. Business Economics &amp; Viability</div>
        <table>
          <tr><td class="label">Revenue Model</td><td>${or(viability.revenue)}</td></tr>
          <tr><td class="label">Gross Margin Target</td><td>${or(viability.margin)}</td></tr>
          <tr><td class="label">Key Cost Drivers</td><td>${or(viability.costs)}</td></tr>
          <tr><td class="label">Breakeven Horizon</td><td>${or(viability.breakeven)}</td></tr>
        </table>

        <div class="section-heading">4. Launch &amp; Go-To-Market Strategy</div>
        <table>
          <tr><td class="label">GTM Strategy</td><td>${or(launch.gtm)}</td></tr>
          <tr><td class="label">Growth Milestones</td><td>${or(launch.milestones)}</td></tr>
        </table>

        ${moduleRows ? `
        <div class="section-heading">5. Intelligence Module Scores</div>
        <table>
          <tr><th>Module</th><th>Score &amp; Finding</th></tr>
          ${moduleRows}
        </table>` : ''}

        ${verdict ? `
        <div class="section-heading">${moduleRows ? '6' : '5'}. Executive Verdict</div>
        <table>
          <tr><td class="label">Decision</td><td><strong>${esc(verdict.label || '—')}</strong> (${esc(verdict.score ?? score)} / 100)</td></tr>
          <tr><td class="label">Headline</td><td>${or(verdict.headline)}</td></tr>
          <tr><td class="label">Rationale</td><td>${or(verdict.rationale)}</td></tr>
          <tr><td class="label">Strengths</td><td>${list(verdict.strengths)}</td></tr>
          <tr><td class="label">Risks</td><td>${list(verdict.risks)}</td></tr>
          <tr><td class="label">Next Actions</td><td>${list(verdict.nextActions)}</td></tr>
        </table>` : ''}

        <div class="footer">
          Generated automatically by <strong>The Venture Orbital — Executive Strategy Engine</strong><br/>
          Confidential Executive Report &copy; ${new Date().getFullYear()}
        </div>
      </body>
      </html>`;
}

/** Trigger a browser download of the report as a Word-openable .doc file. */
export function downloadReportDoc(report, moduleResults) {
  const html = buildReportDoc(report, moduleResults);
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = String(report.name || 'venture')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  a.href = url;
  a.download = `${slug}-strategy-report.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
