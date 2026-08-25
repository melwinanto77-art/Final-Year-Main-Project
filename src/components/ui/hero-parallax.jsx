import React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";

export const HeroParallax = ({
  products,
  headerComponent,
}) => {
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 220, damping: 28 };

  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.45], [12, 0]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.45], [6, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.45], [0, -30]),
    springConfig
  );

  return (
    <div
      ref={ref}
      className="min-h-[110vh] pt-0 pb-16 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]"
    >
      {/* Clean Hero Header Container */}
      <div className="relative w-full z-20">
        {headerComponent || <Header />}
      </div>

      {/* 
        Single Continuous DOM Domain Cards Layer
        Positioned beneath the hero section with scroll progress driving position & rotation
      */}
      <motion.div
        id="domains"
        style={{
          rotateX,
          rotateZ,
          translateY,
        }}
        className="mt-8 sm:mt-12 relative px-6 max-w-7xl mx-auto w-full z-10 scroll-mt-20"
      >
        {/* Properly arranged 5 Domain Cards Grid (3 top, 2 bottom centered) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 max-w-6xl mx-auto justify-items-center">
          {products.slice(0, 3).map((product, idx) => (
            <ProductCard
              product={product}
              index={idx}
              scrollYProgress={scrollYProgress}
              key={product.title}
            />
          ))}
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap justify-center gap-5 md:gap-6 w-full">
            {products.slice(3, 5).map((product, idx) => (
              <ProductCard
                product={product}
                index={idx + 3}
                scrollYProgress={scrollYProgress}
                key={product.title}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const Header = () => {
  return (
    <div className="max-w-7xl relative mx-auto py-20 md:py-40 px-4 w-full left-0 top-0">
      <h1 className="text-2xl md:text-7xl font-bold dark:text-white">
        The Ultimate <br /> development studio
      </h1>
      <p className="max-w-2xl text-base md:text-xl mt-8 dark:text-neutral-200">
        We build beautiful products with the latest technologies and frameworks.
        We are a team of passionate developers and designers that love to build
        amazing products.
      </p>
    </div>
  );
};

export const ProductCard = ({
  product,
  index = 0,
  scrollYProgress,
}) => {
  const Icon = product.icon;
  const domainIndex = (index + 1).toString().padStart(2, '0');

  // Staggered continuous scroll progress boundaries per card index
  const startProgress = 0.08 + index * 0.04;
  const endProgress = startProgress + 0.28;

  const springConfig = { stiffness: 180, damping: 24 };

  const rawY = useTransform(scrollYProgress, [startProgress, endProgress], [50, 0]);
  const y = useSpring(rawY, springConfig);

  const rawOpacity = useTransform(scrollYProgress, [startProgress, endProgress], [0, 1]);
  const opacity = useSpring(rawOpacity, springConfig);

  const rawScale = useTransform(scrollYProgress, [startProgress, endProgress], [0.95, 1]);
  const scale = useSpring(rawScale, springConfig);

  return (
    <motion.div
      style={{
        opacity,
        y,
        scale,
      }}
      whileHover={{
        y: -10,
        scale: 1.02,
        boxShadow: "0 25px 40px -10px rgba(45, 12, 16, 0.6)",
      }}
      key={product.title}
      className="group/product h-80 w-full max-w-[19.5rem] sm:max-w-[20.5rem] relative shrink-0 rounded-[20px] bg-[#42181C] shadow-2xl p-6 flex flex-col justify-between text-left transition-shadow duration-500 overflow-hidden cursor-pointer"
    >
      {/* Top Header: Left Oval Pill Badge + Right Solid Gold Icon Square */}
      <div className="relative z-10 flex items-center justify-between w-full">
        {/* Left Pill Badge */}
        <div className="inline-flex items-center justify-center rounded-full border border-[#7A353E] px-3.5 py-1 bg-[#331114]/80">
          <span className="font-mono text-[0.62rem] font-bold text-[#E2B755] uppercase tracking-[0.18em]">
            DOMAIN {domainIndex}
          </span>
        </div>

        {/* Right Solid Gold Icon Badge */}
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#DDA835] text-[#240B0E] shadow-sm">
          {Icon ? <Icon size={19} className="text-[#240B0E] stroke-[2.2]" /> : <span className="font-extrabold text-xs">CO</span>}
        </div>
      </div>

      {/* Middle Body: Left-aligned Title & Multi-line Description */}
      <div className="relative z-10 flex flex-col items-start justify-start space-y-2.5 my-auto pt-2">
        <h3 className="font-sans text-xl sm:text-[1.35rem] font-extrabold text-[#FFFFFF] tracking-tight leading-snug">
          {product.title}
        </h3>
        <p className="text-xs sm:text-[0.82rem] text-[#D8B4B8] group-hover/product:text-[#FAF4E8] font-normal leading-relaxed transition-colors duration-300">
          {product.description}
        </p>
      </div>

      {/* Footer: Thin Separator Line + Strategy Module Footer Link */}
      <div className="relative z-10 w-full pt-3 border-t border-[#592328]/80 flex items-center justify-between font-mono text-[0.63rem] tracking-wider uppercase">
        <span className="text-[#A36B72] font-semibold">STRATEGY MODULE</span>
        <span className="text-[#E2B755] font-bold group-hover/product:text-[#FFFFFF] transition-colors flex items-center gap-1">
          Explore domain <span className="text-xs">›</span>
        </span>
      </div>
    </motion.div>
  );
};
