import { motion } from 'framer-motion';
import type { CMSSection, MarqueeConfig } from '../types';

export default function MarqueeSection({ section }: { section: CMSSection }) {
  const cfg = section.config as MarqueeConfig;
  const heading = cfg.heading || 'NOT FOR';
  const headingItalic = cfg.heading_italic || 'EVERYONE';
  const subtext = cfg.subtext || 'CURATED FOR THE ARCHIVE. DEFINED BY THE BOLD.';
  const watermark = cfg.watermark || '26';

  return (
    <section className="py-20 md:py-40 container-px bg-white relative overflow-hidden border-y border-black/5">
      <div className="absolute inset-0 flex flex-col justify-around py-20 opacity-[0.02] pointer-events-none select-none">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="whitespace-nowrap text-[20vw] font-bold uppercase tracking-tighter flex font-elegant"
        >
          <span>VAULT 26 &nbsp; ARCHIVE &nbsp; VAULT 26 &nbsp; ARCHIVE &nbsp;</span>
          <span>VAULT 26 &nbsp; ARCHIVE &nbsp; VAULT 26 &nbsp; ARCHIVE &nbsp;</span>
        </motion.div>
        <motion.div
          animate={{ x: ['-50%', '0%'] }}
          transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
          className="whitespace-nowrap text-[20vw] font-bold italic uppercase tracking-tighter flex opacity-20 font-elegant text-accent"
        >
          <span>NOT FOR EVERYONE &nbsp; NOT FOR EVERYONE &nbsp;</span>
          <span>NOT FOR EVERYONE &nbsp; NOT FOR EVERYONE &nbsp;</span>
        </motion.div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none select-none">
        <h4 className="text-[60vw] leading-none select-none font-elegant font-bold text-stroke-accent">
          {watermark}
        </h4>
      </div>

      <div className="absolute top-12 left-12 text-[10px] tracking-[0.4em] uppercase text-black/30 font-medium vertical-text hidden lg:block font-ui">
        REF: VAULT_ARCHIVE_2026 // 51.5074° N, 0.1278° W
      </div>
      <div className="absolute bottom-12 right-12 text-[10px] tracking-[0.4em] uppercase text-black/30 font-medium text-right hidden lg:block font-ui">
        LIMITED RELEASE // NOT FOR REPRODUCTION
      </div>

      <div className="max-w-[1600px] mx-auto text-center relative z-10">
        <div className="overflow-hidden mb-6">
          <motion.h2
            initial={{ y: '100%', opacity: 0 }}
            whileInView={{ y: '0%', opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-[12vw] md:text-[8vw] lg:text-[6vw] leading-none text-black/80 tracking-tighter font-elegant font-light"
          >
            {heading} <span className="italic text-accent">{headingItalic}</span>
          </motion.h2>
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-32 h-[1px] bg-accent/40 mx-auto mb-8"
        />

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="text-base max-w-2xl mx-auto text-black/40 tracking-[0.25em] uppercase font-medium font-ui"
        >
          {subtext}
        </motion.p>
      </div>
    </section>
  );
}
