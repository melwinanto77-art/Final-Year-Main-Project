import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ChevronLeft, ChevronRight, Play, CheckCircle2 } from 'lucide-react';

export const CarouselContext = createContext({
  onCardClose: () => {},
  currentIndex: 0,
});

export const Carousel = ({ items, initialScroll = 0 }) => {
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll functionality: slowed down to 4.5 seconds for a smoother luxury pace
  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        const maxScroll = scrollWidth - clientWidth;
        const cardStep = 400; // Updated step for wider 360px cards (360px + 40px gap)

        if (scrollLeft >= maxScroll - 15) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: cardStep, behavior: 'smooth' });
        }
      }
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  const handleCardClose = (index) => {
    if (carouselRef.current) {
      const cardWidth = isMobile() ? 300 : 360;
      const gap = isMobile() ? 20 : 40;
      const scrollPosition = (cardWidth + gap) * index;
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
      setCurrentIndex(index);
    }
  };

  const isMobile = () => {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  };

  return (
    <CarouselContext.Provider value={{ onCardClose: handleCardClose, currentIndex }}>
      <div className="relative w-full overflow-hidden py-6 group">
        {/* Navigation Controls */}
        <div className="flex justify-end gap-3 max-w-7xl mx-auto px-6 mb-6">
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[#0C0C0C]/90 text-[#F4D67A] hover:bg-[#D4AF37] hover:text-[#050505] disabled:opacity-30 transition cursor-pointer shadow-lg backdrop-blur-md"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[#0C0C0C]/90 text-[#F4D67A] hover:bg-[#D4AF37] hover:text-[#050505] disabled:opacity-30 transition cursor-pointer shadow-lg backdrop-blur-md"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Carousel Scroll Container (Slowed down, pauses on hover) */}
        <div
          ref={carouselRef}
          onScroll={checkScrollability}
          className="flex w-full overflow-x-scroll overscroll-x-contain py-8 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:none px-6 md:px-12 gap-8 cursor-grab active:cursor-grabbing"
        >
          {items.map((item, index) => (
            <motion.div
              key={"card" + index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="flex-shrink-0"
            >
              {item}
            </motion.div>
          ))}
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const Card = ({ card, index, layout = false, onEnter }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { onCardClose } = useContext(CarouselContext);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    onCardClose(index);
  };

  const Icon = card.icon;

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 h-screen overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 h-full w-full bg-[#050505]/85 backdrop-blur-xl"
            />

            {/* Modal Detail Container */}
            <div className="flex min-h-full items-center justify-center p-4 md:p-10 relative z-10">
              <motion.div
                ref={containerRef}
                layoutId={layout ? `card-${card.title}` : undefined}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative max-w-2xl w-full rounded-[32px] border border-[#D4AF37]/35 bg-[linear-gradient(145deg,#2D3035_0%,#22252A_55%,#191B1F_100%)] p-6 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden text-[#FBFCFE]"
              >
                {/* Close Button */}
                <button
                  onClick={handleClose}
                  className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-[#050505] text-[#D4AF37] hover:bg-[#151515] hover:text-[#FBFCFE] transition cursor-pointer z-20 shadow-md"
                >
                  <X size={18} />
                </button>

                {/* Abstract Background Artwork Header */}
                <div className="relative h-48 md:h-56 w-full rounded-2xl overflow-hidden mb-8 border border-[#D4AF37]/20 bg-[#111317]">
                  <card.patternComponent />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#22252A] via-transparent to-transparent" />
                  
                  <div className="absolute bottom-4 left-6 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#050505] text-[#D4AF37] shadow-xl border border-[#D4AF37]/30">
                      <Icon size={28} />
                    </div>
                    <div>
                      <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#D4AF37] bg-[#050505]/60 border border-[#D4AF37]/40 px-2.5 py-0.5 rounded-md block w-max mb-1 shadow-xs">
                        Domain 0{index + 1}
                      </span>
                      <h4 className="font-sans text-xl font-bold text-[#FBFCFE]">
                        {card.title}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-6 text-left">
                  <div className="space-y-2">
                    <h3 className="font-sans text-2xl md:text-3xl font-extrabold text-[#FBFCFE]">
                      {card.title} Executive Strategy
                    </h3>
                    <p className="font-sans text-base text-[#CFCFCF] leading-relaxed font-medium">
                      {card.description}
                    </p>
                  </div>

                  {/* Capabilities List */}
                  <div className="space-y-3 pt-2">
                    <h5 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#F4D67A]">
                      Key Strategic Capabilities
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {card.capabilities.map((cap, cIdx) => (
                        <div
                          key={cIdx}
                          className="flex items-center gap-2.5 rounded-xl border border-[#D4AF37]/25 bg-[#15171C]/70 p-3 text-xs font-bold text-[#E5E5E5] shadow-xs"
                        >
                          <CheckCircle2 size={15} className="text-[#D4AF37] shrink-0" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gold Accent Divider */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent my-6" />

                  {/* Action CTA */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <p className="font-serif italic text-xs text-[#CFCFCF] font-semibold">
                      Authoritative validation & orbital decision verdict.
                    </p>
                    <button
                      onClick={() => {
                        handleClose();
                        if (onEnter) onEnter();
                      }}
                      className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#F4D67A] via-[#D4AF37] to-[#C89B3C] px-7 py-3.5 font-sans text-xs font-bold text-[#050505] shadow-lg hover:shadow-[0_8px_25px_rgba(212,175,55,0.4)] transition cursor-pointer w-full sm:w-auto justify-center"
                    >
                      <Play size={14} className="fill-[#050505]" />
                      <span>Launch Strategy Engine</span>
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Surface Card Component — Premium Ash Grey Aesthetic (#2D3035 -> #22252A -> #191B1F) with Gold Accents */}
      <motion.div
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={handleOpen}
        whileHover={{ y: -8, scale: 1.025 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="group relative h-[530px] w-[300px] sm:w-[360px] rounded-[32px] border border-[#D4AF37]/35 bg-[linear-gradient(145deg,#2D3035_0%,#22252A_55%,#191B1F_100%)] overflow-hidden cursor-pointer shadow-[0_18px_40px_rgba(0,0,0,0.6)] hover:shadow-[0_24px_50px_rgba(212,175,55,0.3)] hover:border-[#D4AF37] flex flex-col justify-between p-8 text-[#FBFCFE] transition-colors duration-300"
      >
        {/* Gold Highlight Line near top edge */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-90" />

        {/* Abstract Background Orbital Geometry Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity duration-500">
          <card.patternComponent />
        </div>

        {/* Gentle Glossy Light Sweep Overlay on Hover */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 ease-in-out z-20" />

        {/* Top Header: Badge (Ash background with thin gold border and gold text) */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#F4D67A] bg-[#111317]/80 border border-[#D4AF37]/50 px-3.5 py-1.5 rounded-full shadow-xs backdrop-blur-md">
            Domain 0{index + 1}
          </span>

          {/* Small Gold Decorative Corner Geometric Dot */}
          <div className="h-2 w-2 rounded-full bg-[#D4AF37]/60 group-hover:bg-[#D4AF37] group-hover:scale-125 transition-all" />
        </div>

        {/* Center Primary Visual Element: Simple, Natural Icon */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto py-4">
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-[#050505]/15 group-hover:bg-[#050505]/30 border border-white/5 group-hover:border-[#D4AF37]/30 group-hover:scale-105 transition-all duration-300">
            <motion.div
              whileHover={{ rotate: 2, y: -2 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Icon size={64} strokeWidth={1.15} className="text-[#F5F5F5] opacity-90 group-hover:opacity-100 group-hover:text-[#F4D67A] transition-all" />
            </motion.div>
          </div>
        </div>

        {/* Bottom Content: Title (#FBFCFE), Description (#CFCFCF), and Gold Explore Button */}
        <div className="relative z-10 space-y-3 text-center">
          <h3 className="font-sans text-2xl font-extrabold text-[#FBFCFE] tracking-tight leading-snug">
            {card.title}
          </h3>
          <p className="font-sans text-xs font-medium text-[#CFCFCF] line-clamp-2 leading-relaxed px-1">
            {card.description}
          </p>
          
          <div className="pt-3">
            <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F4D67A] via-[#D4AF37] to-[#C89B3C] px-6.5 py-2.5 font-mono text-xs font-bold text-[#050505] shadow-md group-hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)] group-hover:scale-102 transition-all duration-300">
              <span>Explore Domain</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1.5" />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};
