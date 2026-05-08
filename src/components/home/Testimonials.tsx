import { motion } from 'framer-motion';

const TESTIMONIALS = [
  {
    quote: "Vault 26 isn't just a brand; it's a curated experience. The quality of the Archive releases is unparalleled.",
    author: "Julian R.",
    role: "Fashion Consultant"
  },
  {
    quote: "The intersection of high-fashion tailoring and street authenticity is hard to find. Vault 26 executes it flawlessly.",
    author: "Elena M.",
    role: "Creative Director"
  },
  {
    quote: "Every drop tells a story. I don't just wear the pieces; I carry the confidence of the Vault.",
    author: "Marcus T.",
    role: "Stylist"
  },
  {
    quote: "A rare blend of brutalist aesthetic and premium comfort. Truly understands the modern silhouette.",
    author: "Sophia L.",
    role: "Visual Artist"
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 container-px bg-white overflow-hidden border-b border-black/10">
      <div className="flex items-end justify-between mb-16">
        <div className="overflow-hidden">
          <motion.h2 
            initial={{ y: '100%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl tracking-tight font-elegant"
          >
            Voices of the <span className="italic text-accent">Archive</span>
          </motion.h2>
        </div>
        <div className="hidden md:block text-[9px] tracking-[0.4em] uppercase text-black/50 font-ui font-medium">
          Drag to Explore →
        </div>
      </div>

      <motion.div 
        drag="x"
        dragConstraints={{ right: 0, left: -1000 }}
        className="flex gap-16 cursor-grab active:cursor-grabbing"
      >
        {TESTIMONIALS.map((item, index) => (
          <motion.div
            key={index}
            className="min-w-[300px] md:min-w-[500px] flex flex-col"
          >
            <span className="text-[9px] tracking-[0.4em] uppercase text-accent mb-8 font-ui font-bold">
              0{index + 1} // Archive Review
            </span>
            <p 
              className="text-2xl md:text-3xl leading-relaxed text-black mb-12 select-none font-elegant font-light"
            >
              "{item.quote}"
            </p>
            <div className="mt-auto">
              <h4 className="text-[12px] tracking-[0.2em] uppercase font-bold text-black font-ui">
                {item.author}
              </h4>
              <span className="text-[10px] tracking-[0.1em] text-black/60 uppercase font-ui">
                {item.role}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Progress Line */}
      <div className="w-full h-[1px] bg-black/15 mt-20 relative">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-accent w-1/4"
          initial={{ x: 0 }}
          whileInView={{ x: '300%' }}
          transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse', ease: "linear" }}
        />
      </div>
    </section>
  );
}
