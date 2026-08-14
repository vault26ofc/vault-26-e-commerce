import type { CMSSection, HeroConfig } from '../types';

export default function HeroSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as HeroConfig;

  return (
    <section className="relative w-full h-[200vh] bg-black text-white font-sans select-none">
      {/* LAYER 2: Hero Section Image — Double Viewport Height (200vh) */}
      <div className="absolute inset-0 w-full h-[200vh] overflow-hidden z-0">
        <img
          src={
            cfg.background_image ||
            'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=2400'
          }
          alt="VAULT26 Editorial Campaign"
          className="w-full h-[200vh] object-cover object-top brightness-90"
        />
        {/* Subtle cinematic gradient vignette for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/70 pointer-events-none" />
      </div>

      {/* LAYER 1: VAULT26 Typography — Fixed to Screen Center, Unpins at End of 200vh Hero Image */}
      <div className="sticky top-0 w-full h-screen flex items-center justify-center p-4 text-center pointer-events-none z-10">
        <h1 className="text-6xl sm:text-8xl md:text-[11vw] lg:text-[13vw] font-serif font-bold tracking-[0.18em] uppercase text-white drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] leading-none">
          {cfg.heading || 'VAULT26'}
        </h1>
      </div>
    </section>
  );
}
