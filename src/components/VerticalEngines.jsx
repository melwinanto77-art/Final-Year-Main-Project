import React, { useState, useMemo } from 'react';
import {
  TrendingUp, Factory, Building2,
  Clock, PiggyBank, ChevronRight,
} from 'lucide-react';

/* ============================================================
   VERTICAL ENGINES — per-vertical what-if calculators, styled
   to the site's cream & gold design system. The derivations
   (TAM/SAM/SOM, savings/payback, defect/sigma) are unchanged.
   ============================================================ */

const labelCls = 'font-mono text-[0.68rem] uppercase font-bold text-[#B8860B] tracking-wider';
const fieldCls =
  'w-full rounded-xl border border-[#D4AF37]/60 bg-white px-3.5 py-2.5 text-xs text-[#0B1B36] placeholder-[#6E7B91]/60 focus:border-[#081428] focus:outline-none shadow-xs';

function Panel({ children, className = '' }) {
  return (
    <div className={`bg-white/90 border border-[#D4AF37]/40 rounded-2xl p-5 shadow-xs ${className}`}>
      {children}
    </div>
  );
}

function EngineField({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-[0.65rem] text-[#6E7B91]">{hint}</p>}
    </div>
  );
}

/* ---------------- A. STARTUP — MARKET SIZING ENGINE ---------------- */
export function StartupMarketEngine() {
  const [tam, setTam] = useState(50000000);
  const [samPct, setSamPct] = useState(18);
  const [channels, setChannels] = useState({ direct: 40, partner: 25, online: 35 });
  const [conversion, setConversion] = useState(8);

  const sam = useMemo(() => Math.round(tam * (samPct / 100)), [tam, samPct]);
  const channelWeight = (channels.direct + channels.partner + channels.online) / 100;
  const som = useMemo(
    () => Math.round(sam * channelWeight * (conversion / 100)),
    [sam, channelWeight, conversion]
  );
  const feasibility = Math.min(100, Math.round(40 + (som / Math.max(tam, 1)) * 1000));

  return (
    <div className="space-y-6">
      <EngineHead
        icon={TrendingUp}
        kicker="Startup Vertical · Strategic Market Intelligence"
        title="Market Sizing & Conversion Engine"
        desc="Calculate Total, Serviceable, and Obtainable markets, then model funnel conversion across sales channels."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Inputs */}
        <Panel className="space-y-4">
          <EngineField label="Total Addressable Market (TAM) — USD">
            <input type="number" className={fieldCls} value={tam} onChange={(e) => setTam(parseInt(e.target.value) || 0)} />
          </EngineField>
          <EngineField label={`Serviceable % of TAM — ${samPct}%`} hint="Share of TAM your model can actually reach">
            <input type="range" min={1} max={100} value={samPct} onChange={(e) => setSamPct(parseInt(e.target.value))} className="w-full accent-[#081428] cursor-pointer" />
          </EngineField>

          <div className="space-y-2 pt-2">
            <span className={labelCls}>Channel Mix Split</span>
            <div className="grid grid-cols-3 gap-2">
              <EngineField label="Direct">
                <input type="number" className={fieldCls} value={channels.direct} onChange={(e) => setChannels({ ...channels, direct: parseInt(e.target.value) || 0 })} />
              </EngineField>
              <EngineField label="Partner">
                <input type="number" className={fieldCls} value={channels.partner} onChange={(e) => setChannels({ ...channels, partner: parseInt(e.target.value) || 0 })} />
              </EngineField>
              <EngineField label="Online">
                <input type="number" className={fieldCls} value={channels.online} onChange={(e) => setChannels({ ...channels, online: parseInt(e.target.value) || 0 })} />
              </EngineField>
            </div>
          </div>

          <EngineField label={`Conversion Rate — ${conversion}%`} hint="Leads to closed customers">
            <input type="range" min={1} max={30} value={conversion} onChange={(e) => setConversion(parseInt(e.target.value))} className="w-full accent-[#081428] cursor-pointer" />
          </EngineField>
        </Panel>

        {/* Output metrics */}
        <Panel className="space-y-5">
          <h4 className="font-serif text-base font-bold text-[#081428]">Converted Market Sizing</h4>

          <div className="space-y-3">
            <MetricBar label="TAM (Total Addressable)" val={`$${tam.toLocaleString()}`} pct={100} color="bg-[#D4AF37]" />
            <MetricBar label="SAM (Serviceable)" val={`$${sam.toLocaleString()}`} pct={samPct} color="bg-[#B8860B]" />
            <MetricBar label="SOM (Obtainable)" val={`$${som.toLocaleString()}`} pct={Math.max(3, Math.round((som / Math.max(tam, 1)) * 100))} color="bg-emerald-500" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FBFCFE] p-3 text-center">
              <span className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-[#6E7B91]">Market Feasibility</span>
              <p className="font-serif text-2xl font-bold text-[#B8860B]">{feasibility}<span className="text-xs text-[#6E7B91]">/100</span></p>
            </div>
            <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FBFCFE] p-3 text-center">
              <span className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-[#6E7B91]">Recommendation</span>
              <p className={`font-mono text-xs font-bold mt-1 ${feasibility >= 60 ? 'text-emerald-600' : 'text-red-600'}`}>
                {feasibility >= 60 ? '1 · Proceed' : '0 · Pivot'}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- B. MSME — BOTTLENECK OPTIMIZER ---------------- */
export function MsmeOptimizationEngine() {
  const [bottleneck, setBottleneck] = useState('inventory');
  const [delayDays, setDelayDays] = useState(14);
  const [monthlySpend, setMonthlySpend] = useState(25000);

  const potentialSavings = Math.round(monthlySpend * 0.28);
  const paybackMonths = Math.max(2, Math.round(12 - delayDays * 0.4));

  return (
    <div className="space-y-6">
      <EngineHead
        icon={Factory}
        kicker="MSME Vertical · Operational Optimization"
        title="Bottleneck & Cost Diagnostic Engine"
        desc="Isolate operational friction points, calculate downtime costs, and map lean optimization trajectories."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel className="space-y-4">
          <EngineField label="Primary Operational Bottleneck">
            <select value={bottleneck} onChange={(e) => setBottleneck(e.target.value)} className={`${fieldCls} cursor-pointer`}>
              <option value="inventory">Inventory Holding & Stockout Delays</option>
              <option value="logistics">Last-Mile Freight & Logistics Spikes</option>
              <option value="manual">Manual Data Entry & Invoice Reconciliation</option>
              <option value="quality">Quality Rejection Rate in Production</option>
            </select>
          </EngineField>
          <EngineField label={`Average Delay per Cycle — ${delayDays} Days`}>
            <input type="range" min={1} max={60} value={delayDays} onChange={(e) => setDelayDays(parseInt(e.target.value))} className="w-full accent-[#081428] cursor-pointer" />
          </EngineField>
          <EngineField label="Monthly Operational Spend (USD)">
            <input type="number" className={fieldCls} value={monthlySpend} onChange={(e) => setMonthlySpend(parseInt(e.target.value) || 0)} />
          </EngineField>
        </Panel>

        <Panel className="space-y-4">
          <h4 className="font-serif text-base font-bold text-[#081428]">Diagnostic Findings</h4>

          <div className="grid grid-cols-2 gap-3">
            <SavingsCard icon={PiggyBank} label="Potential Savings / Mo" value={`$${potentialSavings.toLocaleString()}`} />
            <SavingsCard icon={Clock} label="Estimated Payback" value={`${paybackMonths} Mo`} />
          </div>

          <div className="space-y-2.5 pt-2">
            <span className={labelCls}>Recommended Actions</span>
            <RoadmapPhase phase="Phase 1: Zero-Waste Audit" desc="Audit current inventory hold times to eliminate redundant buffer stock." />
            <RoadmapPhase phase="Phase 2: Digital Dispatch" desc="Automate invoice & order dispatch via lightweight webhook integrations." />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- C. INDUSTRY — SOP & DEFECT ENGINE ---------------- */
export function IndustryAnalysisEngine() {
  const [defectRate, setDefectRate] = useState(4.2);
  const [outputVolume, setOutputVolume] = useState(150000);

  const defectUnits = Math.round(outputVolume * (defectRate / 100));
  const sigmaLevel = Math.max(2.1, (6.0 - defectRate * 0.6).toFixed(1));

  return (
    <div className="space-y-6">
      <EngineHead
        icon={Building2}
        kicker="Industry Vertical · Scale Systemic Optimization"
        title="Defect & Quality Audit Engine"
        desc="Systemic analysis for large-scale operations — tracking defect density, Six Sigma compliance, and throughput."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel className="space-y-4">
          <EngineField label="Annual Output Volume (Units)">
            <input type="number" className={fieldCls} value={outputVolume} onChange={(e) => setOutputVolume(parseInt(e.target.value) || 0)} />
          </EngineField>
          <EngineField label={`Current Defect Rate — ${defectRate}%`}>
            <input type="range" min={0.1} max={15} step={0.1} value={defectRate} onChange={(e) => setDefectRate(parseFloat(e.target.value))} className="w-full accent-[#081428] cursor-pointer" />
          </EngineField>
        </Panel>

        <Panel className="space-y-4">
          <h4 className="font-serif text-base font-bold text-[#081428]">Systemic Quality Index</h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FBFCFE] p-3 text-center">
              <span className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-[#6E7B91]">Defect Units / Year</span>
              <p className="font-serif text-xl font-bold text-[#B8860B]">{defectUnits.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FBFCFE] p-3 text-center">
              <span className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-[#6E7B91]">Estimated Sigma Level</span>
              <p className="font-serif text-xl font-bold text-[#B8860B]">{sigmaLevel} σ</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Local Shared Helpers ---------- */
function EngineHead({ icon: Icon, kicker, title, desc }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[#B8860B]" />
        <span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#B8860B]">{kicker}</span>
      </div>
      <h3 className="mt-1 font-serif text-2xl font-bold text-[#081428]">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm text-[#3D5A80]">{desc}</p>
    </div>
  );
}

function MetricBar({ label, val, pct, color = 'bg-[#D4AF37]' }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-xs text-[#6E7B91]">
        <span>{label}</span>
        <span className="font-bold text-[#081428]">{val}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#0B1B36]/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

function SavingsCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[#D4AF37]/40 bg-[#FBFCFE] p-3">
      <Icon size={13} className="text-[#B8860B]" />
      <span className="mt-1 block font-mono text-[0.62rem] uppercase text-[#6E7B91]">{label}</span>
      <span className="font-serif text-sm font-bold text-[#081428]">{value}</span>
    </div>
  );
}

function RoadmapPhase({ phase, desc }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D4AF37] bg-[#EDF2F9]">
        <ChevronRight size={12} className="text-[#B8860B]" />
      </div>
      <div>
        <p className="text-xs font-bold text-[#081428]">{phase}</p>
        <p className="text-[0.7rem] text-[#3D5A80]">{desc}</p>
      </div>
    </div>
  );
}
