import { motion } from 'framer-motion';
import type { CMSSection } from '../types';

export default function FlagshipStoresSection({ section }: { section?: CMSSection }) {
  return (
    <section className="w-full bg-white text-black py-16 md:py-24 relative overflow-hidden select-none border-t border-black/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* 3-Column Flagship Store Layout (Daily Paper Style - White Theme) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* ================= LEFT COLUMN: FLAGSHIP AMSTERDAM ================= */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3 flex flex-col justify-center text-left"
          >
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-black/50 uppercase block mb-1">
              FLAGSHIP
            </span>
            <h3 className="text-2xl sm:text-3xl font-primary font-bold uppercase tracking-wider text-black border-b-2 border-black pb-1 inline-block w-fit mb-4">
              AMSTERDAM
            </h3>
            
            <div className="space-y-1 text-xs sm:text-sm text-black/80 font-normal leading-relaxed mb-4">
              <p>Leidsestraat 27</p>
              <p>1017 NT Amsterdam</p>
            </div>

            <p className="text-xs sm:text-sm text-black/70 font-mono tracking-wide mb-6">
              +31 6 19 30 31 67
            </p>

            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="w-fit border border-black/60 hover:border-black hover:bg-black hover:text-white px-6 py-2.5 text-xs font-mono font-bold tracking-[0.2em] uppercase transition-all duration-300 rounded-none inline-block text-black"
            >
              SEE LOCATION
            </a>
          </motion.div>

          {/* ================= CENTER COLUMN: STORE FRONT PHOTOGRAPHY ================= */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-6 w-full"
          >
            <div className="group relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-none shadow-xl border border-black/10 bg-[#F2F2F2]">
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=95&w=1600"
                alt="Vault 26 Flagship Storefront"
                loading="lazy"
                className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
          </motion.div>

          {/* ================= RIGHT COLUMN: FLAGSHIP LONDON ================= */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3 flex flex-col justify-center text-left lg:pl-4"
          >
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-black/50 uppercase block mb-1">
              FLAGSHIP
            </span>
            <h3 className="text-2xl sm:text-3xl font-primary font-bold uppercase tracking-wider text-black mb-4 block">
              LONDON
            </h3>
            
            <div className="space-y-1 text-xs sm:text-sm text-black/80 font-normal leading-relaxed mb-4">
              <p>4-16 Great Pulteney</p>
              <p>London W1F 9ND</p>
            </div>

            <p className="text-xs sm:text-sm text-black/70 font-mono tracking-wide mb-6">
              +44 7472 304020
            </p>

            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="w-fit border border-black/60 hover:border-black hover:bg-black hover:text-white px-6 py-2.5 text-xs font-mono font-bold tracking-[0.2em] uppercase transition-all duration-300 rounded-none inline-block text-black"
            >
              SEE LOCATION
            </a>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
