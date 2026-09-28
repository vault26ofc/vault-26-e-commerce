-- The Community and Influencer Picks homepage rows (seeded in 20260902050000 / 20260902060000) had
-- been deleted, so both sections vanished from the site. Restore them after Reviews and before
-- Store Promise (their place in the old layout), keeping any row that already exists.
insert into public.website_sections (page_slug, section_type, label, config, position, is_visible, is_locked)
select 'home', v.section_type, v.label, '{}'::jsonb, v.position, true, false
from (values ('community', 'Community', 184), ('influencer_picks', 'Influencer Picks', 186)) as v(section_type, label, position)
where not exists (select 1 from public.website_sections s where s.page_slug = 'home' and s.section_type = v.section_type);
