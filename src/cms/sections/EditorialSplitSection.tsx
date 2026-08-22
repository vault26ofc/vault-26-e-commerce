import { Link } from 'react-router-dom';
import type { CMSSection, EditorialSplitConfig } from '../types';

export default function EditorialSplitSection({ section }: { section: CMSSection }) {
  const cfg = section.config as EditorialSplitConfig;

  return (
    <section className="relative w-full h-[85vh] md:h-screen lg:h-screen overflow-hidden bg-black text-white font-ui">
      {/* Full Width Architectural Lifestyle Backdrop Matching Chienne Reference */}
      <img
        src={cfg.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=1920'}
        alt="VAULT 26 Editorial Narrative"
        className="w-full h-full object-cover brightness-75 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Bottom Right Floating Brand Narrative Box Matching Chienne Reference */}
      <div className="absolute bottom-12 right-6 md:bottom-20 md:right-20 max-w-xl p-6 md:p-8 z-10 text-right md:text-left flex flex-col items-end md:items-start">
        <h2 className="text-3xl md:text-5xl font-serif-condensed font-medium text-white tracking-tight mb-4 drop-shadow-md">
          {cfg.heading_lines ? cfg.heading_lines.join(' ') : "VAULT 26 — MORE THAN CLOTHING"}
        </h2>
        <p className="text-xs md:text-sm font-ui font-light text-white/90 leading-relaxed mb-6 drop-shadow">
          {cfg.body || "A philosophy born from confidence, understated elegance, and individual strength. We believe clothing is a language — form, texture, and detail designed to empower."}
        </p>
        <Link
          to={cfg.cta_href || "/about"}
          className="inline-block border border-white text-white hover:bg-white hover:text-black px-7 py-3 text-xs font-ui tracking-wide transition-all duration-300 shadow-lg"
        >
          {cfg.cta_label || "About Brand"}
        </Link>
      </div>
    </section>
  );
}
