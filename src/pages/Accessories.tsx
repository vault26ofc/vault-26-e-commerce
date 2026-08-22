import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useSEO } from '@/lib/useSEO';

const ACCESSORIES = [
  {
    id: 'sunglasses',
    title: 'Visuals',
    category: 'Sunglasses',
    image: '/accessories_hero_1778236772681.png',
    description: 'Archive pieces designed for those who see beyond the ordinary.',
    price: 'From ₹12,500'
  },
  {
    id: 'chains',
    title: 'Links',
    category: 'Jewelry',
    image: '/jewelry_editorial_1778237108834.png',
    description: 'Forged in silence. Worn with intent. Premium 925 sterling silver.',
    price: 'From ₹8,900'
  },
  {
    id: 'caps',
    title: 'Crowns',
    category: 'Headwear',
    image: '/sunglasses_editorial_1778236803975.png',
    description: 'The final detail. Sculpted silhouettes for the urban collector.',
    price: 'From ₹4,500'
  }
];

export default function AccessoriesPage() {
  useSEO({
    title: 'Accessories — VAULT 26',
    description: 'The final details. Explore our archive of luxury sunglasses, jewelry, and headwear.',
  });

  return (
    <div className="bg-white text-black selection:bg-accent selection:text-white">
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden border-b border-black/10">
        <div className="absolute inset-0 z-0">
          <img
            src="/accessories_hero_1778236772681.png"
            alt="Hero"
            className="w-full h-full object-cover opacity-10 grayscale brightness-125 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white" />
        </div>

        <div className="container-px relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="eyebrow text-accent mb-8 block font-medium">Archive Collection // 01</span>
            <h1 className="text-[12vw] md:text-[8vw] font-display uppercase leading-[0.8] tracking-tighter text-black">
              THE <br /> <span className="italic font-elegant font-light text-accent">OBJECTS.</span>
            </h1>
            <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-12 border-t border-black/10 pt-12">
              <div className="max-w-[200px] text-left">
                <p className="text-[10px] tracking-[0.2em] uppercase font-ui font-bold mb-2">Philosophy</p>
                <p className="text-[11px] font-ui font-light leading-relaxed text-black/50">Designed to bridge the gap between utility and art.</p>
              </div>
              <div className="max-w-[200px] text-left">
                <p className="text-[10px] tracking-[0.2em] uppercase font-ui font-bold mb-2">Hardware</p>
                <p className="text-[11px] font-ui font-light leading-relaxed text-black/50">Forged from medical grade steel and 925 sterling silver.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decorative Lines */}
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-black/[0.03] hidden lg:block" />
        <div className="absolute top-0 right-1/4 w-[1px] h-full bg-black/[0.03] hidden lg:block" />
      </section>

      {/* Narrative Section */}
      <section className="py-40 container-px bg-white relative">
        <div className="grid lg:grid-cols-2 gap-32 items-center">
          <div className="space-y-16">
            <h2 className="text-7xl md:text-9xl font-elegant font-light leading-none tracking-tighter">
              Curated <br /> <span className="italic text-accent">Artifacts.</span>
            </h2>
            <p className="text-xl md:text-2xl font-ui font-light leading-relaxed text-black/70 max-w-lg">
              In the archive, we don't just see accessories. We see the final punctuation of a silhouette. Each piece is an artifact of street culture.
            </p>
            <div className="flex gap-12 pt-8 overflow-hidden">
              {['Sunglass', 'Chain', 'Headwear'].map((cat, i) => (
                <motion.div
                  key={cat}
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <span className="w-8 h-[1px] bg-black/20" />
                  <span className="eyebrow text-[9px]">{cat}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="relative group">
            <div className="aspect-[4/5] overflow-hidden bg-secondary">
              <motion.img
                initial={{ scale: 1.1 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 1.5 }}
                src="/jewelry_editorial_1778237108834.png"
                alt="Editorial"
                className="w-full h-full object-cover grayscale brightness-110 contrast-125"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-accent/5 backdrop-blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Product List - Minimalist Row Style */}
      <section className="py-20 border-t border-black/10 bg-[#fafafa]">
        <div className="container-px">
          {ACCESSORIES.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group border-b border-black/10 py-24 flex flex-col md:flex-row items-center gap-12 md:gap-24 last:border-0"
            >
              <div className="w-full md:w-1/3 aspect-square overflow-hidden bg-white border border-black/10">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:scale-110 group-hover:grayscale-0"
                />
              </div>

              <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-accent font-display text-4xl italic">0{index + 1}</span>
                  <span className="eyebrow text-[9px] text-black/50 tracking-[0.4em]">{item.category}</span>
                </div>
                <h3 className="text-5xl md:text-7xl font-elegant font-light tracking-tighter">{item.title}</h3>
                <p className="text-sm font-ui font-light leading-relaxed text-black/50 max-w-md">{item.description}</p>
                <div className="flex items-center gap-8 pt-6">
                  <span className="text-lg font-ui font-bold tracking-tighter">{item.price}</span>
                  <Link
                    to={`/category/${item.id}`}
                    className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] bg-black text-white px-8 py-4 hover:bg-accent transition-all duration-500"
                  >
                    Collect Piece <ShoppingBag className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Cinematic Marquee CTA */}
      <section className="py-40 bg-white overflow-hidden text-center">
        <h3 className="text-6xl md:text-8xl font-elegant font-light mb-16 tracking-tighter">
          Complete The <span className="italic text-accent">Uniform.</span>
        </h3>
        <Link
          to="/search"
          className="inline-block border border-black px-16 py-6 text-[10px] font-bold tracking-[0.5em] uppercase hover:bg-black hover:text-white transition-all duration-700"
        >
          Explore All Artifacts
        </Link>
        <div className="mt-32 opacity-[0.03] select-none pointer-events-none">
          <h4 className="text-[15vw] font-display font-bold uppercase leading-none">VAULT 26 HARDWARE</h4>
        </div>
      </section>
    </div>
  );
}
