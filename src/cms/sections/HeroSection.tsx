import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import type { CMSSection, HeroConfig } from '../types';

export default function HeroSection({ section }: { section: CMSSection }) {
  const cfg = section.config as HeroConfig;
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    else navigate(cfg.cta_href || '/shop');
  };

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <img
          src={cfg.background_image || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=90&w=1920'}
          alt="Hero"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover object-center scale-105 opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none select-none">
        <h2 className="text-[60vw] leading-none text-white select-none font-display font-bold text-stroke-white">
          26
        </h2>
      </div>

      <div className="relative h-full flex items-center container-px">
        <div className="max-w-5xl">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="eyebrow text-white/50 mb-8 block">
              {cfg.eyebrow || 'ESTABLISHED MMXXVI // ARCHIVE 01'}
            </span>

            <h1 className="text-5xl md:text-8xl lg:text-9xl leading-[0.9] text-white font-display mb-10 md:mb-12 tracking-tighter">
              {cfg.heading || 'BEYOND'} <br />
              <span className="italic ml-6 md:ml-16 font-elegant font-light">
                {cfg.heading_italic || 'TRENDS.'}
              </span>
            </h1>

            <form
              onSubmit={submit}
              className="relative w-full max-w-[500px] flex items-center h-12 md:h-14 bg-white/5 backdrop-blur-xl border border-white/10 group transition-all duration-500 hover:border-white/30"
            >
              <div className="pl-4 md:pl-6 text-white/40 group-hover:text-accent transition-colors duration-300">
                <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={cfg.search_placeholder || 'FIND YOUR PIECE...'}
                className="w-full h-full bg-transparent border-none outline-none text-[10px] md:text-[11px] px-3 md:px-4 tracking-[0.15em] md:tracking-[0.2em] text-white placeholder:text-white/20 font-ui font-light"
              />
              <button
                type="submit"
                className="h-full bg-white text-black px-6 md:px-8 text-[9px] font-bold tracking-[0.15em] md:tracking-[0.2em] hover:bg-accent hover:text-white transition-all duration-500 uppercase font-ui"
              >
                {cfg.search_cta || 'EXPLORE'}
              </button>
            </form>

            <div className="mt-12 flex gap-12 items-center">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] tracking-[0.1em] text-white/40 uppercase font-ui font-light">
                JOIN {cfg.social_proof_count || '2K+'} COLLECTORS <br />
                {cfg.social_proof_text || 'IN THE ARCHIVE'}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30">
        <div className="w-[1px] h-12 bg-gradient-to-b from-transparent to-white" />
        <span className="text-[9px] tracking-[0.4em] uppercase text-white font-ui font-light">Scroll</span>
      </div>
    </section>
  );
}
