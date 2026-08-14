import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  CMSSection, Testimonial, FAQItem, AnnouncementBar,
  BrandSettings, ThemeSettings, SEOSettings,
} from '../types';

const DEFAULT_HOME_SECTIONS: CMSSection[] = [
  {
    id: 'default-hero',
    page_slug: 'home',
    section_type: 'hero',
    label: 'Hero',
    position: 10,
    is_visible: true,
    is_locked: true,
    config: {
      eyebrow: 'ESTABLISHED MMXXVI // ARCHIVE 01',
      heading: 'Vault 26',
      heading_italic: 'BEYOND TRENDS.',
      search_placeholder: 'FIND YOUR PIECE...',
      search_cta: 'Go to Catalog',
      cta_href: '/shop',
      social_proof_count: '2K+',
      social_proof_text: 'Clothing that highlights character and stays timeless.',
      background_image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=90&w=1920'
    }
  },
  {
    id: 'default-cinematic-hero',
    page_slug: 'home',
    section_type: 'cinematic_hero',
    label: 'Cinematic 3D Frame Sequence',
    position: 11,
    is_visible: true,
    is_locked: false,
    config: {}
  },
  {
    id: 'default-marquee',
    page_slug: 'home',
    section_type: 'marquee',
    label: 'Marquee Ticker',
    position: 12,
    is_visible: true,
    is_locked: false,
    config: {
      heading: 'FREE SHIPPING ON ORDERS OVER ₹2,500'
    }
  },
  {
    id: 'default-category-bar',
    page_slug: 'home',
    section_type: 'category_bar',
    label: 'Category Bar',
    position: 13,
    is_visible: true,
    is_locked: false,
    config: {}
  },
  {
    id: 'default-best-sellers',
    page_slug: 'home',
    section_type: 'best_sellers',
    label: 'Best Sellers',
    position: 15,
    is_visible: true,
    is_locked: false,
    config: {
      eyebrow: 'CURATED HIGHLIGHTS',
      title: 'Bestsellers',
      subtitle: 'Our most celebrated pieces, crafted from heavyweight fabrics.',
      cta_label: 'View all',
      cta_href: '/shop',
      product_count: 4
    }
  },
  {
    id: 'default-campaign-carousel',
    page_slug: 'home',
    section_type: 'campaign_carousel',
    label: 'Campaign Carousel',
    position: 16,
    is_visible: true,
    is_locked: false,
    config: {}
  },
  {
    id: 'default-category-grid',
    page_slug: 'home',
    section_type: 'category_grid',
    label: 'Categories',
    position: 20,
    is_visible: true,
    is_locked: false,
    config: {
      categories: [
        { slug: 'outerwear', title: 'OUTERWEAR & JACKETS', seasonTag: 'Autumn/Winter 26', subtitle: 'Heavyweight jackets & technical coats', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=95&w=1200', href: '/shop?category=jackets' },
        { slug: 'knitwear', title: 'SWEATERS & KNITWEAR', seasonTag: 'Core Archive', subtitle: 'Italian wool & relaxed linen knits', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=1200', href: '/shop?category=sweaters' },
        { slug: 'sneakers', title: 'SNEAKERS & FOOTWEAR', seasonTag: 'Handcrafted Atelier 26', subtitle: 'Minimalist leather trainers & studio sneakers', image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=95&w=2000', href: '/shop?category=shoes', isFullWidth: true }
      ]
    }
  },
  {
    id: 'default-lookbook',
    page_slug: 'home',
    section_type: 'lookbook',
    label: 'SSENSE Lookbook',
    position: 25,
    is_visible: true,
    is_locked: false,
    config: {}
  },
  {
    id: 'default-category-grid',
    page_slug: 'home',
    section_type: 'category_grid',
    label: 'Category Grid',
    position: 60,
    is_visible: true,
    is_locked: false,
    config: {
      categories: [
        {
          slug: 'men',
          title: 'Men Collection',
          image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&q=90&w=800',
          href: '/category/men',
          watermark: 'MEN'
        },
        {
          slug: 'shoes',
          title: 'Footwear & Sneakers',
          image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=90&w=800',
          href: '/category/shoes',
          watermark: 'SHOES'
        },
        {
          slug: 'accessories',
          title: 'Leather & Accessories',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=90&w=800',
          href: '/category/accessories',
          watermark: 'ACC'
        }
      ]
    }
  },
  {
    id: 'default-lookbook',
    page_slug: 'home',
    section_type: 'lookbook',
    label: 'Lookbook',
    position: 90,
    is_visible: true,
    is_locked: false,
    config: {
      heading: 'LOOKBOOK 2026',
      images: [
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=90&w=800',
        'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=90&w=800',
        'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=90&w=800',
        'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&q=90&w=800'
      ]
    }
  },
  {
    id: 'default-instagram-reels',
    page_slug: 'home',
    section_type: 'instagram_reels',
    label: 'Instagram Reels',
    position: 92,
    is_visible: true,
    is_locked: false,
    config: {}
  },
  {
    id: 'default-testimonials',
    page_slug: 'home',
    section_type: 'testimonials',
    label: 'Testimonials',
    position: 95,
    is_visible: true,
    is_locked: false,
    config: {
      heading: 'Testimonials'
    }
  },
  {
    id: 'default-newsletter',
    page_slug: 'home',
    section_type: 'newsletter',
    label: 'Newsletter',
    position: 100,
    is_visible: true,
    is_locked: false,
    config: {
      heading_line1: 'JOIN THE',
      heading_line2: 'VAULT.',
      body: 'Subscribe to receive priority access to unreleased drops and private collection previews.',
      placeholder: 'ENTER YOUR EMAIL...',
      cta_label: 'JOIN ARCHIVE'
    }
  }
];

export function useCMSPage(slug: string) {
  const [sections, setSections] = useState<CMSSection[]>(slug === 'home' ? DEFAULT_HOME_SECTIONS : []);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('website_sections')
        .select('*')
        .eq('page_slug', slug)
        .eq('is_visible', true)
        .order('position', { ascending: true });
      
      const loaded = (data as unknown as CMSSection[]) ?? [];
      if (loaded.length > 0) {
        setSections(loaded);
      } else if (slug === 'home') {
        setSections(DEFAULT_HOME_SECTIONS);
      } else {
        setSections([]);
      }
    } catch (e) {
      console.warn('Error fetching CMS sections, using defaults:', e);
      if (slug === 'home') setSections(DEFAULT_HOME_SECTIONS);
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
    supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true })
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
    q.then(({ data }) => {
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
    supabase
      .from('announcement_bars')
      .select('*')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setBar(data as unknown as AnnouncementBar | null))
      .catch((e) => console.warn('Announcement bar error:', e));
  }, []);

  return bar;
}

export function useBrandSettings() {
  const [brand, setBrand] = useState<BrandSettings | null>(null);
  useEffect(() => {
    supabase.from('brand_settings').select('*').limit(1).maybeSingle()
      .then(({ data }) => setBrand(data as unknown as BrandSettings | null))
      .catch((e) => console.warn('Brand settings error:', e));
  }, []);
  return brand;
}

export function useThemeSettings() {
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  useEffect(() => {
    supabase.from('theme_settings').select('*').limit(1).maybeSingle()
      .then(({ data }) => setTheme(data as unknown as ThemeSettings | null))
      .catch((e) => console.warn('Theme settings error:', e));
  }, []);
  return theme;
}
