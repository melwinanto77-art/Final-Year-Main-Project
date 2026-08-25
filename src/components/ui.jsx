import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Cpu } from 'lucide-react';
import DarkVeil from './DarkVeil.jsx';

/* ============================================================
   BLACK & GOLD EXECUTIVE DESIGN SYSTEM PRIMITIVES
   Deep Black (#050505) · Primary Gold (#D4AF37) · Light Gold (#F4D67A)
   ============================================================ */

// Layered Luxury Background with Subtle Gold Orbs & Black Overlay
export function RoyalBackground({ hueShift = 0, speed = 0.25, opacity = 0.25, className = '' }) {
  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#FAF4E8] ${className}`}>
      {/* Soft Radial Gold & Burgundy Glow Orbs */}
      <div className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full bg-[#D4AF37]/15 blur-[140px]" />
      <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-[#F5D77F]/12 blur-[150px]" />
      <div className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-[#4A0A13]/06 blur-[160px]" />

      {/* WebGL Shader Ambient Layer */}
      <div className="absolute inset-0" style={{ opacity: opacity * 0.25 }}>
        <DarkVeil hueShift={hueShift} speed={speed} resolutionScale={0.75} />
      </div>
      {/* Translucent Cream Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF4E8]/95 via-[#F5EAD4]/90 to-[#FAF4E8]/95" />
    </div>
  );
}

// Orbital Brand Mark — Primary Gold Accent
export function OrbitBrand({ size = 42, className = '' }) {
  const dim = { width: size, height: size };
  return (
    <div className={`relative ${className}`} style={dim}>
      {/* Outer dashed ring — Primary Gold */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border-2 border-dashed border-[#D4AF37]"
      />
      {/* Middle solid ring — Soft Light Gold */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        className="absolute rounded-full border border-[#F4D67A]/60"
        style={{ inset: `${size * 0.14}px` }}
      />
      {/* Orbiting Gold dot */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0"
      >
        <span
          className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-[#F4D67A] shadow-[0_0_10px_rgba(212,175,55,1)]"
        />
      </motion.div>
      {/* Center Crown */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Crown style={{ width: size * 0.44, height: size * 0.44 }} className="text-[#D4AF37]" />
      </div>
    </div>
  );
}

// AI Pulse Badge with Emerald live telemetry dot & Gold border
export function AiPulseBadge({ label = 'AI Engine: Active', className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.3)] bg-[#111111]/95 px-4 py-1.5 font-mono text-[0.68rem] font-medium text-[#F4D67A] shadow-[0_0_15px_rgba(212,175,55,0.15)] ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
      </span>
      <Sparkles size={12} className="text-[#D4AF37]" />
      <span>{label}</span>
    </div>
  );
}

// AI Intelligence Side Widget
export function AiInsightWidget({ verticalName = 'Venture' }) {
  return (
    <GlassPanel className="p-6 space-y-4 border-[rgba(212,175,55,0.25)] bg-[#111111] text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-[#D4AF37]" />
          <span className="font-mono text-[0.68rem] font-bold uppercase tracking-wider text-[#F4D67A]">
            AI Telemetry
          </span>
        </div>
        <span className="rounded-full border border-[#10B981]/40 bg-[#065F46]/80 px-2.5 py-0.5 font-mono text-[0.58rem] font-bold text-[#A7F3D0]">
          99.4% Precision
        </span>
      </div>

      <div>
        <h4 className="font-sans text-base font-bold text-[#FFFFFF]">{verticalName} Neural Read</h4>
        <p className="mt-1 text-xs text-[#CFCFCF]">
          Real-time pattern analysis across TAM conversion, unit economics, and competitive whitespace.
        </p>
      </div>

      <div className="space-y-2.5 pt-1">
        {[
          { label: 'Neural Confidence', val: '96%', color: 'bg-[#D4AF37]' },
          { label: 'Data Processing Speed', val: '14ms', color: 'bg-[#F4D67A]' },
          { label: 'Risk Factor Detection', val: 'Low (1.2%)', color: 'bg-[#10B981]' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[rgba(212,175,55,0.18)] bg-[#0E0E0E] p-2.5">
            <div className="flex items-center justify-between text-[0.68rem]">
              <span className="font-mono text-[#CFCFCF]">{item.label}</span>
              <span className="font-mono font-bold text-[#FFFFFF]">{item.val}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#050505]">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: item.val.includes('%') ? item.val : '85%' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[rgba(212,175,55,0.25)] bg-[#0E0E0E] p-3 text-center">
        <p className="font-mono text-[0.65rem] font-semibold text-[#F4D67A]">
          AI Co-Pilot is actively optimizing your strategy pipeline.
        </p>
      </div>
    </GlassPanel>
  );
}

// Glass Panel Wrapper — Rounded Executive Floating Card
export function GlassPanel({ className = '', children, ...rest }) {
  return (
    <div
      className={`card-royal-luxury ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

// Headings
export function RoyalHeading({ children, level = 2, shimmer = false, className = '' }) {
  const Tag = `h${level}`;
  const sizes = {
    1: 'text-3xl md:text-4xl',
    2: 'text-2xl md:text-3xl',
    3: 'text-xl md:text-2xl',
    4: 'text-lg',
  };
  return (
    <Tag
      className={`font-sans font-bold tracking-tight ${sizes[level]} ${
        shimmer ? 'text-shimmer-champagne' : 'text-[#FFFFFF]'
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

// Form field label
export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block font-mono text-[0.68rem] font-semibold uppercase tracking-wider text-[#F4D67A]">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-[0.68rem] text-[#9A9A9A]">{hint}</span>}
    </label>
  );
}

// Base input / textarea / select styling with Black background & Gold border
export const fieldBase =
  'field-luxury-gold w-full rounded-xl bg-[#050505] px-3.5 py-2.5 text-sm text-[#FFFFFF] ' +
  'placeholder:text-[#9A9A9A] border border-[rgba(212,175,55,0.3)] shadow-xs transition-all duration-200 focus:bg-[#0E0E0E]';

export function Input(props) {
  return <input {...props} className={`${fieldBase} ${props.className || ''}`} />;
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`${fieldBase} resize-y ${props.className || ''}`}
    />
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`${fieldBase} appearance-none cursor-pointer ${props.className || ''}`}
    >
      {props.children}
    </select>
  );
}

// Primary Gold Action Button
export function RoyalButton({ children, className = '', ...rest }) {
  return (
    <button
      className={`btn-royal-red inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// Secondary Transparent Button with Gold Border
export function GhostButton({ children, className = '', ...rest }) {
  return (
    <button
      className={`btn-royal-gold-outline inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// Status badge
const STATUS_STYLES = {
  RECEIVED: 'bg-[#D4AF37] text-[#050505] border-[#F4D67A] font-bold',
  PENDING: 'bg-[#78350F]/80 text-[#F4D67A] border-[#F4D67A]',
  PROCESSED: 'bg-[#4C1D95]/80 text-[#DDD6FE] border-[#C084FC]',
  REVIEWING: 'bg-amber-500/10 text-amber-400 border-amber-400',
  PUBLISHED: 'bg-[#065F46]/80 text-[#A7F3D0] border-[#34D399]',
};

export function StatusBadge({ status, className = '' }) {
  const style = STATUS_STYLES[status] || 'bg-[#111111] text-[#FFFFFF] border-[rgba(212,175,55,0.3)]';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-wider ${style} ${className}`}
    >
      {status}
    </span>
  );
}

// Status dot
export function StatusDot({ status }) {
  const colors = {
    RECEIVED: 'bg-[#D4AF37]',
    PENDING: 'bg-[#F4D67A]',
    PROCESSED: 'bg-[#C084FC]',
    REVIEWING: 'bg-amber-400',
    PUBLISHED: 'bg-[#34D399]',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${colors[status] || 'bg-[#D4AF37]'}`}
      />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status] || 'bg-[#D4AF37]'}`} />
    </span>
  );
}
