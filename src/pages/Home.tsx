import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { useSEO } from '@/lib/useSEO';
import BentoGrid from '@/components/home/BentoGrid';
import Testimonials from '@/components/home/Testimonials';
import EditorialMarquee from '@/components/home/EditorialMarquee';

export default function Home() {
  useSEO({
    title: 'VAULT 26 — Premium Streetwear Archive',
    description: 'Where high fashion meets street authenticity. Not just worn. Remembered.',
  });

  return (
    <div className="bg-white">
      {/* Cinematic Editorial Hero Section */}
      <section className="relative h-screen w-full overflow-hidden bg-black">
        {/* Layer 1: Background Media with Cinematic Grade */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=1920"
            alt="Hero"
            className="w-full h-full object-cover object-center scale-105 opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
        </div>

        {/* Layer 2: Massive Brand Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none select-none">
          <h2 
            className="text-[60vw] leading-none text-white select-none font-display font-bold text-stroke-white"
          >
            26
          </h2>
        </div>

        {/* Layer 3: Main Editorial Content */}
        <div className="relative h-full flex items-center container-px">
          <div className="max-w-5xl">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="eyebrow text-white/50 mb-8 block">
                ESTABLISHED MMXXVI // ARCHIVE 01
              </span>
              
              <h1 className="text-5xl md:text-8xl lg:text-9xl leading-[0.9] text-white font-display mb-10 md:mb-12 tracking-tighter">
                BEYOND <br />
                <span className="italic ml-6 md:ml-16 font-elegant font-light">TRENDS.</span>
              </h1>

              {/* Sleek Minimalist Search Bar (Glassmorphic) */}
              <div className="relative w-full max-w-[500px] flex items-center h-12 md:h-14 bg-white/5 backdrop-blur-xl border border-white/10 group transition-all duration-500 hover:border-white/30">
                <div className="pl-4 md:pl-6 text-white/40 group-hover:text-accent transition-colors duration-300">
                  <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <input
                  type="text"
                  placeholder="FIND YOUR PIECE..."
                  className="w-full h-full bg-transparent border-none outline-none text-[10px] md:text-[11px] px-3 md:px-4 tracking-[0.15em] md:tracking-[0.2em] text-white placeholder:text-white/20 font-ui font-light"
                />
                <button className="h-full bg-white text-black px-6 md:px-8 text-[9px] font-bold tracking-[0.15em] md:tracking-[0.2em] hover:bg-accent hover:text-white transition-all duration-500 uppercase font-ui">
                  EXPLORE
                </button>
              </div>

              <div className="mt-12 flex gap-12 items-center">
                 <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" className="w-full h-full object-cover" />
                      </div>
                    ))}
                 </div>
                 <p className="text-[10px] tracking-[0.1em] text-white/40 uppercase font-ui font-light">
                    JOIN 2K+ COLLECTORS <br /> IN THE ARCHIVE
                 </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Layer 4: Vertical Scroll Hint */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30">
           <div className="w-[1px] h-12 bg-gradient-to-b from-transparent to-white"></div>
           <span className="text-[9px] tracking-[0.4em] uppercase text-white font-ui font-light">Scroll</span>
        </div>
      </section>

      {/* ATTITUDE / CONFIDENCE */}
      <section id="about" className="pt-28 pb-10 container-px bg-white overflow-hidden">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-row items-baseline justify-center gap-6 md:gap-12 flex-wrap">
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: '100%', opacity: 0 }}
                whileInView={{ y: '0%', opacity: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-[10vw] md:text-[7vw] leading-none tracking-tighter font-elegant font-light"
              >
                ATTITUDE
              </motion.h2>
            </div>
            <div className="overflow-hidden">
              <motion.h2
                initial={{ y: '100%', opacity: 0 }}
                whileInView={{ y: '0%', opacity: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="text-[10vw] md:text-[7vw] leading-none tracking-tighter font-elegant font-light italic"
              >
                CONFIDENCE
              </motion.h2>
            </div>
          </div>
          <motion.div
            initial={{ scaleX: 0, originX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-[1px] bg-accent mt-8 w-full"
          />
        </div>
      </section>

      {/* Editorial Split */}
      <section className="pb-20 pt-4 container-px bg-white">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden group aspect-[4/5]"
            >
              <img
                src="https://images.unsplash.com/photo-1637536701306-3214e9cec64a?auto=format&fit=crop&q=80&w=1080"
                alt="Editorial"
                className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
              />
            </motion.div>

            <div className="space-y-6">
              <div className="overflow-hidden">
                <motion.span
                  initial={{ y: '100%' }}
                  whileInView={{ y: '0%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="block text-accent text-6xl md:text-8xl leading-none font-elegant font-light"
                >
                  26
                </motion.span>
              </div>

              {['Redefining', 'Street Culture'].map((word, i) => (
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
                Where high fashion meets street authenticity. Vault 26 is more than clothing — it's a statement of individuality and fearless self-expression.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.65 }}
                className="border border-black px-10 py-3 text-[11px] tracking-[0.25em] uppercase hover:bg-black hover:text-white transition-all duration-400 font-ui font-light"
              >
                Discover More
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Bento Grid */}
      <BentoGrid />

      {/* Category Section */}
      <section className="bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Men */}
            <motion.div
              id="men"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="group cursor-pointer flex flex-col"
            >
              <div className="relative overflow-hidden w-full h-[450px] md:h-[600px] lg:h-[850px] bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=1000"
                  alt="Menswear"
                  className="w-full h-full object-cover grayscale transition-all duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-hover:grayscale-0"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <h3 className="text-[18vw] md:text-[10vw] font-light text-white/20 uppercase tracking-[0.2em] transition-all duration-700 group-hover:text-white/40 group-hover:scale-110 font-elegant">
                    MEN
                  </h3>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-0.5 px-6 pb-12">
                <h3 className="text-black text-5xl md:text-7xl lg:text-8xl tracking-tight mb-4 font-elegant font-light">
                  Menswear
                </h3>
                <Link to="/category/men" className="text-black/60 text-xs tracking-[0.4em] uppercase font-light translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 font-ui">
                  Shop Collection
                </Link>
              </div>
            </motion.div>

            {/* Women */}
            <motion.div
              id="women"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group cursor-pointer flex flex-col"
            >
              <div className="relative overflow-hidden w-full h-[450px] md:h-[600px] lg:h-[850px] bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1000"
                  alt="Womenswear"
                  className="w-full h-full object-cover grayscale transition-all duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-hover:grayscale-0"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <h3 className="text-[18vw] md:text-[10vw] font-light text-white/20 uppercase tracking-[0.2em] transition-all duration-700 group-hover:text-white/40 group-hover:scale-110 font-elegant">
                    WOMEN
                  </h3>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-0.5 px-6 pb-12">
                <h3 className="text-black text-5xl md:text-7xl lg:text-8xl tracking-tight mb-4 font-elegant font-light">
                  Womenswear
                </h3>
                <Link to="/category/women" className="text-black/60 text-xs tracking-[0.4em] uppercase font-light translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 font-ui">
                  Shop Collection
                </Link>
              </div>
            </motion.div>
        </div>
      </section>

      {/* NOT FOR EVERYONE Marquee */}
      <EditorialMarquee />

      {/* Testimonials */}
      <Testimonials />

      {/* Lookbook */}
      <section id="lookbook" className="py-24 container-px bg-white">
        <div className="max-w-[1600px] mx-auto">
          <div className="overflow-hidden mb-16">
            <motion.h2
              initial={{ y: '100%' }}
              whileInView={{ y: '0%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="text-7xl lg:text-9xl tracking-tight leading-none font-elegant font-light italic"
            >
              Lookbook
            </motion.h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000',
              'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000',
              'https://images.unsplash.com/photo-1537832816519-689ad163238b?q=80&w=1000',
              'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=1000',
            ].map((img, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative overflow-hidden group cursor-pointer aspect-[3/4]"
              >
                <img
                  src={img}
                  alt={`Lookbook ${index + 1}`}
                  className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Join the Vault Section */}
      <section className="py-24 md:py-48 container-px bg-white relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col justify-center opacity-[0.05] pointer-events-none select-none">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="whitespace-nowrap text-[20vw] font-light uppercase tracking-tighter flex font-elegant"
          >
            <span>VAULT 26 &nbsp; VAULT 26 &nbsp; VAULT 26 &nbsp; VAULT 26 &nbsp;</span>
            <span>VAULT 26 &nbsp; VAULT 26 &nbsp; VAULT 26 &nbsp; VAULT 26 &nbsp;</span>
          </motion.div>
        </div>

        <div className="max-w-[1600px] mx-auto text-center relative z-10">
          <div className="overflow-hidden mb-4">
            <motion.span
              initial={{ y: '100%' }}
              whileInView={{ y: '0%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="block text-[12vw] md:text-[6vw] lg:text-[5vw] leading-tight text-black uppercase tracking-[0.2em] font-elegant font-normal"
            >
              JOIN THE
            </motion.span>
          </div>
          <div className="overflow-hidden mb-16">
            <motion.span
              initial={{ y: '100%' }}
              whileInView={{ y: '0%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="block text-[12vw] md:text-[10vw] lg:text-[8vw] leading-none italic text-accent -mt-4 font-elegant font-light"
            >
              Vault
            </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-2xl mx-auto"
          >
            <p className="text-black/60 mb-12 text-sm md:text-base tracking-[0.2em] uppercase font-light leading-relaxed font-ui">
              BE THE FIRST TO RECEIVE EXCLUSIVE ACCESS TO LIMITED DROPS, EDITORIAL CONTENT, AND SECRET ARCHIVE RELEASES.
            </p>

            <div className="flex flex-col md:flex-row items-center gap-4 mb-12">
              <input
                type="email"
                placeholder="ENTER YOUR EMAIL"
                className="flex-1 w-full bg-transparent border-b border-black/20 py-4 text-[12px] tracking-[0.3em] font-light outline-none focus:border-accent transition-colors placeholder:text-black/60 font-ui"
              />
              <button className="w-full md:w-auto border border-black px-12 py-4 text-[11px] tracking-[0.3em] uppercase transition-all duration-500 bg-transparent text-black whitespace-nowrap font-ui hover:bg-black hover:text-white">
                Join Now
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

