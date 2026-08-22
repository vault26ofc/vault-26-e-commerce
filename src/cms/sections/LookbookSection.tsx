import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { CMSSection } from '../types';

export default function LookbookSection({ section, isPage = false }: { section?: CMSSection; isPage?: boolean }) {
  return (
    <section className="py-12 md:py-20 bg-white text-black font-sans w-full border-t border-black/10">
      {/* Edge-to-Edge Container with Editorial Padding */}
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12">
        
        {/* Section Header (SSENSE Editorial Style) */}
        <div className="mb-10 md:mb-14 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/10 pb-6">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs font-mono font-bold tracking-[0.2em] text-black/50 uppercase block mb-1"
            >
              EDITORIAL & LOOKBOOK
            </motion.span>
            <div className="overflow-hidden py-1">
              <motion.h2
                initial={{ opacity: 0, y: '100%' }}
                whileInView={{ opacity: 1, y: '0%' }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="text-3xl sm:text-4xl md:text-5xl font-primary font-bold uppercase tracking-tight text-black leading-none"
              >
                VAULT 26 JOURNAL
              </motion.h2>
            </div>
          </div>
          <Link
            to="/lookbook"
            className="text-xs font-bold tracking-[0.2em] uppercase text-black border-b-2 border-black pb-1 hover:text-black/60 hover:border-black/60 transition-colors inline-block w-fit"
          >
            EXPLORE ALL EDITORIALS →
          </Link>
        </div>

        {/* SSENSE 3-Column Editorial Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 lg:gap-12 items-start">
          
          {/* ================= COLUMN 1 (Left 6/12): 2 Stacked Horizontal Feature Stories ================= */}
          <div className="lg:col-span-6 flex flex-col gap-10 md:gap-12">
            
            {/* Story 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="group cursor-pointer"
            >
              <Link to="/lookbook" className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
                <div className="sm:col-span-6 aspect-[4/3] bg-[#F2F2F2] overflow-hidden rounded-none">
                  <img
                    src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=1200"
                    alt="Brutalismus 3000"
                    loading="lazy"
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <div className="sm:col-span-6 flex flex-col justify-start gap-2">
                  <span className="text-xl sm:text-2xl font-secondary text-black/70 capitalize">
                    Music
                  </span>
                  <h3 className="text-xl sm:text-2xl font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-tight">
                    BRUTALISMUS 3000 DREAMT IN AMERICAN
                  </h3>
                  <p className="text-xs sm:text-sm text-black/70 font-normal leading-relaxed mt-1">
                    The duo’s aggressive new album ‘Harmony’ turns anxiety, contradiction, and collective release into something refreshingly hopeful.
                  </p>
                </div>
              </Link>
            </motion.div>

            <div className="w-full border-t border-black/10" />

            {/* Story 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group cursor-pointer"
            >
              <Link to="/lookbook" className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
                <div className="sm:col-span-6 aspect-[4/3] bg-[#F2F2F2] overflow-hidden rounded-none">
                  <img
                    src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=95&w=1200"
                    alt="Pitti Uomo"
                    loading="lazy"
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <div className="sm:col-span-6 flex flex-col justify-start gap-2">
                  <span className="text-xl sm:text-2xl font-secondary text-black/70 capitalize">
                    Fashion
                  </span>
                  <h3 className="text-xl sm:text-2xl font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-tight">
                    THE FUTURE OF MEN ACCORDING TO PITTI UOMO
                  </h3>
                  <p className="text-xs sm:text-sm text-black/70 font-normal leading-relaxed mt-1">
                    A dispatch from Michael the III as he navigates the legendary menswear show in Italy.
                  </p>
                </div>
              </Link>
            </motion.div>

          </div>

          {/* ================= COLUMN 2 (Center 3/12): 1 Large Vertical Feature ================= */}
          <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-black/10 pt-10 lg:pt-0 lg:pl-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="group cursor-pointer flex flex-col"
            >
              <Link to="/lookbook" className="block w-full">
                <div className="w-full aspect-[3/4] bg-[#F2F2F2] overflow-hidden rounded-none mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=95&w=1200"
                    alt="John Early"
                    loading="lazy"
                    className="w-full h-full object-cover object-center grayscale contrast-110 transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-tight mb-2">
                  JOHN EARLY’S DUMB, BIG-HEARTED MASTERPIECE
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-secondary text-black/70 capitalize">Culture</span>
                  <span className="text-xs text-black/40">|</span>
                  <span className="text-xs text-black/50 font-mono uppercase">Jun 23</span>
                </div>
              </Link>
            </motion.div>
          </div>

          {/* ================= COLUMN 3 (Right 3/12): 4 Stacked Compact Mini Stories ================= */}
          <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-black/10 pt-10 lg:pt-0 lg:pl-8 flex flex-col divide-y divide-black/10">
            
            {/* Item 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="py-4 first:pt-0 last:pb-0 group cursor-pointer"
            >
              <Link to="/lookbook" className="flex items-center gap-4">
                <div className="w-20 h-24 sm:w-24 sm:h-28 bg-[#F2F2F2] flex-shrink-0 overflow-hidden rounded-none">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=95&w=600"
                    alt="Katseye"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-snug">
                    KATSEYE
                  </h4>
                  <span className="text-lg font-secondary text-black/60 capitalize">
                    Culture
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Item 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="py-4 group cursor-pointer"
            >
              <Link to="/lookbook" className="flex items-center gap-4">
                <div className="w-20 h-24 sm:w-24 sm:h-28 bg-[#F2F2F2] flex-shrink-0 overflow-hidden rounded-none">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=95&w=600"
                    alt="Hideo Kojima"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-snug">
                    HIDEO KOJIMA: THE CREATOR
                  </h4>
                  <span className="text-lg font-secondary text-black/60 capitalize">
                    Culture
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Item 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="py-4 group cursor-pointer"
            >
              <Link to="/lookbook" className="flex items-center gap-4">
                <div className="w-20 h-24 sm:w-24 sm:h-28 bg-[#F2F2F2] flex-shrink-0 overflow-hidden rounded-none">
                  <img
                    src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=95&w=600"
                    alt="Erika De Casier"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-snug">
                    CREATING SPACE WITH ERIKA DE CASIER
                  </h4>
                  <span className="text-lg font-secondary text-black/60 capitalize">
                    Music
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Item 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="py-4 last:pb-0 group cursor-pointer"
            >
              <Link to="/lookbook" className="flex items-center gap-4">
                <div className="w-20 h-24 sm:w-24 sm:h-28 bg-[#F2F2F2] flex-shrink-0 overflow-hidden rounded-none">
                  <img
                    src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=95&w=600"
                    alt="Japanese Breakfast"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-snug">
                    HOW JAPANESE BREAKFAST FOUND HERSELF IN SEOUL
                  </h4>
                  <span className="text-lg font-secondary text-black/60 capitalize">
                    Music
                  </span>
                </div>
              </Link>
            </motion.div>

          </div>

        </div>

        {/* ================= BOTTOM ROW: VISUAL ARTS / EDITORIAL STORIES ================= */}
        <div className="border-t border-black/10 pt-12 md:pt-16 mt-12 md:mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Title Column */}
            <div className="lg:col-span-3">
              <h3 className="text-3xl sm:text-4xl font-primary font-bold uppercase tracking-tight text-black mb-3">
                VISUAL ARTS
              </h3>
              <Link
                to="/lookbook"
                className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-black/60 hover:text-black transition-colors"
              >
                VIEW ALL STORIES →
              </Link>
            </div>

            {/* Right 4 Horizontal Grid Items */}
            <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              
              {/* Card 1 */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="group cursor-pointer"
              >
                <Link to="/lookbook" className="flex items-start gap-4">
                  <div className="w-20 h-24 bg-[#F2F2F2] flex-shrink-0 overflow-hidden rounded-none">
                    <img
                      src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=95&w=600"
                      alt="Leon Xu"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-snug">
                      LEON XU'S DISTORTIONS OF TIME
                    </h4>
                    <span className="text-base font-secondary text-black/60 capitalize">
                      Culture
                    </span>
                  </div>
                </Link>
              </motion.div>

              {/* Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="group cursor-pointer"
              >
                <Link to="/lookbook" className="flex items-start gap-4">
                  <div className="w-20 h-24 bg-[#F2F2F2] flex-shrink-0 overflow-hidden rounded-none">
                    <img
                      src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=95&w=600"
                      alt="Léa Dickely"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-snug">
                      LÉA DICKELY FINDS BEAUTY IN THE UNCANNY
                    </h4>
                    <span className="text-base font-secondary text-black/60 capitalize">
                      Art
                    </span>
                  </div>
                </Link>
              </motion.div>

              {/* Card 3 */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="group cursor-pointer"
              >
                <Link to="/lookbook" className="flex items-start gap-4">
                  <div className="w-20 h-24 bg-[#F2F2F2] flex-shrink-0 overflow-hidden rounded-none">
                    <img
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=95&w=600"
                      alt="Cowboy"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-snug">
                      A COWBOY RIDES INTO THE DARK
                    </h4>
                    <span className="text-base font-secondary text-black/60 capitalize">
                      Art
                    </span>
                  </div>
                </Link>
              </motion.div>

              {/* Card 4 */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="group cursor-pointer"
              >
                <Link to="/lookbook" className="flex items-start gap-4">
                  <div className="w-20 h-24 bg-[#F2F2F2] flex-shrink-0 overflow-hidden rounded-none">
                    <img
                      src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=95&w=600"
                      alt="Spiritual Practice"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs font-primary font-bold uppercase tracking-tight text-black group-hover:text-black/70 transition-colors leading-snug">
                      SPIRITUAL PRACTICE
                    </h4>
                    <span className="text-base font-secondary text-black/60 capitalize">
                      Art
                    </span>
                  </div>
                </Link>
              </motion.div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
