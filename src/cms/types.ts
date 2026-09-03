export type SectionType =
  | 'hero' | 'cinematic_hero' | 'category_bar' | 'campaign_carousel' | 'best_sellers' | 'text_reveal' | 'editorial_split' | 'bento_grid'
  | 'new_arrivals' | 'category_grid' | 'marquee' | 'testimonials' | 'flagship_stores'
  | 'lookbook' | 'newsletter' | 'promo_banner' | 'faq' | 'linen_collection' | 'instagram_reels'
  | 'community' | 'influencer_picks';

export interface CMSSection {
  id: string;
  page_slug: string;
  section_type: SectionType;
  label: string | null;
  config: Record<string, any>;
  position: number;
  is_visible: boolean;
  is_locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BestSellersConfig {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta_label?: string;
  cta_href?: string;
  product_count?: number;
}

// ── Section config shapes ────────────────────────────────────────────────────

export interface HeroConfig {
  eyebrow: string;
  heading: string;
  heading_italic: string;
  search_placeholder: string;
  search_cta: string;
  cta_href: string;
  background_image: string;
  overlay_opacity: number;
  social_proof_count: string;
  social_proof_text: string;
}

export interface TextRevealConfig {
  words: string[];
  show_accent_line: boolean;
}

export interface EditorialSplitConfig {
  image: string;
  accent_number: string;
  heading_lines: string[];
  body: string;
  cta_label: string;
  cta_href: string;
  image_position: 'left' | 'right';
}

export interface BentoItem {
  id: number;
  title: string;
  category: string;
  image: string;
  href: string;
  col_span: number;
  row_span: number;
}

export interface BentoGridConfig {
  eyebrow: string;
  heading: string;
  heading_italic: string;
  cta_label: string;
  cta_href: string;
  items: BentoItem[];
}

export interface NewArrivalsConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_href: string;
  product_count: number;
}

export interface CategoryItem {
  slug: string;
  title: string;
  image: string;
  href: string;
  watermark?: string;
  badge?: string;
}

export interface CategoryGridConfig {
  categories: CategoryItem[];
}

export interface MarqueeConfig {
  heading: string;
  heading_italic: string;
  subtext: string;
  watermark: string;
}

export interface TestimonialsConfig {
  heading: string;
  heading_italic: string;
}

export interface LookbookConfig {
  heading?: string;
  subtitle?: string;
}

export interface NewsletterConfig {
  heading_line1: string;
  heading_line2: string;
  body: string;
  placeholder: string;
  cta_label: string;
}

export interface PromoBannerConfig {
  message: string;
  cta_label?: string;
  cta_href?: string;
  bg_color: string;
  text_color: string;
}

export interface FAQConfig {
  heading: string;
  category?: string;
}

export interface CommunityConfig {
  heading?: string;
  subtitle?: string;
}

// ── DB table types ────────────────────────────────────────────────────────────

export interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  avatar: string | null;
  body: string;
  rating: number;
  position: number;
  is_active: boolean;
  created_at: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  position: number;
  is_active: boolean;
  created_at: string;
}

export interface AnnouncementBar {
  id: string;
  message: string;
  cta_label: string | null;
  cta_href: string | null;
  bg_color: string;
  text_color: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface BrandSettings {
  id: string;
  site_name: string;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  og_default_image: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_facebook: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
}

export interface ThemeSettings {
  id: string;
  accent_color: string;
  font_display: string;
  font_ui: string;
  font_elegant: string;
  border_radius: string;
  animations_enabled: boolean;
  custom_css: string | null;
}

export interface SEOSettings {
  id: string;
  page_slug: string;
  title: string | null;
  description: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  canonical_url: string | null;
  no_index: boolean;
}

export interface MediaAsset {
  id: string;
  cloudinary_public_id: string;
  url: string;
  secure_url: string;
  resource_type: string;
  format: string | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  tags: string[];
  created_at: string;
}

export type FieldType = 'text' | 'textarea' | 'url' | 'color' | 'number' | 'boolean' | 'json';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
}
