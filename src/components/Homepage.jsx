import React from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, School, Factory, Building2, Rocket, Crown,
  ArrowRight, Sparkles, ShieldCheck, Search,
  Play, BarChart2, Cpu, GitMerge, Gauge, Binary,
  TrendingUp, Target, Calculator, Lightbulb,
} from 'lucide-react';
import {
  RoyalButton, GhostButton, OrbitBrand, RoyalBackground,
} from './ui.jsx';
import { Carousel, Card } from './AppleCardsCarousel.jsx';
import { CardCarousel } from './ui/card-carousel.jsx';
import PulpSenseHero from './PulpSenseHero.jsx';

/* ============================================================
   ABSTRACT SVG GEOMETRY ARTWORK COMPONENTS FOR DOMAIN CARDS
   ============================================================ */

const PatternStudents = () => (
  <svg className="w-full h-full opacity-35 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <circle cx="200" cy="120" r="80" strokeWidth="1" strokeDasharray="4 4" />
    <path d="M120 120 L280 120 M200 40 L200 200" strokeWidth="1" opacity="0.6" />
    <polygon points="200,60 250,90 200,120 150,90" strokeWidth="1.5" fill="rgba(212,175,55,0.05)" />
    <circle cx="150" cy="90" r="4" fill="#F4D67A" />
    <circle cx="250" cy="90" r="4" fill="#F4D67A" />
    <circle cx="200" cy="60" r="4" fill="#F4D67A" />
  </svg>
);

const PatternInstitutions = () => (
  <svg className="w-full h-full opacity-35 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <rect x="80" y="50" width="240" height="140" rx="16" strokeWidth="1" strokeDasharray="6 6" />
    <path d="M110 90 L290 90 M110 130 L290 130 M110 170 L290 170" strokeWidth="1" opacity="0.5" />
    <path d="M150 50 L150 190 M250 50 L250 190" strokeWidth="1.5" />
    <circle cx="200" cy="110" r="28" strokeWidth="1.5" fill="rgba(212,175,55,0.08)" />
  </svg>
);

const PatternMSMEs = () => (
  <svg className="w-full h-full opacity-35 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <path d="M60 180 L140 120 L220 150 L340 70" strokeWidth="2" strokeLinecap="round" />
    <circle cx="140" cy="120" r="5" fill="#D4AF37" />
    <circle cx="220" cy="150" r="5" fill="#D4AF37" />
    <circle cx="340" cy="70" r="6" fill="#F4D67A" />
    <rect x="100" y="80" width="80" height="80" rx="12" strokeWidth="1" strokeDasharray="4 4" />
    <rect x="220" y="60" width="100" height="100" rx="16" strokeWidth="1" opacity="0.6" />
  </svg>
);

const PatternIndustries = () => (
  <svg className="w-full h-full opacity-35 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <polygon points="200,30 320,100 320,180 200,210 80,180 80,100" strokeWidth="1.5" />
    <polygon points="200,70 270,115 270,165 200,185 130,165 130,115" strokeWidth="1" strokeDasharray="3 3" />
    <path d="M200 30 L200 210 M80 100 L320 180 M80 180 L320 100" strokeWidth="1" opacity="0.4" />
  </svg>
);

const PatternStartups = () => (
  <svg className="w-full h-full opacity-35 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <ellipse cx="200" cy="120" rx="140" ry="60" strokeWidth="1.5" transform="rotate(-15 200 120)" />
    <ellipse cx="200" cy="120" rx="140" ry="60" strokeWidth="1" strokeDasharray="6 6" transform="rotate(30 200 120)" />
    <circle cx="200" cy="120" r="24" fill="rgba(212,175,55,0.12)" strokeWidth="2" />
    <circle cx="310" cy="90" r="5" fill="#F4D67A" />
  </svg>
);

const DOMAIN_CARDS_DATA = [
  {
    title: 'Students & Scholars',
    icon: GraduationCap,
    description: 'Academic counseling, research mentorship, thesis guidance, and career trajectory mapping.',
    capabilities: [
      'Personalized Academic Counseling',
      'Research & Publication Mentorship',
      'Thesis & Capstone Strategy',
      'Global Scholarship Pathing'
    ],
    patternComponent: PatternStudents
  },
  {
    title: 'Educational Institutions',
    icon: School,
    description: 'Curriculum optimization, organizational diagnosis, accreditation alignment, and digital transformation.',
    capabilities: [
      'Curriculum Benchmarking & Diagnosis',
      'Accreditation Compliance Pipelines',
      'Faculty Workflow Optimization',
      'Institutional Governance Analytics'
    ],
    patternComponent: PatternInstitutions
  },
  {
    title: 'MSMEs',
    icon: Factory,
    description: 'Operational bottleneck diagnostics, capacity building, unit economic sizing, and market expansion.',
    capabilities: [
      'Operational Bottleneck Audit',
      'Gross Margin & Cash Payback Sizing',
      'Supply-Chain Logistics Efficiency',
      'Local-to-Regional Scalability Engine'
    ],
    patternComponent: PatternMSMEs
  },
  {
    title: 'Industries',
    icon: Building2,
    description: 'Large-scale systemic optimization, innovation pipelines, strategic partnerships, and enterprise risk.',
    capabilities: [
      'Enterprise Systemic Optimization',
      'Cross-Sector Innovation Architecture',
      'Regulatory Risk Mitigation Matrix',
      'Strategic M&A & Joint Venture Readiness'
    ],
    patternComponent: PatternIndustries
  },
  {
    title: 'Startups',
    icon: Rocket,
    description: 'Market validation, TAM/SAM sizing, pricing strategy, GTM readiness, and investor positioning.',
    capabilities: [
      'Market Signal & Customer Discovery',
      'TAM / SAM Volume Sizing',
      '0-100 Orbital Index Score',
      'Binary 1 / 0 Investor Deck Verdict'
    ],
    patternComponent: PatternStartups
  }
];

const PIPELINE_STEPS = [
  {
    n: '01',
    title: 'Raw Ideas',
    desc: 'Capture unstructured opportunities, founder insights, customer pain points, and emerging market signals. Every idea is documented, filtered, and prepared for strategic evaluation before entering the validation pipeline.',
    icon: TrendingUp,
  },
  {
    n: '02',
    title: 'Market Sizing',
    desc: 'Assess the total addressable market, competitive landscape, customer demand, growth potential, and positioning to determine whether the opportunity has meaningful commercial viability.',
    icon: Target,
  },
  {
    n: '03',
    title: 'Financials',
    desc: 'Model unit economics, pricing strategy, revenue projections, capital requirements, operational costs, and expected returns to validate long-term sustainability.',
    icon: Calculator,
  },
  {
    n: '04',
    title: 'Final GO / NO-GO',
    desc: 'Combine strategic, financial, operational, and market intelligence into a single executive verdict, providing a confident recommendation for investment, execution, or rejection.',
    icon: Lightbulb,
  },
];

const STATS = [
  { value: '5', label: 'Vertical Engines', icon: Cpu },
  { value: '4', label: 'Pipeline Stages', icon: GitMerge },
  { value: '0–100', label: 'Orbital Index', icon: Gauge },
  { value: '1 / 0', label: 'Binary Verdict', icon: Binary },
];

export default function Homepage({ onEnter, onLogin, onContact }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FBFCFE] text-[#0B1B36] font-sans selection:bg-[#D4AF37] selection:text-[#FBFCFE]">
      {/* Background canvas */}
      <RoyalBackground />

      {/* ===== TOP HERO SECTION (PULPSENSE CREAM/GOLD HERO INTEGRATION WITH DOMAIN CARDS) ===== */}
      <PulpSenseHero onBookCall={onEnter} onViewServices={onLogin} />

      {/* ===== HOW VENTURE ORBITAL OPERATES — WIDE PREMIUM EDITORIAL TIMELINE ===== */}
      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <div className="text-center mb-16 md:mb-24">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#B8860B] font-bold block mb-2">Operational Methodology</span>
          <h2 className="font-sans text-3xl md:text-5xl font-extrabold text-[#0B1B36]">How Venture Orbital Operates</h2>
        </div>

        <div className="space-y-16 md:space-y-24 max-w-6xl mx-auto px-4 md:px-8">
          {PIPELINE_STEPS.map((step, idx) => {
            const Icon = step.icon;
            // Step 1 & 3: Icon on LEFT, Content on RIGHT
            // Step 2 & 4: Icon on RIGHT, Content on LEFT
            const isIconLeft = idx % 2 === 0;

            const iconBlock = (
              <div className="relative flex items-center justify-center shrink-0">
                <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 shrink-0 items-center justify-center rounded-full border-2 sm:border-[2.5px] border-[#D4AF37] bg-[#42181C] text-[#FBFCFE] shadow-2xl transition-transform duration-300 hover:scale-105">
                  {/* Top Gold Pip Dot */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-[#E2B755] border-2 border-[#FBFCFE] shadow-sm" />
                  <Icon size={44} className="text-[#FBFCFE] stroke-[1.8]" />
                </div>
              </div>
            );

            const contentBlock = (
              <div className="space-y-3 max-w-[38rem] lg:max-w-[42rem] text-left">
                {/* Gold Outlined Pill Badge */}
                <div className="inline-flex items-center rounded-full border border-[#D4AF37] px-3.5 py-1 bg-[#FBFCFE] shadow-xs">
                  <span className="font-mono text-[0.65rem] font-bold text-[#B8860B] uppercase tracking-[0.18em]">
                    STEP {step.n}
                  </span>
                </div>
                {/* Prominent Bold Matte Maroon Heading */}
                <h3 className="font-sans text-2xl sm:text-3xl lg:text-[2.2rem] font-extrabold text-[#0B1B36] tracking-tight leading-snug">
                  {step.title}
                </h3>
                {/* Wide Text Block (550–650px) for Comfortable Wrapping */}
                <p className="text-base sm:text-lg lg:text-[1.125rem] text-[#3D5A80] leading-[1.75] font-normal pt-0.5">
                  {step.desc}
                </p>
              </div>
            );

            return (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, x: isIconLeft ? -50 : 50, y: 15 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ margin: "-10% 0px -15% 0px", once: false }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className={`flex flex-col sm:flex-row items-center gap-7 sm:gap-9 md:gap-11 w-full max-w-4xl mx-auto ${
                  isIconLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'
                }`}
              >
                {/* Icon Container */}
                <div className="flex items-center justify-center shrink-0">
                  {iconBlock}
                </div>

                {/* Content Container */}
                <div className="flex-1 flex items-center justify-start">
                  {contentBlock}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===== EXECUTIVE BUSINESS CAPABILITIES CAROUSEL ===== */}
      <section id="framework" className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <CardCarousel />
      </section>

      {/* ===== JOIN OUR MISSION CALLOUT SECTION (OUTSIDE FOOTER) ===== */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="space-y-3 text-center flex flex-col items-center">
            <h4 className="font-serif italic font-bold tracking-tight text-3xl sm:text-4xl md:text-5xl text-[#8B6508] drop-shadow-xs">
              Want to Join Our Mission?
            </h4>
            <p className="font-serif italic text-base md:text-lg text-[#78520A] max-w-2xl leading-relaxed font-semibold">
              We're always looking for talented people who believe in making business intelligence accessible to all.
            </p>
          </div>
          <button
            onClick={onContact || onEnter}
            className="inline-flex items-center justify-center gap-2.5 rounded-full border border-[#8B6508] bg-gradient-to-r from-[#B8860B] via-[#996515] to-[#78520A] px-8 py-3.5 text-sm font-bold text-[#FBFCFE] hover:shadow-[0_8px_25px_rgba(139,101,8,0.4)] transition-all cursor-pointer"
          >
            <span>Get in Touch</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* ===== LUXURY EXECUTIVE FOOTER WITH DEEP MAROON BG ===== */}
      <footer id="contact" className="relative z-10 bg-[#0B1B36] text-[#FBFCFE] border-t-2 border-[#D4AF37]/50 pt-12 pb-10 px-6 overflow-hidden">
        {/* Subtle Background Radial Glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute left-1/2 -top-24 h-48 w-96 -translate-x-1/2 rounded-full bg-[#F5D77F]/10 blur-[90px]" />

        <div className="mx-auto max-w-7xl space-y-10">
          {/* Main Footer Links Columns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-8 border-b border-[#D4AF37]/25">
            {/* Brand Column */}
            <div className="md:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                <OrbitBrand size={36} />
                <h5 className="font-sans text-xl font-extrabold text-[#FBFCFE] tracking-tight">
                  Venture Orbital
                </h5>
              </div>
              <p className="text-sm text-[#D7E3F4] leading-relaxed max-w-sm">
                AI-powered business intelligence platform.
              </p>
            </div>

            {/* Platform Column */}
            <div className="md:col-span-3 space-y-3">
              <h5 className="font-mono text-xs uppercase tracking-[0.2em] text-[#F5D77F] font-bold">
                Platform
              </h5>
              <ul className="space-y-2 text-sm text-[#D7E3F4]">
                <li><button onClick={onEnter} className="hover:text-[#F5D77F] transition cursor-pointer">Dashboard</button></li>
                <li><button onClick={onEnter} className="hover:text-[#F5D77F] transition cursor-pointer">Projects</button></li>
                <li><button onClick={onLogin} className="hover:text-[#F5D77F] transition cursor-pointer">Login</button></li>
              </ul>
            </div>

            {/* Company Column */}
            <div className="md:col-span-3 space-y-3">
              <h5 className="font-mono text-xs uppercase tracking-[0.2em] text-[#F5D77F] font-bold">
                Company
              </h5>
              <ul className="space-y-2 text-sm text-[#D7E3F4]">
                <li><button onClick={onEnter} className="hover:text-[#F5D77F] transition cursor-pointer">About Us</button></li>
                <li><button onClick={onContact || onEnter} className="hover:text-[#F5D77F] transition cursor-pointer">Contact</button></li>
                <li><button onClick={onEnter} className="hover:text-[#F5D77F] transition cursor-pointer">Privacy</button></li>
              </ul>
            </div>

            {/* Connect Column */}
            <div className="md:col-span-2 space-y-3">
              <h5 className="font-mono text-xs uppercase tracking-[0.2em] text-[#F5D77F] font-bold">
                Connect
              </h5>
              <ul className="space-y-2 text-sm text-[#D7E3F4]">
                <li><a href="#" className="hover:text-[#F5D77F] transition">Twitter</a></li>
                <li><a href="#" className="hover:text-[#F5D77F] transition">LinkedIn</a></li>
                <li><a href="#" className="hover:text-[#F5D77F] transition">GitHub</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-2 text-center md:text-left">
            <p className="font-mono text-xs text-[#D7E3F4]">
              © 2026 Venture Orbital. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CountUpValue({ value, isVisible }) {
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    if (!isVisible) return;
    
    // Check if value has numbers to animate
    const numericMatches = value.match(/\d+/g);
    if (!numericMatches) {
      setDisplayValue(value);
      return;
    }

    const targetNum = parseInt(numericMatches[0], 10);
    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentNum = Math.floor(easedProgress * targetNum);

      setDisplayValue(value.replace(/\d+/, currentNum.toString()));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, value]);

  return <span>{displayValue}</span>;
}

function TelemetryStats({ stats }) {
  // Duplicate stats list to create seamless infinite loop
  const tickerItems = [...stats, ...stats, ...stats];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-50px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 mx-auto max-w-7xl px-4 my-6"
    >
      {/* Animated Top Gold Separator Line that expands from center */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent origin-center"
      />

      {/* Main Live Status Ribbon Strip */}
      <div className="relative overflow-hidden py-8 bg-[#070707]/90 rounded-xl my-1 border border-white/[0.03]">
        {/* Background 1: Faint animated flowing gold gradient */}
        <div className="pointer-events-none absolute inset-0 animate-bg-flow bg-gradient-to-r from-[#D4AF37]/[0.02] via-[#F4D67A]/[0.05] to-[#D4AF37]/[0.02] opacity-80" />

        {/* Background 2: Tiny subtle floating gold particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-1/4 left-1/5 w-1 h-1 rounded-full bg-[#F4D67A] animate-pulse" />
          <div className="absolute top-2/3 left-1/2 w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping" />
          <div className="absolute top-1/3 left-3/4 w-1 h-1 rounded-full bg-[#F4D67A] animate-pulse" />
          <div className="absolute top-3/4 left-4/5 w-1 h-1 rounded-full bg-[#D4AF37]" />
        </div>

        {/* Background 3: Scanning light sweep every 6-8 seconds */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer-sweep bg-gradient-to-r from-transparent via-[#F4D67A]/15 to-transparent w-1/3 z-10" />

        {/* Left & Right Edge Vignette Fades for seamless ticker entry */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#050505] to-transparent z-20" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050505] to-transparent z-20" />

        {/* Continuously Moving Horizontal Ticker Container */}
        <div className="animate-ticker items-center">
          {tickerItems.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={`${s.label}-${idx}`}
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="group relative flex flex-col items-center justify-center space-y-2 cursor-pointer px-12 md:px-16 py-3 min-w-[240px] text-center"
              >
                {/* Subtle Hover Ambient Glow */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[#D4AF37]/0 group-hover:bg-[#D4AF37]/[0.08] group-hover:blur-md transition-all duration-300" />

                {/* Icon & Label Header */}
                <div className="flex items-center gap-2 text-[#F4D67A] group-hover:text-[#FBFCFE] transition-colors duration-300">
                  {Icon && (
                    <motion.div
                      whileHover={{ rotate: 12 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <Icon size={15} className="text-[#D4AF37] group-hover:text-[#FBFCFE] transition-colors" />
                    </motion.div>
                  )}
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] font-bold">
                    {s.label}
                  </span>
                </div>

                {/* Metric Value */}
                <div className="font-sans text-3xl md:text-4xl font-extrabold text-[#FBFCFE] group-hover:text-[#FFF8DC] tracking-tight block transition-colors duration-300 group-hover:drop-shadow-[0_0_16px_rgba(244,214,122,0.5)]">
                  <CountUpValue value={s.value} isVisible={true} />
                </div>

                {/* Animated Gold Underline */}
                <div className="h-[2px] w-12 bg-gradient-to-r from-[#D4AF37] to-[#F4D67A] rounded-full group-hover:w-20 group-hover:from-[#FBFCFE] group-hover:to-[#F4D67A] transition-all duration-300 opacity-70 group-hover:opacity-100 group-hover:shadow-[0_0_8px_#F4D67A]" />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom Gold Separator Line */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent origin-center"
      />
    </motion.div>
  );
}

function ExecutiveOrbitalGauge({ value = 88 }) {
  const R = 76;
  const C = 2 * Math.PI * R;
  const strokeDashoffset = C - (value / 100) * C;

  return (
    <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-md">
      {/* Premium Multi-Orbit Satellite Gauge Container */}
      <div className="relative flex items-center justify-center h-64 w-64">
        {/* Outer Orbit Ring 1 - Counter Clockwise Slow Rotation */}
        <div className="absolute inset-0 rounded-full border border-dashed border-[#D4AF37]/35 animate-spin-reverse-slow" />

        {/* Outer Orbit Ring 2 - Clockwise Slow Rotation with Satellite Dot */}
        <div className="absolute inset-2 rounded-full border border-[#D4AF37]/45 animate-spin-slow">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-[#F5D77F] shadow-[0_0_12px_#F5D77F]" />
        </div>

        {/* Inner SVG Progress Arc */}
        <svg width="210" height="210" className="-rotate-90">
          <circle cx="105" cy="105" r={R} fill="none" stroke="#FBFCFE" strokeWidth="6" />
          <motion.circle
            cx="105"
            cy="105"
            r={R}
            fill="none"
            stroke="url(#goldRingGradient)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            whileInView={{ strokeDashoffset }}
            viewport={{ once: true }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />
          <defs>
            <linearGradient id="goldRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5D77F" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
          </defs>
        </svg>

        {/* Centered Large Orbital Score */}
        <div className="absolute flex flex-col items-center justify-center text-center space-y-0.5">
          <span className="font-sans text-5xl font-extrabold text-[#0B1B36] tracking-tight drop-shadow-sm">
            <CountUpValue value={value.toString()} isVisible={true} />
          </span>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[#B8860B] font-bold">
            Orbital Index
          </span>
        </div>
      </div>

      {/* Executive Status Details Breakdown Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-full rounded-2xl border border-[#D4AF37]/40 bg-[#0B1B36] text-[#FBFCFE] p-5 shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between text-xs font-mono border-b border-[#D4AF37]/25 pb-2.5">
          <span className="text-[#D7E3F4] uppercase tracking-wider">Orbital Index</span>
          <span className="font-bold text-[#F5D77F]">88 / 100</span>
        </div>
        <div className="flex items-center justify-between text-xs font-mono border-b border-[#D4AF37]/25 pb-2.5">
          <span className="text-[#D7E3F4] uppercase tracking-wider">Decision</span>
          <span className="font-extrabold text-[#0B1B36] bg-[#D4AF37] px-2.5 py-0.5 rounded-full text-[0.7rem] tracking-widest shadow-sm">
            GO (1)
          </span>
        </div>
        <div className="flex items-center justify-between text-xs font-mono border-b border-[#D4AF37]/25 pb-2.5">
          <span className="text-[#D7E3F4] uppercase tracking-wider">Confidence</span>
          <span className="font-bold text-[#F5D77F]">High</span>
        </div>
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#D7E3F4] uppercase tracking-wider">Execution Ready</span>
          <span className="font-bold text-[#FBFCFE]">YES</span>
        </div>
      </motion.div>
    </div>
  );
}
