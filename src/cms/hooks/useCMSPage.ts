import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  CMSSection, Testimonial, FAQItem, AnnouncementBar,
  BrandSettings, ThemeSettings, SEOSettings,
} from '../types';

/** Default homepage order, used by Admin → CMS "Reset home layout" (sections start empty; content is only what the admin sets). */
const HOME_ORDER: [CMSSection['section_type'], string][] = [
  ['hero', 'Hero'], ['marquee', 'Marquee'], ['category_bar', 'Category Bar'], ['best_sellers', 'Best Sellers'],
  ['category_cards', 'Category Cards'], ['product_marquee', 'Product Belt'], ['polka_bento', 'Season Board'],
  ['campaign_carousel', 'Campaign Carousel'], ['split_scroll', 'Split Scroll'], ['category_grid', 'Category Grid'],
  ['photo_shuffle', 'Photo Shuffle'], ['colour_story', 'Colour Stories'], ['standing_look', 'Standing Look'],
  ['lookbook', 'Lookbook'], ['instagram_reels', 'Instagram Reels'], ['phone_showcase', 'Phone Showcase'],
  ['drop_countdown', 'Shop the Look'], ['testimonials', 'Testimonials'], ['community', 'Community'],
  ['influencer_picks', 'Influencer Picks'], ['services_strip', 'Store Promise'],
];
export const DEFAULT_HOME_SECTIONS: CMSSection[] = HOME_ORDER.map(([type, label], i) => ({
  id: `default-${type}`, page_slug: 'home', section_type: type, label, is_visible: true, is_locked: false, config: {}, position: (i + 1) * 10,
}));

export function useCMSPage(slug: string) {
  // Pages show exactly the sections saved in Admin → CMS — no built-in layout or content.
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('website_sections')
        .select('*')
        .eq('page_slug', slug)
        .eq('is_visible', true)
        .order('position', { ascending: true });
      
      setSections((data as unknown as CMSSection[]) ?? []);
    } catch (e) {
      console.warn('Error fetching CMS sections:', e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetch(); }, [fetch]);

  return { sections, loading, refresh: fetch };
}

export function useTestimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve(supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true }))
      .then(({ data }) => {
        setItems((data as unknown as Testimonial[]) ?? []);
      })
      .catch((e) => console.warn('Testimonials error:', e))
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}

export function useFAQs(category?: string) {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase
      .from('faq_items')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });
    if (category) q = q.eq('category', category);
    Promise.resolve(q).then(({ data }) => {
      setItems((data as unknown as FAQItem[]) ?? []);
    })
    .catch((e) => console.warn('FAQs error:', e))
    .finally(() => setLoading(false));
  }, [category]);

  return { items, loading };
}

export function useActiveAnnouncementBar() {
  const [bar, setBar] = useState<AnnouncementBar | null>(null);

  useEffect(() => {
    const now = new Date().toISOString();
    Promise.resolve(supabase
      .from('announcement_bars')
      .select('*')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()
      )
      .then(({ data }) => setBar(data as unknown as AnnouncementBar | null))
      .catch((e) => console.warn('Announcement bar error:', e));
  }, []);

  return bar;
}

// One request per page load, shared by the footer, WhatsApp button and anything else that needs it.
let brandRequest: Promise<BrandSettings | null> | null = null;
const loadBrand = () => (brandRequest ??= Promise.resolve(supabase.from('brand_settings').select('*').limit(1).maybeSingle())
  .then(({ data }) => data as unknown as BrandSettings | null)
  .catch((e) => { console.warn('Brand settings error:', e); brandRequest = null; return null; }));

export function useBrandSettings() {
  const [brand, setBrand] = useState<BrandSettings | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadBrand().then((b) => { if (!cancelled) setBrand(b); });
    return () => { cancelled = true; };
  }, []);
  return brand;
}

export function useThemeSettings() {
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  useEffect(() => {
    Promise.resolve(supabase.from('theme_settings').select('*').limit(1).maybeSingle())
      .then(({ data }) => setTheme(data as unknown as ThemeSettings | null))
      .catch((e) => console.warn('Theme settings error:', e));
  }, []);
  return theme;
}
