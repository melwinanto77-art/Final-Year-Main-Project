import React, { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { motion } from "framer-motion";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export const StickyScroll = ({
  content,
  contentClassName,
}) => {
  const [activeCard, setActiveCard] = useState(0);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    container: ref,
    offset: ["start start", "end start"],
  });
  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce(
      (acc, breakpoint, index) => {
        const distance = Math.abs(latest - breakpoint);
        if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
          return index;
        }
        return acc;
      },
      0
    );
    setActiveCard(closestBreakpointIndex);
  });

  return (
    <div
      className="relative flex h-[32rem] justify-between items-center space-x-10 overflow-y-auto rounded-3xl p-8 md:p-12 bg-[#F5EFE0] border border-[#C89B3C]/40 shadow-xl transition-colors duration-500"
      ref={ref}
    >
      <div className="relative flex items-start px-4">
        <div className="max-w-xl">
          {content.map((item, index) => (
            <div key={item.title + index} className="my-16">
              {/* Domain Pill Badge */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: activeCard === index ? 1 : 0.4 }}
                className="font-mono text-xs font-bold uppercase tracking-[0.18em] px-3.5 py-1 rounded-full border border-[#C89B3C] bg-[#F3F7FC] text-[#081428] inline-block mb-3 shadow-xs"
              >
                {item.domainNum || `DOMAIN 0${index + 1}`}
              </motion.span>

              {/* Title in Black/Dark Maroon */}
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: activeCard === index ? 1 : 0.35 }}
                className="text-2xl md:text-3xl font-extrabold font-sans text-[#04101F] tracking-tight"
              >
                {item.title}
              </motion.h2>

              {/* Description in Black/Dark Brown */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: activeCard === index ? 1 : 0.35 }}
                className="text-sm md:text-base font-sans leading-relaxed mt-4 text-[#1B3557] font-medium max-w-md"
              >
                {item.description}
              </motion.p>
            </div>
          ))}
          <div className="h-32" />
        </div>
      </div>

      {/* Individual Domain Card in Matte Maroon (#24406B) */}
      <div
        className={cn(
          "sticky top-8 hidden h-72 w-96 shrink-0 overflow-hidden rounded-2xl bg-[#24406B] border border-[#D4AF37]/50 lg:flex items-center justify-center p-6 shadow-2xl transition-all duration-300",
          contentClassName
        )}
      >
        {content[activeCard].content ?? null}
      </div>
    </div>
  );
};
