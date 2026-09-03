import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection } from '../types';

type Pick = {
  id: string;
  name: string;
  handle: string | null;
  video_source: 'upload' | 'link';
  video_url: string | null;
  link_url: string | null;
  thumbnail_url: string | null;
  thumbnail_type: 'image' | 'video';
  quote: string | null;
};

export default function InfluencerPicksSection({ section }: { section?: CMSSection }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const heading = section?.config?.heading || 'STYLED BY';
  const subtitle = section?.config?.subtitle || 'INFLUENCER PICKS';

  useEffect(() => {
    supabase
      .from('influencer_picks' as any)
      .select('id, name, handle, video_source, video_url, link_url, thumbnail_url, thumbnail_type, quote')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setPicks((data as unknown as Pick[]) || []));
  }, []);

  if (!picks.length) return null;

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {picks.map((pick, i) => {
            const content = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 4) * 0.08 }}
                className="group cursor-pointer"
              >
                <div className="aspect-[3/4] bg-[#F2F2F2] overflow-hidden mb-3 relative">
                  {pick.video_source === 'upload' && pick.video_url ? (
                    <video
                      src={pick.video_url}
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                      poster={pick.thumbnail_url || undefined}
                      className="w-full h-full object-cover"
                    />
                  ) : pick.thumbnail_type === 'video' && pick.thumbnail_url ? (
                    <video src={pick.thumbnail_url} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                  ) : (
                    <img src={pick.thumbnail_url || ''} alt={pick.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  )}
                </div>
                <h3 className="text-sm font-primary font-bold uppercase tracking-tight text-black leading-snug">
                  {pick.name}
                </h3>
                {pick.handle && <p className="text-xs text-black/50 font-mono">{pick.handle}</p>}
                {pick.quote && <p className="text-xs text-black/70 mt-1 leading-relaxed">{pick.quote}</p>}
              </motion.div>
            );
            return pick.video_source === 'link' && pick.link_url ? (
              <a key={pick.id} href={pick.link_url} target="_blank" rel="noopener noreferrer">
                {content}
              </a>
            ) : (
              <div key={pick.id}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
