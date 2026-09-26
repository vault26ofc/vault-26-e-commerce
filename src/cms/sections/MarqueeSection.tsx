import { motion } from 'framer-motion';
import type { CMSSection, MarqueeConfig } from '../types';

export default function MarqueeSection({ section }: { section: CMSSection }) {
  const cfg = section.config as MarqueeConfig;
  const items = [
    'FREE SHIPPING ON ORDERS OVER ₹2,500',
    'VAULT 26 ARCHIVE',
    'QUIET LUXURY ESSENTIALS',
    'CRAFTED IN INDIA',
    'LIMITED EDITION RELEASES',
    'BEYOND TRENDS'
  ];

  return (
    <section className="relative bg-[#BB0006] text-white w-full overflow-hidden select-none border-y border-[#AA0001]">
      <div className="flex w-full overflow-hidden h-10 md:h-11 items-center">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
          className="whitespace-nowrap flex items-center gap-8 font-sans uppercase text-[12px] md:text-[13px] tracking-[0.06em]"
        >
          {[0, 1].map((k) => (
            <span key={k} className="flex items-center gap-8">
              {(cfg?.heading ? [cfg.heading, ...items.slice(1)] : items).map((t, i) => (
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
