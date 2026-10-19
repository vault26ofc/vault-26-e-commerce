import { motion } from 'framer-motion';
import type { CMSSection, MarqueeConfig } from '../types';

export default function MarqueeSection({ section }: { section: CMSSection }) {
  const cfg = section.config as MarqueeConfig & { items?: { text?: string }[]; speed?: number };
  // Only the admin's messages (the legacy single `heading` still counts).
  const typed = (cfg?.items || []).map((x) => x.text?.trim()).filter(Boolean) as string[];
  const items = typed.length ? typed : cfg?.heading ? [cfg.heading] : [];
  if (!items.length) return null;

  return (
    <section className="relative bg-[#BB0006] text-white w-full overflow-hidden select-none border-y border-[#AA0001]">
      <div className="flex w-full overflow-hidden h-10 md:h-11 items-center">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: Number(cfg?.speed) || 32, repeat: Infinity, ease: 'linear' }}
          className="whitespace-nowrap flex items-center gap-8 font-sans uppercase text-[12px] md:text-[13px] tracking-[0.06em]"
        >
          {[0, 1].map((k) => (
            <span key={k} className="flex items-center gap-8">
              {items.map((t, i) => (
                <span key={`${k}-${i}`} className="flex items-center gap-8">
                  {t}
                  <span className="font-display font-[800] text-[16px] leading-none">✱</span>
                </span>
              ))}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
