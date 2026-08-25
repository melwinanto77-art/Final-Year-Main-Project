import React from "react"
import { Swiper, SwiperSlide } from "swiper/react"

import "swiper/css"
import "swiper/css/effect-coverflow"
import "swiper/css/pagination"
import "swiper/css/navigation"
import { SparklesIcon } from "lucide-react"
import {
  Autoplay,
  EffectCoverflow,
  Navigation,
  Pagination,
} from "swiper/modules"

import { Badge } from "./badge.jsx"

export const CARD_ITEMS = [
  {
    num: "01",
    icon: "🔍",
    title: "Customer Discovery",
    desc: "Validate your business idea, define problem statements, and analyze consumer communication potential.",
    image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "02",
    icon: "👤",
    title: "Profiling",
    desc: "Sector-based B2B/B2C consumer profiling — from logistics and HR tech to delivery and production.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "03",
    icon: "📊",
    title: "Market Size",
    desc: "Calculate your TAM, SAM, and SOM with conversion percentages for realistic market opportunity sizing.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "04",
    icon: "⚖️",
    title: "Feasibility",
    desc: "Score-based assessment to determine whether your B2B play is worth pursuing with parametric analysis.",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "05",
    icon: "💰",
    title: "Pricing",
    desc: "Differentiate between competitor pricing strategies and find your optimal price positioning.",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "06",
    icon: "🔬",
    title: "Market Research",
    desc: "Deep-dive into competition, business landscape, and product analysis with SpyFu-grade intelligence.",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "07",
    icon: "📄",
    title: "Industry Report",
    desc: "AI-generated comprehensive documentation about your business based on uploaded reports and data.",
    image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "08",
    icon: "✅",
    title: "Business Model Validation",
    desc: "Analyze investment worth through primary surveys, custom forms, and secondary existing research.",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "09",
    icon: "🚀",
    title: "GTM Strategy",
    desc: "Go-to-market planning with customer availability analysis, advertising strategies, and AI suggestions.",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
  },
  {
    num: "10",
    icon: "🎯",
    title: "OKR Tracking",
    desc: "Set objectives, define key results, and track goal achievement with structured frameworks.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
  },
];

export const CardCarousel = ({
  items = CARD_ITEMS,
  autoplayDelay = 2200,
  showPagination = true,
  showNavigation = true,
}) => {
  const css = `
  .swiper {
    width: 100%;
    padding-bottom: 50px;
  }
  
  .swiper-slide {
    background-position: center;
    background-size: cover;
    width: 320px;
  }
  
  .swiper-slide img {
    display: block;
    width: 100%;
  }
  
  .swiper-3d .swiper-slide-shadow-left,
  .swiper-3d .swiper-slide-shadow-right {
    background: none;
  }

  .swiper-pagination-bullet {
    background: #D4AF37 !important;
    opacity: 0.4;
  }
  .swiper-pagination-bullet-active {
    opacity: 1;
    background: #D4AF37 !important;
    width: 24px;
    border-radius: 9999px;
  }
  
  .swiper-button-next, .swiper-button-prev {
    color: #D4AF37 !important;
  }
  `
  return (
    <section className="w-full py-4">
      <style>{css}</style>
      <div className="w-full">
        <div className="flex flex-col items-center justify-center text-center pb-6 w-full">
          <h3 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#0B1B36]">
            10-Step Strategic Framework
          </h3>
          <p className="text-[#3D5A80] text-base md:text-lg mt-2 max-w-xl font-medium">
            From market discovery and feasibility scoring to go-to-market execution and OKR telemetry.
          </p>
        </div>

        <div className="flex w-full items-center justify-center gap-4 mt-2">
          <div className="w-full">
            <Swiper
              spaceBetween={40}
              autoplay={{
                delay: autoplayDelay,
                disableOnInteraction: false,
              }}
              effect={"coverflow"}
              grabCursor={true}
              centeredSlides={true}
              loop={true}
              slidesPerView={"auto"}
              coverflowEffect={{
                rotate: 0,
                stretch: 0,
                depth: 120,
                modifier: 2,
              }}
              pagination={showPagination ? { clickable: true } : false}
              navigation={
                showNavigation
                  ? {
                      nextEl: ".swiper-button-next",
                      prevEl: ".swiper-button-prev",
                    }
                  : undefined
              }
              modules={[EffectCoverflow, Autoplay, Pagination, Navigation]}
            >
              {items.map((item, index) => (
                <SwiperSlide key={index}>
                  <div className="group relative flex flex-col justify-between h-[380px] w-full rounded-2xl border-2 border-[#D4AF37]/50 bg-[#0B1B36] p-5 shadow-xl transition-all duration-300 overflow-hidden">
                    {/* Background Image Overlay with dark burgundy gradient */}
                    <div className="absolute inset-0 -z-10 opacity-20 group-hover:opacity-30 transition-opacity">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0B1B36]/90 via-[#0B1B36]/95 to-[#050E1D]" />

                    {/* Header Badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#F5D77F] bg-[#FBFCFE]/10 border border-[#D4AF37]/40 px-2.5 py-1 rounded-full">
                        MODULE {item.num}
                      </span>
                      <span className="text-2xl">{item.icon}</span>
                    </div>

                    {/* Centered Card Title */}
                    <div className="my-auto flex flex-col items-center justify-center text-center px-2 py-4">
                      <h4 className="font-sans text-2xl font-extrabold text-[#FBFCFE] group-hover:text-[#F5D77F] transition-colors leading-tight">
                        {item.title}
                      </h4>
                    </div>

                    {/* Footer Description */}
                    <div>
                      <p className="font-sans text-xs text-[#D7E3F4] leading-relaxed text-center">
                        {item.desc}
                      </p>
                      {/* Decorative Gold Accent Bar */}
                      <div className="mt-3 mx-auto h-1 w-12 bg-gradient-to-r from-[#F5D77F] to-[#D4AF37] rounded-full group-hover:w-24 transition-all duration-500" />
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
    </section>
  )
}
