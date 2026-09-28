-- The homepage used to invent 10 "Polka" sections in code (Home.tsx) with empty config, so the CMS
-- could not edit, hide or reorder them. Store them as real rows, in exactly the order the site
-- rendered them, and renumber positions 10, 20, 30… so admins can reorder freely.

with wanted(ord, section_type, label) as (
  values
    (1, 'hero', 'Hero'),
    (2, 'marquee', 'Marquee'),
    (3, 'category_bar', 'Category Bar'),
    (4, 'best_sellers', 'Best Sellers'),
    (5, 'category_cards', 'Category Cards'),
    (6, 'product_marquee', 'Product Belt'),
    (7, 'polka_bento', 'Season Board'),
    (8, 'campaign_carousel', 'Campaign Carousel'),
    (9, 'split_scroll', 'Split Scroll'),
    (10, 'category_grid', 'Category Grid'),
    (11, 'photo_shuffle', 'Photo Shuffle'),
    (12, 'colour_story', 'Colour Stories'),
    (13, 'standing_look', 'Standing Look'),
    (14, 'lookbook', 'Lookbook'),
    (15, 'instagram_reels', 'Instagram Reels'),
    (16, 'phone_showcase', 'Phone Showcase'),
    (17, 'drop_countdown', 'Shop the Look'),
    (18, 'testimonials', 'Testimonials'),
    (19, 'services_strip', 'Store Promise')
)
insert into public.website_sections (page_slug, section_type, label, position, is_visible, config)
select 'home', w.section_type, w.label, w.ord * 10, true, '{}'::jsonb
from wanted w
where not exists (select 1 from public.website_sections s where s.page_slug = 'home' and s.section_type = w.section_type);

with wanted(ord, section_type) as (
  values (1,'hero'),(2,'marquee'),(3,'category_bar'),(4,'best_sellers'),(5,'category_cards'),(6,'product_marquee'),
         (7,'polka_bento'),(8,'campaign_carousel'),(9,'split_scroll'),(10,'category_grid'),(11,'photo_shuffle'),
         (12,'colour_story'),(13,'standing_look'),(14,'lookbook'),(15,'instagram_reels'),(16,'phone_showcase'),
         (17,'drop_countdown'),(18,'testimonials'),(19,'services_strip')
)
update public.website_sections s set position = w.ord * 10
from wanted w
where s.page_slug = 'home' and s.section_type = w.section_type;
