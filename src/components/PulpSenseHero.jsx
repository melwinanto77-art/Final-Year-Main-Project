import React from 'react';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Sparkles, GraduationCap, School, Factory, Building2, Rocket } from 'lucide-react';
import { OrbitBrand } from './ui.jsx';
import { HeroParallax } from './ui/hero-parallax.jsx';

/* ============================================================
   DOMAIN CARDS DATA & GEOMETRY PATTERNS FOR PARALLAX
   ============================================================ */

const PatternStudents = () => (
  <svg className="w-full h-full opacity-15 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <circle cx="200" cy="120" r="70" strokeWidth="1" />
    <polygon points="200,70 240,95 200,120 160,95" strokeWidth="1" fill="rgba(212,175,55,0.03)" />
  </svg>
);

const PatternInstitutions = () => (
  <svg className="w-full h-full opacity-15 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <rect x="100" y="60" width="200" height="120" rx="12" strokeWidth="1" />
    <circle cx="200" cy="120" r="24" strokeWidth="1" fill="rgba(212,175,55,0.03)" />
  </svg>
);

const PatternMSMEs = () => (
  <svg className="w-full h-full opacity-15 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <path d="M80 160 L160 110 L240 135 L320 80" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="320" cy="80" r="4" fill="#D4AF37" />
  </svg>
);

const PatternIndustries = () => (
  <svg className="w-full h-full opacity-15 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <polygon points="200,40 300,100 300,170 200,200 100,170 100,100" strokeWidth="1" />
  </svg>
);

const PatternStartups = () => (
  <svg className="w-full h-full opacity-15 stroke-[#D4AF37]" viewBox="0 0 400 240" fill="none">
    <ellipse cx="200" cy="120" rx="120" ry="50" strokeWidth="1" transform="rotate(-15 200 120)" />
    <circle cx="200" cy="120" r="18" fill="rgba(212,175,55,0.05)" strokeWidth="1" />
  </svg>
);

const DOMAIN_CARDS_DATA = [
  {
    title: 'Students & Scholars',
    icon: GraduationCap,
    description: 'Academic counseling, research mentorship, thesis guidance, and career trajectory mapping.',
    capabilities: ['Academic Counseling', 'Publication Mentorship'],
    patternComponent: PatternStudents
  },
  {
    title: 'Educational Institutions',
    icon: School,
    description: 'Curriculum optimization, organizational diagnosis, accreditation alignment, and digital transformation.',
    capabilities: ['Curriculum Diagnosis', 'Accreditation Pipelines'],
    patternComponent: PatternInstitutions
  },
  {
    title: 'MSMEs',
    icon: Factory,
    description: 'Operational bottleneck diagnostics, capacity building, unit economic sizing, and market expansion.',
    capabilities: ['Bottleneck Audit', 'Unit Payback Sizing'],
    patternComponent: PatternMSMEs
  },
  {
    title: 'Industries',
    icon: Building2,
    description: 'Large-scale systemic optimization, innovation pipelines, strategic partnerships, and enterprise risk.',
    capabilities: ['Systemic Optimization', 'Regulatory Risk Matrix'],
    patternComponent: PatternIndustries
  },
  {
    title: 'Startups',
    icon: Rocket,
    description: 'Market validation, TAM/SAM sizing, pricing strategy, GTM readiness, and investor positioning.',
    capabilities: ['Customer Discovery', 'Orbital Score Verdict'],
    patternComponent: PatternStartups
  }
];

const NAV_ITEMS = [
  { label: 'Home', target: 'hero' },
  { label: 'Domains', target: 'domains' },
  { label: 'Strategic Framework', target: 'framework' },
  { label: 'How It Works', target: 'how-it-works' },
  { label: 'Contact', target: 'contact' },
];

export default function PulpSenseHero({ onBookCall, onViewServices }) {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const HeaderComponent = (
    <div className="w-full" id="hero">
      {/* ================= 1. TOP NAVIGATION HEADER ================= */}
      <header className="relative z-20 flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto w-full pt-4 px-4 sm:px-6 md:px-12 gap-4">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
          <OrbitBrand size={36} />
          <span className="text-[#C89B3C] font-light text-base hidden sm:inline">–</span>
          <span className="font-mono text-xs font-extrabold uppercase tracking-[0.25em] text-[#B8860B]">
            THE VENTURE ORBITAL
          </span>
        </div>

        {/* Center: Simple Minimal Navigation Links */}
        <nav className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:gap-10 py-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className="group relative text-xs sm:text-sm font-semibold text-[#0B1B36] hover:text-[#3D5A80] transition-colors cursor-pointer whitespace-nowrap py-1 tracking-wide"
            >
              <span>{item.label}</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D4AF37] transition-all duration-300 group-hover:w-full" />
            </button>
          ))}
        </nav>

        {/* Right: Executive Profile Button */}
        <button
          type="button"
          onClick={onViewServices || onBookCall}
          className="hidden lg:flex items-center gap-2.5 rounded-full bg-[#081428] hover:bg-[#16294D] px-4 py-2 text-xs font-bold text-[#FBFCFE] shadow-md transition-all cursor-pointer"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FBFCFE] text-[#081428] font-mono text-[0.65rem] font-bold">
            EX
          </div>
          <span className="font-sans text-xs font-bold tracking-wide">
            Executive Profile
          </span>
        </button>
      </header>

      {/* ================= 2. CENTERED HERO CONTENT ================= */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center max-w-5xl mx-auto pt-12 md:pt-16 pb-8 px-6">
        
        {/* Centered Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/80 bg-[#FBFCFE]/80 px-5 py-1.5 text-[0.7rem] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#3D5A80] shadow-xs backdrop-blur-md mb-8"
        >
          <Sparkles size={14} className="text-[#D4AF37]" />
          <span>SYSTEMIC SOVEREIGNTY & AI INTELLIGENCE</span>
        </motion.div>

        {/* Headline — Serif Italic Luxury Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="font-serif italic font-medium tracking-tight text-5xl sm:text-7xl lg:text-8xl leading-[1.08] text-center"
        >
          <span className="block bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#E6C260] bg-clip-text text-transparent drop-shadow-[0_4px_25px_rgba(212,175,55,0.4)]">
            Grow your business,
          </span>
          <span className="block text-[#0B1B36] drop-shadow-[0_4px_16px_rgba(11,27,54,0.15)] mt-1 sm:mt-3">
            not your payroll
          </span>
        </motion.h1>

        {/* Dual CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full sm:w-auto"
        >
          {/* Primary Gold CTA */}
          <button
            type="button"
            onClick={onViewServices || onBookCall}
            className="group flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#C89B3C] to-[#B8860B] hover:from-[#E6C260] hover:to-[#C89B3C] px-8 py-3.5 text-sm font-bold text-[#0B1B36] shadow-[0_6px_25px_rgba(200,155,60,0.35)] transition-all cursor-pointer"
          >
            <Play size={14} className="fill-[#0B1B36] text-[#0B1B36]" />
            <span>Start your journey</span>
            <span className="text-xs font-black">›</span>
          </button>

          {/* Secondary White/Gold Bordered CTA */}
          <button
            type="button"
            onClick={onViewServices || onBookCall}
            className="flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full border border-[#D4AF37] bg-[#FBFCFE] hover:bg-[#EDF2F9] px-8 py-3.5 text-sm font-bold text-[#0B1B36] shadow-xs transition-all cursor-pointer"
          >
            <span>Sign In Executive Profile</span>
            <ArrowRight size={14} className="text-[#0B1B36]" />
          </button>
        </motion.div>

      </main>
    </div>
  );

  return (
    <div className="relative w-full bg-[#FBFCFE] text-[#0B1B36] font-sans overflow-hidden selection:bg-[#D4AF37] selection:text-[#FBFCFE]">
      {/* Background Soft Lighting Radial Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(245,215,127,0.3)_0%,rgba(255,255,255,0)_65%)]" />

      {/* Hero Parallax with 5 Main Domain Cards */}
      <HeroParallax products={DOMAIN_CARDS_DATA} headerComponent={HeaderComponent} />
    </div>
  );
}
