import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CMSSection, EditorialSplitConfig } from '../types';

export default function EditorialSplitSection({ section }: { section: CMSSection }) {
  const cfg = section.config as EditorialSplitConfig;
  const lines: string[] = Array.isArray(cfg.heading_lines) && cfg.heading_lines.length > 0
    ? cfg.heading_lines
    : ['Redefining', 'Street Culture'];
  const imageRight = cfg.image_position === 'right';

  const imageCol = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden group aspect-[4/5]"
    >
      <img
        src={cfg.image || 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=1080'}
        alt="Editorial"
        className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
      />
    </motion.div>
  );

  const textCol = (
    <div className="space-y-6">
      <div className="overflow-hidden">
        <motion.span
          initial={{ y: '100%' }}
          whileInView={{ y: '0%' }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="block text-accent text-6xl md:text-8xl leading-none font-elegant font-light"
        >
          {cfg.accent_number || '26'}
        </motion.span>
      </div>

      {lines.map((word, i) => (
        <div key={word} className="overflow-hidden">
          <motion.h3
            initial={{ y: '100%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl leading-tight font-elegant font-normal"
          >
            {word}
          </motion.h3>
        </div>
      ))}

      <motion.div
        initial={{ scaleX: 0, originX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-20 h-[1px] bg-accent"
      />

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="text-base leading-relaxed text-black/60 font-ui font-light"
      >
        {cfg.body || 'Where high fashion meets street authenticity. Vault 26 is more than clothing — it\'s a statement of individuality and fearless self-expression.'}
      </motion.p>

      {(cfg.cta_label || cfg.cta_href) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.65 }}
        >
          <Link
            to={cfg.cta_href || '/shop'}
            className="inline-block border border-black px-10 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-black hover:text-white transition-all duration-400 font-ui font-light"
          >
            {cfg.cta_label || 'Discover More'}
          </Link>
        </motion.div>
      )}
    </div>
  );

  return (
    <section className="pb-20 pt-4 container-px bg-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {imageRight ? <>{textCol}{imageCol}</> : <>{imageCol}{textCol}</>}
        </div>
      </div>
    </section>
  );
}
