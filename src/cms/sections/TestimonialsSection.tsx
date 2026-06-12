import { motion } from 'framer-motion';
import { useTestimonials } from '../hooks/useCMSPage';
import type { CMSSection, TestimonialsConfig } from '../types';

export default function TestimonialsSection({ section }: { section: CMSSection }) {
  const cfg = section.config as TestimonialsConfig;
  const { items, loading } = useTestimonials();

  const heading = cfg.heading || 'Voices of the';
  const headingItalic = cfg.heading_italic || 'Archive';

  if (loading || items.length === 0) return null;

  return (
    <section className="py-14 md:py-24 container-px bg-white overflow-hidden border-b border-black/5">
      <div className="flex items-end justify-between mb-16">
        <div className="overflow-hidden">
          <motion.h2
            initial={{ y: '100%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl tracking-tight font-elegant"
          >
            {heading} <span className="italic text-accent">{headingItalic}</span>
          </motion.h2>
        </div>
        <div className="hidden md:block text-[9px] tracking-[0.4em] uppercase text-black/30 font-ui font-medium">
          Drag to Explore →
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ right: 0, left: -1000 }}
        className="flex gap-16 cursor-grab active:cursor-grabbing"
      >
        {items.map((item, index) => (
          <motion.div key={item.id} className="min-w-[300px] md:min-w-[500px] flex flex-col">
            <span className="text-[9px] tracking-[0.4em] uppercase text-accent mb-8 font-ui font-bold">
              0{index + 1} // Archive Review
            </span>
            <p className="text-2xl md:text-3xl leading-relaxed text-black mb-12 select-none font-elegant font-light">
              "{item.body}"
            </p>
            <div className="mt-auto">
              <h4 className="text-[12px] tracking-[0.2em] uppercase font-bold text-black font-ui">
                {item.name}
              </h4>
              {item.role && (
                <span className="text-[10px] tracking-[0.1em] text-black/40 uppercase font-ui">
                  {item.role}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="w-full h-[1px] bg-black/5 mt-20 relative">
        <motion.div
          className="absolute top-0 left-0 h-full bg-accent w-1/4"
          initial={{ x: 0 }}
          whileInView={{ x: '300%' }}
          transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
        />
      </div>
    </section>
  );
}
