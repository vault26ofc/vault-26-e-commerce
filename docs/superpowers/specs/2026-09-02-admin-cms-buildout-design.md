# Admin/CMS buildout — design spec

Date: 2026-09-02
Status: approved for planning

## Context

A prior client project ("Studio Deny", same builder/pattern lineage as this app) accumulated a
much larger admin/CMS feature set than Vault 26 currently has — 59 migrations vs. this project's
10, 42 admin routes vs. 10. Six reference documents describing that project's schema, admin
panel, payments, shipping, WhatsApp automation, and edge functions were used to identify gaps
worth porting over, adapted to Vault 26's actual UI, brand voice, and existing conventions —
**not** copied verbatim.

This spec covers **one sub-project** of that larger gap list: CMS/admin buildout for features
that don't require a new external account. Two sibling sub-projects are tracked separately and
explicitly NOT part of this spec:

- **WhatsApp expansion** (new templates/triggers, `sync-whatsapp-templates`) — being scoped
  separately; the DB/trigger half can ship without external blockers, the Meta template-sync half
  is inert until a permanent System User token exists.
- **Shiprocket shipping** — deferred entirely until the user has a dedicated Shiprocket API user
  and real credentials; not designed until then, since exact secrets/pickup-location behavior
  depend on the specific account.

## Explicitly out of scope (decided during brainstorming)

- **Loyalty system** (`loyalty_balances`/`loyalty_transactions`, tier recalculation) — cut per
  explicit user request.
- **Popup promo** — cut. In the reference project this is entirely loyalty-tier marketing copy
  (tier names, earn/redeem rules, CTA to a rewards page); with loyalty cut, there's no real
  content for it to show.
- **Invoice settings** — already done. `AdminInvoiceTemplate.tsx` already reads/writes a real
  Supabase `settings` row (`key = 'invoice'`), already cross-device. The reference project's
  "invoice settings" work was fixing a `localStorage`-only bug that doesn't exist here.
- **Section headings registry** — cut as unnecessary. Every section already gets its heading/copy
  edited directly through `AdminCMS.tsx`'s per-section `config` field editor (see `SECTION_FIELDS`
  in `src/cms/registry.ts`); a separate global-heading-override table would duplicate that.
- **Mega menu → Navbar wiring** — admin backend only this round. `Navbar.tsx`'s existing
  full-screen mega-menu (`VAULT_INDEX_DATA`) is hardcoded and works well; rewiring it to read from
  the DB is deferred to a future, explicitly-requested pass so as not to risk regressing a UI
  that already looks right.

## Scope for this spec

1. Sizes (category-scoped, ordered)
2. Mega menu backend (tables + admin page only, no storefront wiring)
3. Preloader settings (singleton, wired into the real `Preloader.tsx`)
4. Lookbook slides (dedicated table, replacing the current config-JSON-in-`website_sections`
   approach for lookbook content)
5. Community photos (genuinely new: table, admin page, new homepage section)
6. Influencer picks (genuinely new: tables, admin page, new homepage section)
7. Shared Cloudinary upload hook (fixes a real bug found while researching this work)

All new copy/branding is Vault 26's own voice — no "Studio Deny" naming or copy is carried over.

## Conventions this work must follow (already established in this codebase)

- **RLS**: every new table gets `... FOR SELECT USING (true)` (public read) +
  `... FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role))`
  (admin write), matching `supabase/migrations/20260515200000_cms_system.sql` exactly. `has_role`
  is defined in `20260503083732_....sql`.
- **Timestamps**: reuse the existing `touch_updated_at()` trigger function for any table with an
  `updated_at` column (already used by several `whatsapp_system.sql` tables) — don't write a new
  one.
- **Admin page style — pick per shape, not uniformly**:
  - Simple flat CRUD (sizes) → the generic `CrudPanel({table, title})` pattern from
    `AdminCatalog.tsx`, extended minimally to support a parent-category dimension and per-category
    ordering.
  - Singleton settings (preloader) → a new tab inside `AdminCMS.tsx`, next to Theme/Brand — same
    `.maybeSingle()` / track-id / insert-or-update pattern already used there for
    `theme_settings`/`brand_settings`.
  - Media-heavy per-item CRUD (mega menu, lookbook, community, influencer picks) → dedicated pages
    under `src/pages/admin/`, added to `AdminLayout.tsx`'s `NAV` array and `App.tsx`'s route tree,
    matching `AdminProducts.tsx`'s shape (table/grid + modal or inline form + reorder chevrons or
    drag).
- **New homepage sections plug into the existing registry**, they don't invent a new rendering
  path: register in `SECTION_COMPONENTS` (`src/cms/registry.ts`), add a `SECTION_META` entry, and
  a `SECTION_FIELDS` entry for any admin-editable heading/subtitle text. `section_type` is a plain
  `text` column (**not** a Postgres enum) — no schema migration is needed to introduce
  `'community'` or `'influencer_picks'` as new values, only a `website_sections` row + registry
  entries.
- **Sections whose real content lives in a dedicated table keep their own `website_sections.config`
  minimal** (`{}` or just `{heading?, subtitle?}`) — same pattern the reference docs used for
  `influencer_picks`/`community`/`contact_support`. Position/visibility/locking still flow through
  the normal `website_sections` row so these sections behave identically to every other section in
  the admin's page builder (reorder, hide, etc.).

## 1. Sizes

```sql
create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, label)
);
alter table public.sizes enable row level security;
create policy "sizes public read" on public.sizes for select using (true);
create policy "sizes admin write" on public.sizes for all
  using (has_role(auth.uid(),'admin'::app_role))
  with check (has_role(auth.uid(),'admin'::app_role));
```

Admin: `/admin/sizes`, `CrudPanel`-derived — category picker (reuses the existing category list),
label input, duplicate-label rejection case-insensitively **within** a category only, new size's
`position` computed as `max(position)+1` for that category server-side (avoids cross-tab
collisions), reorder via chevrons (writes `position` for the affected category's rows via
`Promise.all`, matching the reorder pattern already used elsewhere in this admin panel).

Feeds: `AdminProducts.tsx`'s size checkboxes, once wired to read from `sizes` for the product's
selected category instead of (or alongside) any existing free-text sizing — confirm exact current
behavior at implementation time and preserve it as a fallback for products with no category or no
configured sizes, so nothing regresses for existing products.

## 2. Mega menu backend

```sql
create table if not exists public.mega_menu_categories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null unique references public.categories(id) on delete cascade,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mega_menu_links (
  id uuid primary key default gen_random_uuid(),
  menu_category_id uuid not null references public.mega_menu_categories(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mega_menu_products (
  id uuid primary key default gen_random_uuid(),
  menu_category_id uuid not null references public.mega_menu_categories(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (menu_category_id, product_slug)
);
-- RLS: same public-read / admin-write pair on all three tables.
```

Admin: `/admin/mega-menu`, a new dedicated page. Three sections top-to-bottom: navbar tabs (each
must reference a real, not-already-used `categories` row), sublinks per tab (must reference a real
category, doesn't have to be a child of the tab's category), up to 2 featured products per tab
(a `CHECK`-free client-side cap in the admin form, mirroring the fixed cap used for this same
"featured products per menu category" idea in the reference project). **Correction from an earlier draft of this spec**: there is no existing
drag-and-drop precedent anywhere in this codebase (confirmed via grep for `framer-motion`'s
`Reorder` — zero matches); introducing one for a single admin page would be a new, unproven
interaction pattern for no real benefit. Use the same up/down chevron reorder convention as every
other admin list in this app instead. **No live preview panel** — since `Navbar.tsx` isn't wired
to this data this round, there's nothing real to preview; show a simple static list/tree instead.

## 3. Preloader settings

```sql
create table if not exists public.preloader_settings (
  id uuid primary key default gen_random_uuid(),
  bg_type text not null default 'color' check (bg_type in ('color','image','video')),
  bg_image_url text,
  bg_video_url text,
  content_type text not null default 'text' check (content_type in ('image','text')),
  content_image_url text,
  content_text text not null default '26',
  text_color text not null default '#000000',
  duration_ms integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.preloader_settings enable row level security;
create policy "preloader public read" on public.preloader_settings for select using (true);
create policy "preloader admin write" on public.preloader_settings for all
  using (has_role(auth.uid(),'admin'::app_role))
  with check (has_role(auth.uid(),'admin'::app_role));
create trigger trg_preloader_settings_updated_at before update on public.preloader_settings
  for each row execute function touch_updated_at();
insert into public.preloader_settings (content_text) values ('26');
```

No create/drop/recreate churn this time (unlike the reference project's history) — get the shape
right up front: current `Preloader.tsx` is a fixed 1000ms timer showing a hardcoded "26" watermark
at 3% opacity plus a blur/scale exit. New behavior: read the singleton row, support solid-color /
image / video backdrop, text-or-image foreground content, configurable duration. **Preserve the
existing exit animation exactly as-is** — only the backdrop/content/duration become configurable,
the motion choreography isn't part of this change.

Admin: a new "Preloader" tab in `AdminCMS.tsx`, alongside Theme/Brand — same singleton
load/save-with-id pattern already used for those two.

## 4. Lookbook slides

```sql
create table if not exists public.lookbook_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  caption text,
  product_slug text references public.products(slug) on delete set null,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.lookbook_slides enable row level security;
create policy "lookbook_slides public read" on public.lookbook_slides for select using (true);
create policy "lookbook_slides admin write" on public.lookbook_slides for all
  using (has_role(auth.uid(),'admin'::app_role))
  with check (has_role(auth.uid(),'admin'::app_role));
```

`LookbookSection.tsx` currently reads its slide list out of the `lookbook` section_type's
`config` JSON (via `website_sections`). Rewire it to read from `lookbook_slides` instead — this is
a real upgrade (per-slide product linking, easier reordering, real per-slide media picker) over
hand-editing a JSON blob. The `website_sections` row for `lookbook` stays (still controls
position/visibility/locking on the homepage and on `/lookbook`, per `LookbookSection.tsx`'s
`isPage` prop) but its `config` becomes minimal (optional heading/subtitle only).

Admin: `/admin/lookbook`, dedicated page — table, modal add/edit form (media upload-or-URL toggle,
product picker populated from `products`, caption text, active toggle), reorder chevrons, delete
with confirm. `caption`/`product_slug` should actually be exposed in this form (the reference
project left `caption` unreachable from its UI by mistake — don't repeat that here).

## 5. Community photos (new homepage section)

```sql
create table if not exists public.community_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  handle text,
  bento_size text not null default 'md' check (bento_size in ('sm','md','lg','wide','tall')),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
-- RLS: same public-read / admin-write pair.
```

New section component `src/cms/sections/CommunitySection.tsx`, registered in
`src/cms/registry.ts` as `community` with a `SECTION_META` entry and `SECTION_FIELDS: [{heading},
{subtitle}]` (optional overridable text, defaults written in Vault 26's own voice — final copy to
be drafted at implementation time, not dictated in this spec). Renders `community_photos` as a
bento grid (`bento_size` controls each tile's grid span). Fetches directly from Supabase inside
the component, same as other data-backed sections (`best_sellers`, `new_arrivals`).

Admin: `/admin/community`, dedicated page. Grid-of-cards, no table — matching the reference
project's simplest CMS page shape: every field (handle, bento size, media, position) saves
individually and immediately on change, no page-level Save button.

## 6. Influencer picks (new homepage section)

```sql
create table if not exists public.influencer_picks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text,
  video_source text not null check (video_source in ('upload','link')),
  video_url text,
  link_url text,
  thumbnail_url text,
  thumbnail_type text not null default 'image' check (thumbnail_type in ('image','video')),
  quote text,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (
    (video_source = 'upload' and video_url is not null) or
    (video_source = 'link' and link_url is not null)
  )
);

create table if not exists public.influencer_pick_products (
  id uuid primary key default gen_random_uuid(),
  influencer_pick_id uuid not null references public.influencer_picks(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (influencer_pick_id, product_slug)
);
-- RLS: same public-read / admin-write pair on both tables.
```

New section component `src/cms/sections/InfluencerPicksSection.tsx`, registered the same way as
Community (`influencer_picks` type, optional heading/subtitle config). Renders each pick with its
thumbnail; `video_source: 'upload'` autoplays on hover, `'link'` opens externally on click.

Admin: `/admin/influencer-picks`, dedicated page. Video-source toggle (upload vs. link, validated
mutually-exclusive per the `CHECK` constraint above), product tagging sub-list gated on the pick
already being saved (has a real `id`) — carry over the reference project's one deliberate UX
exception: a brand-new pick's Save keeps the modal open afterward specifically so products can be
tagged immediately without a second round trip.

## 7. Shared Cloudinary upload hook (bug fix + consolidation)

**Found while researching this work**: `AdminCMS.tsx`'s `uploadMedia` posts to a hardcoded cloud
name (`dsqeawg67`) and hardcoded preset (`'vault26_unsigned'`) — different from the env vars
(`VITE_CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_UPLOAD_PRESET`, now `dnnfpvtwr` /
`vault26_uploads`) that `AdminProducts.tsx` correctly uses. This needs verifying at implementation
time — if `vault26_unsigned` doesn't exist as a preset on `dsqeawg67`, CMS media uploads are
currently silently broken.

New: `src/lib/useCloudinaryUpload.ts` — one hook, `{ upload(file, opts), uploading, progress }`,
using raw `XMLHttpRequest` (not `fetch`) so `progress` is real (`xhr.upload.onprogress`), reading
the correct env vars, returning the resulting `secure_url`. Fix `AdminCMS.tsx` and
`AdminProducts.tsx` to both use this hook instead of their current independent inline
implementations, and use it in every new admin page from this spec that uploads media (preloader,
lookbook, community, influencer picks) instead of writing a third copy.

## Testing / verification

This repo has real Playwright e2e coverage (`tests/e2e/*.spec.ts`) that asserts CMS content
renders correctly against **seeded** data (see `tests/e2e/cms.spec.ts` — it navigates to `/`,
waits for Supabase-backed sections to load, and checks for specific seeded text). New work in this
spec should follow that exact pattern: seed each new table with at least one row in its migration,
then add assertions to `cms.spec.ts` (or a new spec file if that one is getting unwieldy) that the
new sections render their seeded content on the homepage without JS errors, matching the existing
file's style.

No unit-test convention exists for admin CRUD pages in this repo currently (`vitest` is configured
but no test files use it yet) — manual verification via `npm run dev` (create/edit/reorder/delete
on each new admin page, confirm the corresponding storefront output) is the bar to hit, consistent
with how the rest of this admin panel was evidently built and verified.

## Sequencing note for the implementation plan

Items 1–4 (sizes, mega menu backend, preloader, lookbook) touch only existing UI or add
backend-only admin pages — lower risk, no new storefront-visible components. Items 5–6 (community,
influencer picks) are genuinely new homepage content and should go last, once the shared upload
hook (item 7) exists, so they're built on the fixed foundation rather than adding a fourth
inconsistent upload implementation.
