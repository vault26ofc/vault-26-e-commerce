-- The homepage Split Scroll row was deleted by accident in the CMS. Restore it in its old place
-- (between Campaign Carousel at 80 and Category Grid at 100), keeping any row that already exists.
insert into public.website_sections (page_slug, section_type, label, config, position, is_visible, is_locked)
select 'home', 'split_scroll', 'Split Scroll', '{}'::jsonb, 90, true, false
where not exists (select 1 from public.website_sections s where s.page_slug = 'home' and s.section_type = 'split_scroll');
