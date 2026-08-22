import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useFAQs } from '../hooks/useCMSPage';
import type { CMSSection, FAQConfig } from '../types';

export default function FAQSection({ section }: { section: CMSSection }) {
  const cfg = section.config as FAQConfig;
  const { items, loading } = useFAQs(cfg.category);
  const [open, setOpen] = useState<string | null>(null);

  const heading = cfg.heading || 'Frequently Asked Questions';

  if (loading || items.length === 0) return null;

  return (
    <section className="py-24 container-px bg-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="overflow-hidden mb-16">
          <motion.h2
            initial={{ y: '100%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-5xl tracking-tight font-elegant font-light"
          >
            {heading}
          </motion.h2>
        </div>

        <div className="divide-y divide-black/5">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <button
                onClick={() => setOpen(open === item.id ? null : item.id)}
                className="w-full py-6 flex items-start justify-between gap-4 text-left group"
              >
                <span className="text-base md:text-lg font-elegant font-light tracking-tight group-hover:text-accent transition-colors duration-300">
                  {item.question}
                </span>
                <span className="mt-1 flex-shrink-0 text-accent">
                  {open === item.id ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
              </button>
              <AnimatePresence>
                {open === item.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-6 text-black/60 font-ui font-light text-sm md:text-base leading-relaxed max-w-3xl">
                      {item.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
