import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTestimonials } from '../hooks/useCMSPage';
import type { CMSSection, TestimonialsConfig, Testimonial } from '../types';

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'Aarav Mehta',
    role: 'Fashion Editor',
    body: 'Vault 26 has achieved what few homegrown luxury brands do — impeccable tailoring, heavy fabric weight, and understated elegance.',
    rating: 5
  },
  {
    id: 't-2',
    name: 'Rohan Kapoor',
    role: 'Creative Director',
    body: 'The heavy box tee and selvedge utility jacket are staples in my wardrobe now. Pure quiet luxury.',
    rating: 5
  },
  {
    id: 't-3',
    name: 'Priya Sharma',
    role: 'Architect',
    body: 'Silhouettes that speak for themselves. The attention to detail and material texture is world class.',
    rating: 5
  },
  {
    id: 't-4',
    name: 'Vikramaditya Roy',
    role: 'Stylist & Designer',
    body: 'Exceptional craftsmanship. The fit of the merino knit polo and structured trousers is unmatched.',
    rating: 5
  }
];

export default function TestimonialsSection({ section }: { section: CMSSection }) {
  const cfg = section.config as TestimonialsConfig;
  const { items: dbItems } = useTestimonials();

  const testimonials: Testimonial[] = dbItems && dbItems.length > 0 ? dbItems : FALLBACK_TESTIMONIALS;
  
  // Multiply array for seamless infinite marquee loop
  const marqueeItems = [...testimonials, ...testimonials, ...testimonials, ...testimonials];

  return (
    <section className="py-16 md:py-24 bg-white text-black font-ui border-t border-black/5 overflow-hidden">
      <div className="container-px mb-8 md:mb-12">
        {/* Section Header Matching Chienne Reference */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-ui text-black/50 tracking-[0.2em] uppercase block mb-1">
              Client Feedback
            </span>
            <h2 className="text-3xl md:text-5xl font-serif-condensed font-medium text-[#B11226] tracking-tight">
              {cfg.heading || "Testimonials"}
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[#B11226]">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-4 h-4 fill-[#B11226] text-[#B11226]" />
            ))}
          </div>
        </div>
      </div>

      {/* Infinite Marquee Ticker Container */}
      <div className="w-full overflow-hidden flex select-none">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="flex gap-6 md:gap-8 shrink-0"
        >
          {marqueeItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="w-[320px] sm:w-[380px] md:w-[440px] shrink-0 bg-[#F8F8F8] p-6 md:p-8 flex flex-col justify-between border border-black/5"
            >
              <div>
                {/* 5-Star Rating */}
                <div className="flex gap-1 mb-4 text-[#B11226]">
                  {[...Array(item.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#B11226] text-[#B11226]" />
                  ))}
                </div>

                <p className="text-xs md:text-sm font-ui font-light text-black/80 leading-relaxed italic mb-6">
                  "{item.body}"
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs md:text-sm font-ui font-medium text-black tracking-wide uppercase">
                    {item.name}
                  </h3>
                  {item.role && (
                    <span className="text-[11px] font-ui text-black/40 font-light block">
                      {item.role}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-ui text-[#B11226] font-medium uppercase tracking-wider">
                  Verified Buyer
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
