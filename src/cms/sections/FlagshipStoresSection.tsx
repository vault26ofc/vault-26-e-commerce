import { motion } from 'framer-motion';
import type { CMSSection } from '../types';
import { isVideoUrl } from '@/lib/media';

type Store = { label?: string; city?: string; address?: string; phone?: string; map_url?: string; button_label?: string };

const DEFAULT_STORES: Store[] = [
  { label: 'FLAGSHIP', city: 'AMSTERDAM', address: 'Leidsestraat 27\n1017 NT Amsterdam', phone: '+31 6 19 30 31 67', map_url: 'https://maps.google.com' },
  { label: 'FLAGSHIP', city: 'LONDON', address: '4-16 Great Pulteney\nLondon W1F 9ND', phone: '+44 7472 304020', map_url: 'https://maps.google.com' },
];
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=95&w=1600';

function StoreColumn({ store, align, delay }: { store: Store; align: 'left' | 'right'; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: align === 'left' ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className={`lg:col-span-3 flex flex-col justify-center text-left ${align === 'right' ? 'lg:pl-4' : ''}`}
    >
      <span className="text-xs font-mono font-bold tracking-[0.25em] text-black/50 uppercase block mb-1">{store.label || 'FLAGSHIP'}</span>
      <h3 className="text-2xl sm:text-3xl font-primary font-bold uppercase tracking-wider text-black border-b-2 border-black pb-1 inline-block w-fit mb-4">
        {store.city}
      </h3>
      <div className="space-y-1 text-xs sm:text-sm text-black/80 font-[800] leading-relaxed mb-4">
        {(store.address || '').split('\n').map((line, i) => <p key={i}>{line}</p>)}
      </div>
      {store.phone && <p className="text-xs sm:text-sm text-black/70 font-mono tracking-wide mb-6">{store.phone}</p>}
      {store.map_url && (
        <a
          href={store.map_url}
          target="_blank"
          rel="noreferrer"
          className="w-fit border border-black/60 hover:border-black hover:bg-black hover:text-white px-6 py-2.5 text-xs font-mono font-bold tracking-[0.2em] uppercase transition-all duration-300"
        >
          {store.button_label || 'SEE LOCATION'}
        </a>
      )}
    </motion.div>
  );
}

export default function FlagshipStoresSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as { stores?: Store[]; image?: string };
  const stores = cfg.stores?.some((s) => s.city) ? cfg.stores.filter((s) => s.city) : DEFAULT_STORES;
  const image = cfg.image || DEFAULT_IMAGE;
  const [left, right] = stores;
  return (
    <section className="w-full bg-white text-black py-16 md:py-24 relative overflow-hidden select-none border-t border-black/10">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {left && <StoreColumn store={left} align="left" delay={0} />}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-6 w-full"
          >
            <div className="group relative w-full aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-none shadow-xl border border-black/10 bg-[#F2F2F2]">
              {isVideoUrl(image)
                ? <video src={image} autoPlay muted loop playsInline className="w-full h-full object-cover object-center" />
                : <img src={image} alt="Flagship storefront" loading="lazy" className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105" />}
            </div>
          </motion.div>
          {right && <StoreColumn store={right} align="right" delay={0.2} />}
        </div>
      </div>
    </section>
  );
}
