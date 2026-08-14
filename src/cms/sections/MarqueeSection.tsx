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

  const marqueeText = items.join('   •   ');

  return (
    <section className="bg-black text-white py-3.5 border-b border-white/10 w-full overflow-hidden font-ui relative z-20">
      <div className="flex w-full overflow-hidden select-none">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="whitespace-nowrap flex items-center gap-8 text-xs uppercase font-ui tracking-[0.2em] font-medium text-white/90"
        >
          <span>• {marqueeText}</span>
          <span>• {marqueeText}</span>
        </motion.div>
      </div>
    </section>
  );
}
