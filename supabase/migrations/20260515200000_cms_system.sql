-- CMS System: Full website content management
-- Idempotent — safe to run on any Supabase deploy

-- ── Core tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS website_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL DEFAULT 'home',
  section_type text NOT NULL,
  label text,
  config jsonb NOT NULL DEFAULT '{}',
  position int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS website_sections_page_pos_idx ON website_sections(page_slug, position);

CREATE TABLE IF NOT EXISTS seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL UNIQUE,
  title text,
  description text,
  og_image text,
  og_title text,
  og_description text,
  canonical_url text,
  structured_data jsonb,
  no_index boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL DEFAULT 'Vault 26',
  tagline text,
  logo_url text,
  favicon_url text,
  og_default_image text,
  social_instagram text,
  social_twitter text,
  social_facebook text,
  contact_email text,
  contact_phone text,
  address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accent_color text NOT NULL DEFAULT '#B11226',
  font_display text NOT NULL DEFAULT 'Playfair Display',
  font_ui text NOT NULL DEFAULT 'Jost',
  font_elegant text NOT NULL DEFAULT 'Cormorant Garamond',
  border_radius text NOT NULL DEFAULT '0rem',
  animations_enabled boolean NOT NULL DEFAULT true,
  custom_css text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  avatar text,
  body text NOT NULL,
  rating int NOT NULL DEFAULT 5,
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcement_bars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  cta_label text,
  cta_href text,
  bg_color text NOT NULL DEFAULT '#000000',
  text_color text NOT NULL DEFAULT '#FFFFFF',
  is_active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cloudinary_public_id text NOT NULL UNIQUE,
  url text NOT NULL,
  secure_url text NOT NULL,
  resource_type text NOT NULL DEFAULT 'image',
  format text,
  width int,
  height int,
  bytes int,
  alt_text text,
  tags text[] NOT NULL DEFAULT '{}',
  folder text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_versions_lookup_idx ON content_versions(table_name, record_id, created_at DESC);

CREATE TABLE IF NOT EXISTS navigation_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL UNIQUE,
  label text,
  items jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE website_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_menus ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cms_pub_read_website_sections" ON website_sections;
  CREATE POLICY "cms_pub_read_website_sections" ON website_sections FOR SELECT USING (true);

  DROP POLICY IF EXISTS "cms_pub_read_seo" ON seo_settings;
  CREATE POLICY "cms_pub_read_seo" ON seo_settings FOR SELECT USING (true);

  DROP POLICY IF EXISTS "cms_pub_read_brand" ON brand_settings;
  CREATE POLICY "cms_pub_read_brand" ON brand_settings FOR SELECT USING (true);

  DROP POLICY IF EXISTS "cms_pub_read_theme" ON theme_settings;
  CREATE POLICY "cms_pub_read_theme" ON theme_settings FOR SELECT USING (true);

  DROP POLICY IF EXISTS "cms_pub_read_testimonials" ON testimonials;
  CREATE POLICY "cms_pub_read_testimonials" ON testimonials FOR SELECT USING (true);

  DROP POLICY IF EXISTS "cms_pub_read_faqs" ON faq_items;
  CREATE POLICY "cms_pub_read_faqs" ON faq_items FOR SELECT USING (true);

  DROP POLICY IF EXISTS "cms_pub_read_announcements" ON announcement_bars;
  CREATE POLICY "cms_pub_read_announcements" ON announcement_bars FOR SELECT USING (true);

  DROP POLICY IF EXISTS "cms_pub_read_nav" ON navigation_menus;
  CREATE POLICY "cms_pub_read_nav" ON navigation_menus FOR SELECT USING (true);

  DROP POLICY IF EXISTS "cms_admin_all_website_sections" ON website_sections;
  CREATE POLICY "cms_admin_all_website_sections" ON website_sections FOR ALL USING (has_role('admin'));

  DROP POLICY IF EXISTS "cms_admin_all_seo" ON seo_settings;
  CREATE POLICY "cms_admin_all_seo" ON seo_settings FOR ALL USING (has_role('admin'));

  DROP POLICY IF EXISTS "cms_admin_all_brand" ON brand_settings;
  CREATE POLICY "cms_admin_all_brand" ON brand_settings FOR ALL USING (has_role('admin'));

  DROP POLICY IF EXISTS "cms_admin_all_theme" ON theme_settings;
  CREATE POLICY "cms_admin_all_theme" ON theme_settings FOR ALL USING (has_role('admin'));

  DROP POLICY IF EXISTS "cms_admin_all_testimonials" ON testimonials;
  CREATE POLICY "cms_admin_all_testimonials" ON testimonials FOR ALL USING (has_role('admin'));

  DROP POLICY IF EXISTS "cms_admin_all_faqs" ON faq_items;
  CREATE POLICY "cms_admin_all_faqs" ON faq_items FOR ALL USING (has_role('admin'));

  DROP POLICY IF EXISTS "cms_admin_all_announcements" ON announcement_bars;
  CREATE POLICY "cms_admin_all_announcements" ON announcement_bars FOR ALL USING (has_role('admin'));

  DROP POLICY IF EXISTS "cms_admin_all_media" ON media_assets;
  CREATE POLICY "cms_admin_all_media" ON media_assets FOR ALL USING (has_role('admin'));

  DROP POLICY IF EXISTS "cms_admin_all_versions" ON content_versions;
  CREATE POLICY "cms_admin_all_versions" ON content_versions FOR ALL USING (has_role('admin'));

  DROP POLICY IF EXISTS "cms_admin_all_nav" ON navigation_menus;
  CREATE POLICY "cms_admin_all_nav" ON navigation_menus FOR ALL USING (has_role('admin'));
END $$;

-- ── Singletons ───────────────────────────────────────────────────────────────

INSERT INTO brand_settings (site_name, logo_url)
SELECT 'Vault 26', 'https://res.cloudinary.com/dsqeawg67/image/upload/v1776861404/WhatsApp_Image_2026-04-21_at_23.40.39-removebg-preview_1_ztvyke.png'
WHERE NOT EXISTS (SELECT 1 FROM brand_settings);

INSERT INTO theme_settings (accent_color, font_display, font_ui, font_elegant, border_radius, animations_enabled)
SELECT '#B11226', 'Playfair Display', 'Jost', 'Cormorant Garamond', '0rem', true
WHERE NOT EXISTS (SELECT 1 FROM theme_settings);

INSERT INTO seo_settings (page_slug, title, description)
SELECT 'home', 'VAULT 26 — Premium Streetwear Archive', 'Where high fashion meets street authenticity. Not just worn. Remembered.'
WHERE NOT EXISTS (SELECT 1 FROM seo_settings WHERE page_slug = 'home');

-- ── Testimonials ─────────────────────────────────────────────────────────────

INSERT INTO testimonials (name, role, avatar, body, rating, position, is_active)
SELECT t.name, t.role, t.avatar, t.body, t.rating, t.pos, true
FROM (VALUES
  ('Arjun Mehta',  'Fashion Collector',  'https://i.pravatar.cc/100?img=11', 'Vault 26 changed how I think about menswear. The quality is absolutely unmatched.',             5, 0),
  ('Priya Sharma', 'Stylist',            'https://i.pravatar.cc/100?img=12', 'Finally a brand that gets the aesthetic. Every single piece is considered.',                    5, 1),
  ('Rahul Das',    'Art Director',       'https://i.pravatar.cc/100?img=13', 'The archive drops are unreal. I have been collecting since day one.',                           5, 2),
  ('Neha Kapoor',  'Photographer',       'https://i.pravatar.cc/100?img=14', 'The fabric quality speaks for itself. Worth every rupee.',                                      5, 3)
) AS t(name, role, avatar, body, rating, pos)
WHERE NOT EXISTS (SELECT 1 FROM testimonials);

-- ── FAQs ─────────────────────────────────────────────────────────────────────

INSERT INTO faq_items (question, answer, category, position, is_active)
SELECT q.question, q.answer, q.category, q.pos, true
FROM (VALUES
  ('What is Vault 26?',                'Vault 26 is a premium minimalist streetwear brand made in India. We curate limited-edition outerwear, shirts, trousers, and knitwear for the modern minimalist.', 'brand',    0),
  ('Do you offer free shipping?',      'Yes, we offer free shipping on all orders above Rs.999. Orders below this threshold have a flat Rs.79 delivery charge.',                                           'shipping', 1),
  ('How long does delivery take?',     'All orders are dispatched within 24 hours. Standard delivery takes 3-5 business days within India.',                                                               'shipping', 2),
  ('Can I return or exchange an item?','We accept returns within 7 days of delivery. Items must be unworn, unwashed, and in original packaging.',                                                          'returns',  3),
  ('How do I care for my garments?',   'Each garment includes a care label. We recommend gentle machine wash or hand wash in cold water for most pieces.',                                                 'product',  4),
  ('Do you ship internationally?',     'Currently we ship within India only. International shipping is coming soon.',                                                                                      'shipping', 5)
) AS q(question, answer, category, pos)
WHERE NOT EXISTS (SELECT 1 FROM faq_items);

-- ── Announcement bar (off by default) ────────────────────────────────────────

INSERT INTO announcement_bars (message, cta_label, cta_href, bg_color, text_color, is_active, position)
SELECT 'Free shipping on orders above Rs.999  Use code VAULT10 for 10% off your first order', 'Shop Now', '/shop', '#000000', '#FFFFFF', false, 0
WHERE NOT EXISTS (SELECT 1 FROM announcement_bars);

-- ── Navigation menus ─────────────────────────────────────────────────────────

INSERT INTO navigation_menus (location, label, items)
SELECT loc.location, loc.label, loc.items::jsonb
FROM (VALUES
  ('header',      'Header',       '[{"label":"Shop","href":"/shop"},{"label":"Men","href":"/category/men"},{"label":"Women","href":"/category/women"},{"label":"Accessories","href":"/category/accessories"},{"label":"New Arrivals","href":"/category/new-arrivals"}]'),
  ('footer_shop', 'Footer Shop',  '[{"label":"All Products","href":"/shop"},{"label":"Men","href":"/category/men"},{"label":"Women","href":"/category/women"},{"label":"Accessories","href":"/category/accessories"}]'),
  ('footer_info', 'Footer Info',  '[{"label":"About","href":"/about"},{"label":"FAQ","href":"/faq"},{"label":"Shipping","href":"/shipping"},{"label":"Returns","href":"/returns"},{"label":"Contact","href":"/contact"}]')
) AS loc(location, label, items)
WHERE NOT EXISTS (SELECT 1 FROM navigation_menus WHERE location = loc.location);

-- ── Homepage sections seed ────────────────────────────────────────────────────
-- Only inserts if the home page has no sections yet (idempotent)

DO $$
DECLARE
  hero_cfg    jsonb := '{"eyebrow":"ESTABLISHED MMXXVI // ARCHIVE 01","heading":"BEYOND","heading_italic":"TRENDS.","search_placeholder":"FIND YOUR PIECE...","search_cta":"EXPLORE","cta_href":"/shop","background_image":"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=1920","overlay_opacity":0.4,"social_proof_count":"2K+","social_proof_text":"JOIN 2K+ COLLECTORS IN THE ARCHIVE"}';
  reveal_cfg  jsonb := '{"words":["ATTITUDE","CONFIDENCE"],"show_accent_line":true}';
  split_cfg   jsonb := '{"image":"https://images.unsplash.com/photo-1637536701306-3214e9cec64a?auto=format&fit=crop&q=80&w=1080","accent_number":"26","heading_lines":["Redefining","Street Culture"],"body":"Where high fashion meets street authenticity. Vault 26 is more than clothing — a statement of individuality and fearless self-expression.","cta_label":"Discover More","cta_href":"/shop","image_position":"left"}';
  bento_cfg   jsonb := '{"eyebrow":"The New Standard","heading":"Latest from the","heading_italic":"Archive.","cta_label":"View All Drops","cta_href":"/category/shirts","items":[{"id":1,"title":"Menswear Edit","category":"Archive 01","image":"https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800","href":"/category/men","col_span":2,"row_span":2},{"id":2,"title":"Raw Denim Kit","category":"Essentials","image":"https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=800","href":"/shop","col_span":1,"row_span":1},{"id":3,"title":"Silk Utility Shirt","category":"Limited","image":"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=800","href":"/category/shirts","col_span":1,"row_span":1},{"id":4,"title":"Minimalist Trousers","category":"Archive 02","image":"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=800","href":"/category/women","col_span":2,"row_span":1}]}';
  arrivals_cfg jsonb := '{"eyebrow":"DROP 02 — FRESH","title":"NEW ARRIVALS","subtitle":"Hand-picked drops, fresh in the archive.","cta_label":"Shop New Arrivals","cta_href":"/category/new-arrivals","product_count":8}';
  category_cfg jsonb := '{"categories":[{"slug":"men","title":"Menswear","image":"https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=1000","href":"/category/men","watermark":"MEN"},{"slug":"women","title":"Womenswear","image":"https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1000","href":"/category/women","watermark":"WOMEN"},{"slug":"accessories","title":"Accessories","image":"https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1000","href":"/category/accessories","watermark":"ACC","badge":"New"}]}';
  marquee_cfg jsonb := '{"heading":"NOT FOR","heading_italic":"EVERYONE","subtext":"CURATED FOR THE ARCHIVE. DEFINED BY THE BOLD.","watermark":"26"}';
  testi_cfg   jsonb := '{"heading":"Voices of the","heading_italic":"Archive"}';
  look_cfg    jsonb := '{"heading":"Lookbook","images":["https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000","https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000","https://images.unsplash.com/photo-1537832816519-689ad163238b?q=80&w=1000","https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?q=80&w=1000"]}';
  news_cfg    jsonb := '{"heading_line1":"JOIN THE","heading_line2":"Vault","body":"BE THE FIRST TO RECEIVE EXCLUSIVE ACCESS TO LIMITED DROPS, EDITORIAL CONTENT, AND SECRET ARCHIVE RELEASES.","placeholder":"ENTER YOUR EMAIL","cta_label":"Join Now"}';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM website_sections WHERE page_slug = 'home') THEN
    INSERT INTO website_sections (page_slug, section_type, label, config, position, is_visible) VALUES
      ('home', 'hero',           'Hero',                   hero_cfg,     0, true),
      ('home', 'text_reveal',    'ATTITUDE · CONFIDENCE',  reveal_cfg,   1, true),
      ('home', 'editorial_split','Editorial Split',         split_cfg,    2, true),
      ('home', 'bento_grid',     'Bento Grid',             bento_cfg,    3, true),
      ('home', 'new_arrivals',   'New Arrivals',           arrivals_cfg, 4, true),
      ('home', 'category_grid',  'Category Grid',          category_cfg, 5, true),
      ('home', 'marquee',        'Editorial Marquee',      marquee_cfg,  6, true),
      ('home', 'testimonials',   'Testimonials',           testi_cfg,    7, true),
      ('home', 'lookbook',       'Lookbook',               look_cfg,     8, true),
      ('home', 'newsletter',     'Newsletter / Join',      news_cfg,     9, true);
  END IF;
END $$;
