import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const ITEMS = [
  {
    id: 1,
    title: "The Sculpted Blazer",
    category: "Archive 01",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800",
    to: "/category/men",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    id: 2,
    title: "Raw Denim Kit",
    category: "Essentials",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800",
    to: "/shop",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: 3,
    title: "Silk Utility Shirt",
    category: "Limited",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=800",
    to: "/category/shirts",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    id: 4,
    title: "Minimalist Trousers",
    category: "Archive 02",
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=800",
    to: "/category/women",
    className: "md:col-span-2 md:row-span-1",
  },
];

export default function BentoGrid() {
  return (
    <section className="py-24 container-px bg-white">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <span className="eyebrow block mb-4">The New Standard</span>
          <h2 className="display-2">Latest from the <span className="italic">Archive.</span></h2>
        </div>
        <Link to="/category/shirts" className="text-[11px] tracking-[0.3em] uppercase font-ui font-bold border-b border-black pb-1 hover:text-accent hover:border-accent transition-colors inline-flex items-center gap-2">
          View All Drops <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:auto-rows-[300px]">
        {ITEMS.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className={`group relative overflow-hidden bg-muted ${item.className}`}
          >
            <img 
              src={item.image} 
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-0 p-8 flex flex-col justify-end text-white translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
              <span className="text-[9px] tracking-[0.4em] uppercase font-ui mb-2">{item.category}</span>
              <h3 className="text-2xl font-elegant tracking-tight mb-4">{item.title}</h3>
              <button className="text-[10px] tracking-[0.3em] uppercase font-ui font-bold border-b border-white/40 pb-1 self-start hover:border-white transition-colors">
                Explore Piece
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
