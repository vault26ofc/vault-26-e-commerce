import { motion } from 'framer-motion';
import type { CMSSection, TextRevealConfig } from '../types';

export default function TextRevealSection({ section }: { section: CMSSection }) {
  const cfg = section.config as TextRevealConfig;
  const words: string[] = Array.isArray(cfg.words) && cfg.words.length > 0
    ? cfg.words
    : ['ATTITUDE', 'CONFIDENCE'];
  const showLine = cfg.show_accent_line !== false;

  return (
    <section id="about" className="pt-28 pb-10 container-px bg-white overflow-hidden">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-row items-baseline justify-center gap-6 md:gap-12 flex-wrap">
          {words.map((word, i) => (
            <div key={i} className="overflow-hidden">
              <motion.h2
                initial={{ y: '100%', opacity: 0 }}
                whileInView={{ y: '0%', opacity: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.1, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={`text-[10vw] md:text-[7vw] leading-none tracking-tighter font-elegant font-light${i % 2 !== 0 ? ' italic' : ''}`}
              >
                {word}
              </motion.h2>
            </div>
          ))}
        </div>
        {showLine && (
          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-[1px] bg-accent mt-8 w-full"
          />
        )}
      </div>
    </section>
  );
}
