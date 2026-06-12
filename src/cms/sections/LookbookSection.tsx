import { motion } from 'framer-motion';
import type { CMSSection, LookbookConfig } from '../types';

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=1000',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1000',
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1000',
];

export default function LookbookSection({ section }: { section: CMSSection }) {
  const cfg = section.config as LookbookConfig;
  const images: string[] = Array.isArray(cfg.images) && cfg.images.length > 0
    ? cfg.images
    : DEFAULT_IMAGES;
  const heading = cfg.heading || 'Lookbook';

  return (
    <section id="lookbook" className="py-14 md:py-24 container-px bg-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="overflow-hidden mb-16">
          <motion.h2
            initial={{ y: '100%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="text-7xl lg:text-9xl tracking-tight leading-none font-elegant font-light italic"
          >
            {heading}
          </motion.h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img, index) => (
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
  );
}
