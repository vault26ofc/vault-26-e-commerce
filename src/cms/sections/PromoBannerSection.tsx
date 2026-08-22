import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { CMSSection, PromoBannerConfig } from '../types';

export default function PromoBannerSection({ section }: { section: CMSSection }) {
  const cfg = section.config as PromoBannerConfig;

  return (
    <div
      className="w-full py-5 px-6 flex items-center justify-center gap-6 text-center"
      style={{
        backgroundColor: cfg.bg_color || '#000000',
        color: cfg.text_color || '#ffffff',
      }}
    >
      <p className="text-[11px] tracking-[0.3em] uppercase font-ui font-bold">
        {cfg.message || 'LIMITED TIME OFFER — FREE SHIPPING ON ORDERS ABOVE ₹2000'}
      </p>
      {cfg.cta_href && cfg.cta_label && (
        <Link
          to={cfg.cta_href}
          className="inline-flex items-center gap-1 text-[10px] tracking-[0.3em] uppercase font-ui font-bold underline underline-offset-2 hover:no-underline transition-all"
          style={{ color: cfg.text_color || '#ffffff' }}
        >
          {cfg.cta_label} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
