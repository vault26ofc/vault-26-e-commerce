-- Homepage content now lives only in website_sections.config (Admin → CMS); the section code has
-- no built-in demo content any more. This copies what the sections used to show by default into
-- each saved section, so the live homepage looks the same — but every word and photo is now
-- editable, and clearing a field really clears it. Fields the admin already filled in are kept;
-- only empty/missing ones are filled.

create or replace function public._cms_is_empty(v jsonb)
returns boolean language plpgsql immutable as $$
begin
  return case jsonb_typeof(v)
    when 'null' then true
    when 'string' then length(trim(v #>> '{}')) = 0
    when 'array' then not exists (select 1 from jsonb_array_elements(v) e where not public._cms_is_empty(e))
    when 'object' then not exists (select 1 from jsonb_each(v) e where not public._cms_is_empty(e.value))
    else false end;
end $$;

create or replace function public._cms_strip_empty(j jsonb)
returns jsonb language plpgsql immutable as $$
begin
  return coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(j, '{}'::jsonb)) e
                   where not public._cms_is_empty(e.value)), '{}'::jsonb);
end $$;

update public.website_sections set config = $cfg${"heading": "EDITORIAL ARCHIVE", "eyebrow": "CURATED HIGHLIGHTS", "cta_label": "EXPLORE ALL EDITIONS"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'bento_grid';

update public.website_sections set config = $cfg${"title": "New arrivals", "cta_label": "View all", "cta_link": {"type": "page", "value": "/shop", "label": "Shop all"}, "subtitle": "Fresh drops picked by the studio. Heavyweight cotton, washed denim and knitwear worth a place in your rotation."}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'best_sellers';

update public.website_sections set config = $cfg${"brand": "Vault 26", "slides": [{"title": "VAULT 26 POLO CLUB", "cta_label": "SHOP NOW", "cta_link": {"type": "page", "value": "/shop", "label": "Shop all"}, "image": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=95&w=2000"}, {"title": "ARCHIVE DROPS 26", "cta_label": "EXPLORE COLLECTION", "cta_link": {"type": "page", "value": "/shop", "label": "Shop all"}, "image": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=2000"}, {"title": "QUIET LUXURY ESSENTIALS", "cta_label": "DISCOVER DROPS", "cta_link": {"type": "page", "value": "/shop", "label": "Shop all"}, "image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=95&w=2000"}, {"title": "SEASONAL CAPSULES", "cta_label": "VIEW LOOKBOOK", "cta_link": {"type": "page", "value": "/lookbook", "label": "Lookbook"}, "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=95&w=2000"}], "statement": "Some pieces are worn once. Others", "highlight": "become part of you", "body": "We believe good clothing doesn't end at the checkout. It stays in your rotation, takes on your habits and comes back to you in every season of your life.", "stats": [{"n": "650+", "label": "pieces in the archive", "sub": "built for years of wear"}, {"n": "50+", "label": "new drops every month", "sub": "the catalogue keeps moving"}, {"n": "20", "label": "fabric mills we work with", "sub": "independent and heritage"}, {"n": "100%", "label": "hand-finished", "sub": "every seam checked by the studio"}]}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'campaign_carousel';

update public.website_sections set config = $cfg${"all_label": "Shop all", "all_link": {"type": "page", "value": "/shop", "label": "Shop all"}, "categories": [{"title": "JACKETS", "image": "/camo_zip_up_hoodie.png", "href": "/shop?category=jackets"}, {"title": "SWEATERS", "image": "/off_white_knit_sweater.png", "href": "/shop?category=sweaters"}, {"title": "T-SHIRTS", "image": "/black_camo_tshirt.png", "href": "/shop?category=t-shirts"}, {"title": "SHORTS", "image": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&q=80&w=240", "href": "/shop?category=shorts"}, {"title": "KNITWEAR", "image": "/off_white_knit_sweater.png", "href": "/shop?category=knitwear"}, {"title": "JEANS", "image": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=240", "href": "/shop?category=jeans"}, {"title": "SHIRTS", "image": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=240", "href": "/shop?category=shirts"}, {"title": "TROUSERS", "image": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=240", "href": "/shop?category=trousers"}]}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'category_bar';

update public.website_sections set config = $cfg${"cards": [{"title": "Men", "kicker": "Outerwear · Knitwear · Denim", "link": "/shop?category=men", "image": "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&q=85&w=2000", "tone": "red"}, {"title": "Women", "kicker": "Tailoring · Layers · Essentials", "link": "/shop?category=women", "image": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&q=85&w=2000", "tone": "ink"}, {"title": "Sneakers", "kicker": "Court · Runner · Leather", "link": "/shop?category=shoes", "image": "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=85&w=2000", "tone": "paper"}]}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'category_cards';

update public.website_sections set config = $cfg${"heading": "Categories", "bottom_label": "Go to catalogue", "categories": [{"slug": "outerwear", "title": "OUTERWEAR & JACKETS", "subtitle": "Heavyweight jackets & technical coats", "image": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=95&w=1200", "href": "/shop?category=jackets"}, {"slug": "knitwear", "title": "SWEATERS & KNITWEAR", "subtitle": "Italian wool & relaxed linen knits", "image": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=1200", "href": "/shop?category=sweaters"}, {"slug": "sneakers", "title": "SNEAKERS & FOOTWEAR", "subtitle": "Minimalist leather trainers & studio sneakers", "image": "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=95&w=2000", "href": "/shop?category=shoes"}]}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'category_grid';

update public.website_sections set config = $cfg${"title": "NEW COLLECTION", "subtitle": "SEASONAL ARCHIVE 01", "cta_label": "VIEW ALL COLLECTIONS"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'collections';

update public.website_sections set config = $cfg${"swatch_text": "Every piece in the archive cut in {colour} tones — tees, knits, outerwear and accessories.", "title": "Colour stories", "eyebrow": "Shop by colour", "meta": "Lato · body", "cta_label": "Explore the palette", "swatches": [{"name": "Paper", "hex": "#FFFFFF", "q": "white"}, {"name": "Margins", "hex": "#F1F1F1", "q": "grey"}, {"name": "Editor's red", "hex": "#BB0006", "q": "red"}, {"name": "Archive red", "hex": "#AA0001", "q": "burgundy"}, {"name": "Print ink", "hex": "#0F0F0F", "q": "black"}]}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'colour_story';

update public.website_sections set config = $cfg${"heading": "WORN BY VAULT 26", "subtitle": "FROM THE COMMUNITY"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'community';

update public.website_sections set config = $cfg${"image": "https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&q=85&w=1600", "eyebrow": "Look 07 · Archive 01", "title": "Shop the look", "cta_label": "Full look", "button_label": "Choose size"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'drop_countdown';

update public.website_sections set config = $cfg${"image": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=90&w=1920", "body": "A philosophy born from confidence, understated elegance, and individual strength. We believe clothing is a language — form, texture, and detail designed to empower.", "cta_label": "About Brand"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'editorial_split';

update public.website_sections set config = $cfg${"heading": "Frequently Asked Questions"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'faq';

update public.website_sections set config = $cfg${"image": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=95&w=1600"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'flagship_stores';

update public.website_sections set config = $cfg${"photo": "/polka_hero_editorial.jpg", "top_line": "Online Store", "title": "Vault 26", "paper": "/hero_paper_texture.jpg", "labels": [{"text": "SEPTEMBER 2026"}, {"text": "STREETWEAR"}, {"text": "ARCHIVE 01"}, {"text": "EST. MMXXVI"}, {"text": "NEW COLLECTION"}], "cta_label": "Shop Collection 2026", "cta_link": {"type": "page", "value": "/shop", "label": "Shop all"}}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'hero';

update public.website_sections set config = $cfg${"heading": "STYLED BY", "subtitle": "INFLUENCER PICKS"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'influencer_picks';

update public.website_sections set config = $cfg${"tag": "As seen on Instagram", "instagram_url": "https://instagram.com", "handle": "@vault26.official", "follow_label": "Follow us", "button_prefix": "Shop", "reels": [{"video": "https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-black-jacket-41584-large.mp4", "poster": "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800", "caption": "Archival Double-Breasted Tailoring in Milan 🇮🇹 #VAULT26", "likes": "18.4K", "comments": "412", "shares": "2.1K", "product": ["unstructured-raw-linen-blazer"], "product_label": "Raw Linen Blazer"}, {"video": "https://assets.mixkit.co/videos/preview/mixkit-model-posing-in-a-studio-setting-41585-large.mp4", "poster": "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800", "caption": "Summer Linen Capsule drop now live 🌾 Link in bio.", "likes": "24.1K", "comments": "589", "shares": "3.4K", "product": ["relaxed-resort-linen-shirt"], "product_label": "Resort Linen Shirt"}, {"video": "https://assets.mixkit.co/videos/preview/mixkit-feet-of-a-person-walking-in-sneakers-42686-large.mp4", "poster": "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800", "caption": "Movement test: Handcrafted Atelier Loafer 👞 #FootwearArchive", "likes": "14.8K", "comments": "304", "shares": "1.9K", "product": ["italian-leather-atelier-loafer"], "product_label": "Atelier Loafer"}, {"video": "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-leather-wallet-41589-large.mp4", "poster": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800", "caption": "Full-grain vegetable-tanned leather details ✨", "likes": "12.3K", "comments": "215", "shares": "1.2K", "product": ["minimalist-cargo-trousers"], "product_label": "Pleated Trousers"}, {"video": "https://assets.mixkit.co/videos/preview/mixkit-young-woman-wearing-a-hat-and-sunglasses-41582-large.mp4", "poster": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800", "caption": "Eyewear & Accessories Archive 04 🕶️ #VaultEyewear", "likes": "19.6K", "comments": "478", "shares": "2.8K", "product": ["heavyweight-box-tee"], "product_label": "Box Tee — Onyx"}, {"video": "https://assets.mixkit.co/videos/preview/mixkit-model-walking-on-a-runway-41587-large.mp4", "poster": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800", "caption": "Paris Fashion Week Runway Highlight 🇫🇷", "likes": "31.2K", "comments": "890", "shares": "5.6K", "product": ["raw-selvedge-oversized-denim"], "product_label": "Selvedge Jacket"}]}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'instagram_reels';

update public.website_sections set config = $cfg${"title": "SPRING / SUMMER LINEN EDIT", "subtitle": "NATURAL FIBERS & BREATHABLE SILHOUETTES", "cta_label": "EXPLORE LINEN CAPSULE"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'linen_collection';

update public.website_sections set config = $cfg${"body": "Stories from the studio and the street. Every frame is styled from the current archive, and every piece in it is ready to shop.", "cta_label": "Open the lookbook", "heading": "VAULT 26 JOURNAL", "subtitle": "EDITORIAL & LOOKBOOK"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'lookbook';

update public.website_sections set config = $cfg${"items": [{"text": "FREE SHIPPING ON ORDERS OVER ₹2,500"}, {"text": "VAULT 26 ARCHIVE"}, {"text": "QUIET LUXURY ESSENTIALS"}, {"text": "CRAFTED IN INDIA"}, {"text": "LIMITED EDITION RELEASES"}, {"text": "BEYOND TRENDS"}]}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'marquee';

update public.website_sections set config = $cfg${"title": "NEW ARRIVALS", "eyebrow": "FRESH DROPS", "cta_label": "SHOP NEW ARRIVALS"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'new_arrivals';

update public.website_sections set config = $cfg${"cta_label": "Join Now", "heading_line1": "JOIN THE", "heading_line2": "Vault", "body": "BE THE FIRST TO RECEIVE EXCLUSIVE ACCESS TO LIMITED DROPS, EDITORIAL CONTENT, AND SECRET ARCHIVE RELEASES.", "placeholder": "ENTER YOUR EMAIL"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'newsletter';

update public.website_sections set config = $cfg${"image": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&q=85&w=1400", "email": "hello@vault26.co.in", "hours": "Made in India · Mon–Sun 11–20", "cta_label": "Shop on any screen", "brand": "Vault 26", "screen_title": "Shop all", "phone": "+91 99999 99999", "chips": "All pieces, New, Bestsellers, Only here, Pre-order, Sale"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'phone_showcase';

update public.website_sections set config = $cfg${"brand_lines": "Collection · Archive 01 · 2026\nE-commerce", "image": "/accessories_hero_1778236772681.png", "brand": "Vault 26", "panel_title": "Lookbook", "cta_label": "Shop the look", "photos": [{"image": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=700"}, {"image": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=700"}, {"image": "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&q=80&w=700"}, {"image": "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=700"}, {"image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=700"}, {"image": "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&q=80&w=700"}, {"image": "/jewelry_editorial_1778237108834.png"}, {"image": "/sunglasses_editorial_1778236803975.png"}], "cta_link": {"type": "page", "value": "/lookbook", "label": "Lookbook"}}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'photo_shuffle';

update public.website_sections set config = $cfg${"title": "The season board", "see_all_label": "Shop everything", "campaign_title": "Autumn / Winter", "campaign_cta": "Shop the campaign", "offer_text": "−15% on first order", "stat_eyebrow": "Since 2026", "stat_text": "pieces made to outlive the season", "lookbook_cta": "Open the lookbook", "service_title": "Delivered in 3–5 days", "service_text": "Free shipping over ₹999 · 7-day returns · COD available", "campaign_image": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1600", "offer_eyebrow": "Members", "stat_value": "650+", "lookbook_image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1600", "tile_image": "https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&q=80&w=900", "tile_label": "Outerwear"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'polka_bento';

update public.website_sections set config = $cfg${"image": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&q=85&w=2400", "title": "Picked for you", "see_all_label": "Shop all"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'product_marquee';

update public.website_sections set config = $cfg${"bg_color": "#000000", "text_color": "#ffffff", "message": "LIMITED TIME OFFER — FREE SHIPPING ON ORDERS ABOVE ₹2000"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'promo_banner';

update public.website_sections set config = $cfg${"items": [{"title": "Free shipping", "body": "On every order above ₹999, delivered in 3–5 days across India.", "link": "/faq"}, {"title": "7-day returns", "body": "Changed your mind? Send it back unworn with tags for a full refund.", "link": "/faq"}, {"title": "Size exchange", "body": "Wrong fit? We swap sizes free of charge, once per order.", "link": "/faq"}, {"title": "Pay your way", "body": "UPI, cards, net banking or cash on delivery — all secured.", "link": "/faq"}]}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'services_strip';

update public.website_sections set config = $cfg${"phrase": "Wear what matters · New season · ", "caption": "Independent cuts, heavyweight fabrics and pieces that stay in your rotation for years.", "title": "The edit", "see_all_label": "View all"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'split_scroll';

update public.website_sections set config = $cfg${"headline_lines": "Built\nto be", "image": "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&q=85&w=1400", "headline_highlight": "lived in", "title": "Complete the look", "see_all_label": "All", "cta_label": "Shop the full look"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'standing_look';

update public.website_sections set config = $cfg${"body": "What our customers say about the pieces that made it into their wardrobe. Honest impressions, favourite fits and recommendations.", "heading": "Reviews", "sort_label": "Newest first"}$cfg$::jsonb || public._cms_strip_empty(config), updated_at = now()
where section_type = 'testimonials';

drop function public._cms_strip_empty(jsonb);
drop function public._cms_is_empty(jsonb);

-- The footer's contact line and hours now come from Brand settings (Admin → CMS → Brand).
update public.brand_settings set
  contact_email = coalesce(nullif(trim(contact_email), ''), 'hello@vault26.co.in'),
  support_hours = coalesce(nullif(trim(support_hours), ''), 'Mon–Sun: 11:00–20:00 IST');
