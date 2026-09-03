import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection } from '../types';

type Photo = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  handle: string | null;
  bento_size: 'sm' | 'md' | 'lg' | 'wide' | 'tall';
};

const SPAN: Record<Photo['bento_size'], string> = {
  sm: 'col-span-1 row-span-1',
  md: 'col-span-1 row-span-2',
  lg: 'col-span-2 row-span-2',
  wide: 'col-span-2 row-span-1',
  tall: 'col-span-1 row-span-3',
};

export default function CommunitySection({ section }: { section?: CMSSection }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const heading = section?.config?.heading || 'WORN BY VAULT 26';
  const subtitle = section?.config?.subtitle || 'FROM THE COMMUNITY';

  useEffect(() => {
    supabase
      .from('community_photos' as any)
      .select('id, image_url, media_type, handle, bento_size')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setPhotos((data as unknown as Photo[]) || []));
  }, []);

  if (!photos.length) return null;

  return (
    <section className="py-12 md:py-20 bg-white text-black w-full border-t border-black/10">
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-10 md:mb-14 border-b border-black/10 pb-6">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-black/50 uppercase block mb-1">
            {subtitle}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-primary font-bold uppercase tracking-tight text-black leading-none">
            {heading}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[140px] md:auto-rows-[180px] gap-3 md:gap-4">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 6) * 0.05 }}
              className={`relative overflow-hidden bg-[#F2F2F2] group ${SPAN[photo.bento_size]}`}
            >
              {photo.media_type === 'video' ? (
                <video src={photo.image_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={photo.image_url} alt={photo.handle || ''} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              )}
              {photo.handle && (
                <span className="absolute bottom-2 left-2 text-xs font-mono uppercase tracking-widest text-white bg-black/50 px-2 py-1">
                  {photo.handle}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
