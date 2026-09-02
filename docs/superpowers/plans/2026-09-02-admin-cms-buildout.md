# Admin/CMS Buildout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Vault 26's admin panel up to parity with a prior client project's feature set for sizes, mega-menu backend, preloader settings, lookbook, community photos, and influencer picks — without loyalty, popup promo, invoice settings (already done), section headings, or Navbar mega-menu wiring, all of which were explicitly cut or deferred during design.

**Architecture:** New Supabase tables (public-read/admin-write RLS, matching every existing table's exact policy shape) feed either a new dedicated admin page (media-heavy CRUD) or an existing admin surface (`AdminCatalog.tsx`-style panel for sizes, a new `AdminCMS.tsx` tab for the preloader singleton). Two brand-new homepage sections (community, influencer picks) plug into the existing `SECTION_COMPONENTS`/`SECTION_META`/`SECTION_FIELDS` registry in `src/cms/registry.ts` — the same mechanism every other homepage section already uses — so they get position/visibility/reordering for free through the existing "Pages" tab in `AdminCMS.tsx`.

**Tech Stack:** React 18 + TypeScript + Vite, React Router v6, Supabase (Postgres + RLS), Tailwind (no shadcn for new pages — matching the raw-Tailwind house style used by `AdminCatalog.tsx`/`AdminProducts.tsx`/`AdminOrders.tsx`), `sonner` for toasts, `lucide-react` for icons, Playwright for e2e (`tests/e2e/*.spec.ts`).

**Spec:** `docs/superpowers/specs/2026-09-02-admin-cms-buildout-design.md`

## Global Constraints

- Every new table: `alter table ... enable row level security;` + `for select using (true)` (public read) + `for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'))` (admin write) — exact form, no `::app_role` cast, `public.` prefix. This project's `app_role` enum is `('admin', 'customer')` only — no `'staff'`.
- Any `updated_at` column uses the existing `public.touch_updated_at()` trigger function — never write a new one.
- New admin pages use the raw-Tailwind house style: `border border-border`, `bg-transparent px-3 py-2 text-sm` inputs, `bg-foreground text-background py-2 text-xs uppercase tracking-widest` primary buttons, `font-display text-2xl md:text-3xl` page headers, `eyebrow` class for field labels, `sonner`'s `toast.success`/`toast.error` after every Supabase call, `window.confirm(...)` before destructive deletes.
- New admin routes: add a `lazy()` import in `src/App.tsx`, a `<Route>` under the existing `/admin` tree, and a `NAV` entry in `src/pages/admin/AdminLayout.tsx`.
- New homepage sections: register in `src/cms/registry.ts`'s `SECTION_COMPONENTS`/`SECTION_META`/`SECTION_FIELDS`, add the type to `SectionType` in `src/cms/types.ts`. `section_type` is a plain `text` column — no schema migration needed to add a new type.
- Vault 26's own brand voice in all new copy — nothing from the reference project ("Studio Deny") carries over verbatim.
- Supabase CLI is linked to this project (`yevidhicrhyidrklflvn`) via `supabase/config.toml` and `supabase/.temp/linked-project.json`. Every `npx supabase db push` in this plan requires `SUPABASE_ACCESS_TOKEN` to be exported in the shell first (the project's Supabase personal access token) — do not hardcode this value anywhere in code, migrations, or commits.
- Migration verification uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env.local` (both public/client-safe values, already present) via a plain REST `curl` — never the service-role key for verification steps.

---

### Task 1: Sizes table migration

**Files:**
- Create: `supabase/migrations/20260902010000_sizes.sql`

**Interfaces:**
- Produces: table `public.sizes(id uuid, category_id uuid, label text, position integer, created_at timestamptz)`, unique on `(category_id, label)`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260902010000_sizes.sql
create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  label text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, label)
);

alter table public.sizes enable row level security;

create policy "sizes public read" on public.sizes
  for select using (true);

create policy "sizes admin write" on public.sizes
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
```

- [ ] **Step 2: Push the migration**

Run: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push --project-ref yevidhicrhyidrklflvn`
Expected: output lists `20260902010000_sizes.sql` as applied, no errors.

- [ ] **Step 3: Verify the table and RLS via REST**

Run (values from `.env.local`):
```bash
curl -s -o /dev/null -w "%{http_code}\n" "$VITE_SUPABASE_URL/rest/v1/sizes?limit=1" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```
Expected: `200` (public read works, table exists).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260902010000_sizes.sql
git commit -m "feat(db): add sizes table for category-scoped size lists"
```

---

### Task 2: Sizes admin page

**Files:**
- Create: `src/pages/admin/AdminSizes.tsx`
- Modify: `src/App.tsx` (add lazy import + route)
- Modify: `src/pages/admin/AdminLayout.tsx` (add NAV entry)

**Interfaces:**
- Consumes: `public.sizes` table (Task 1), `public.categories` table (existing: `id, name`).
- Produces: `/admin/sizes` route, importable default export `AdminSizes`.

- [ ] **Step 1: Write the admin page**

```tsx
// src/pages/admin/AdminSizes.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';

type Category = { id: string; name: string };
type Size = { id: string; category_id: string; label: string; position: number };

export default function AdminSizes() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [sizes, setSizes] = useState<Size[]>([]);
  const [editing, setEditing] = useState<Partial<Size> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('categories').select('id, name').order('name').then(({ data }) => {
      setCategories(data || []);
      if (data && data.length && !activeCategoryId) setActiveCategoryId(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSizes = async (categoryId: string) => {
    const { data } = await supabase
      .from('sizes')
      .select('*')
      .eq('category_id', categoryId)
      .order('position');
    setSizes((data as Size[]) || []);
  };

  useEffect(() => {
    if (activeCategoryId) loadSizes(activeCategoryId);
  }, [activeCategoryId]);

  const save = async () => {
    const label = editing?.label?.trim();
    if (!label) return toast.error('Label required');
    const dup = sizes.some(
      (s) => s.label.toLowerCase() === label.toLowerCase() && s.id !== editing?.id
    );
    if (dup) return toast.error('That size already exists in this category');
    setSaving(true);
    if (editing?.id) {
      const { error } = await supabase.from('sizes').update({ label }).eq('id', editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
    } else {
      const maxPos = sizes.reduce((m, s) => Math.max(m, s.position), -1);
      const { error } = await supabase
        .from('sizes')
        .insert({ category_id: activeCategoryId, label, position: maxPos + 1 });
      setSaving(false);
      if (error) return toast.error(error.message);
    }
    toast.success('Saved');
    setEditing(null);
    loadSizes(activeCategoryId);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this size?')) return;
    const { error } = await supabase.from('sizes').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    loadSizes(activeCategoryId);
  };

  const move = async (size: Size, dir: 'up' | 'down') => {
    const idx = sizes.findIndex((s) => s.id === size.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sizes.length) return;
    const swap = sizes[swapIdx];
    await Promise.all([
      supabase.from('sizes').update({ position: swap.position }).eq('id', size.id),
      supabase.from('sizes').update({ position: size.position }).eq('id', swap.id),
    ]);
    loadSizes(activeCategoryId);
  };

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Sizes</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Ordered size lists per category, used by the product editor's size picker.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategoryId(c.id)}
            className={`text-xs uppercase tracking-widest px-3 py-1.5 border ${
              activeCategoryId === c.id
                ? 'bg-foreground text-background border-foreground'
                : 'border-border hover:bg-secondary'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="border border-border max-w-md">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="eyebrow">Sizes</div>
          <button
            onClick={() => setEditing({ label: '' })}
            disabled={!activeCategoryId}
            className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {sizes.map((s, i) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-medium">{s.label}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => move(s, 'up')} disabled={i === 0} className="p-1.5 hover:bg-secondary disabled:opacity-30">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => move(s, 'down')} disabled={i === sizes.length - 1} className="p-1.5 hover:bg-secondary disabled:opacity-30">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-secondary">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(s.id)} className="p-1.5 hover:bg-secondary text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!sizes.length && (
              <tr>
                <td className="p-6 text-center text-muted-foreground text-xs">
                  No sizes yet for this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl">{editing.id ? 'Edit' : 'New'} Size</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Label
              <input
                value={editing.label || ''}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm"
                autoFocus
              />
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the route**

In `src/App.tsx`, add near the other admin lazy imports (after the `AdminCatalog` import):
```tsx
const AdminSizes = lazy(() => import("@/pages/admin/AdminSizes"));
```
Add a route inside the `/admin` `<Route>` tree, after `catalog`:
```tsx
<Route path="sizes" element={<AdminSizes />} />
```

- [ ] **Step 3: Add the NAV entry**

In `src/pages/admin/AdminLayout.tsx`, add `Ruler` to the `lucide-react` import list, and add this entry to `NAV` right after the `Catalog` entry:
```tsx
{ to: '/admin/sizes', icon: Ruler, label: 'Sizes' },
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, log in as the admin test account, go to `/admin/sizes`. Confirm: category chips render, switching category swaps the size list, "New" adds a size, duplicate labels within the same category are rejected (case-insensitive), reorder chevrons swap position and persist after a page refresh, delete removes a row after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminSizes.tsx src/App.tsx src/pages/admin/AdminLayout.tsx
git commit -m "feat(admin): add sizes admin page"
```

---

### Task 3: Wire sizes into the product variant editor

**Files:**
- Modify: `src/pages/admin/AdminProducts.tsx`

**Interfaces:**
- Consumes: `public.sizes` table (Task 1).

- [ ] **Step 1: Load sizes for the editing product's category**

Add state near the other `useState` declarations (after `const [categories, setCategories] = useState<any[]>([]);`):
```tsx
const [sizeOptions, setSizeOptions] = useState<{ label: string }[]>([]);
```

Add an effect that reloads size options whenever the editing product's category changes:
```tsx
useEffect(() => {
  if (!editing?.category_id) { setSizeOptions([]); return; }
  supabase
    .from('sizes')
    .select('label')
    .eq('category_id', editing.category_id)
    .order('position')
    .then(({ data }) => setSizeOptions(data || []));
}, [editing?.category_id]);
```

- [ ] **Step 2: Turn the free-text size input into a datalist-backed input**

This keeps the field a plain text input (zero risk to existing products with arbitrary size values already saved) while suggesting configured sizes for the product's category. Replace the existing Size field (currently at line 250):
```tsx
<Field label="Size"><input placeholder="Size" value={v.size} onChange={(e) => updateVariant(editing, setEditing, i, { size: e.target.value })} className={inputCls} /></Field>
```
with:
```tsx
<Field label="Size">
  <input
    placeholder="Size"
    list="size-options"
    value={v.size}
    onChange={(e) => updateVariant(editing, setEditing, i, { size: e.target.value })}
    className={inputCls}
  />
</Field>
```

Add the `<datalist>` once, right before the closing `</div>` of the variants section (after the `.map` block that renders `editing.variants`, still inside the same parent `<div>`):
```tsx
<datalist id="size-options">
  {sizeOptions.map((s) => (
    <option key={s.label} value={s.label} />
  ))}
</datalist>
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, go to `/admin/products`, edit a product whose category has configured sizes (from Task 2). Confirm: typing in the Size field shows a native browser autocomplete dropdown with the configured sizes; typing an arbitrary value not in the list is still accepted and saves correctly (no regression for existing free-text values).

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminProducts.tsx
git commit -m "feat(admin): suggest configured sizes in the variant size field"
```

---

### Task 4: Mega menu tables migration

**Files:**
- Create: `supabase/migrations/20260902020000_mega_menu.sql`

**Interfaces:**
- Produces: tables `public.mega_menu_categories`, `public.mega_menu_links`, `public.mega_menu_products`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260902020000_mega_menu.sql
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

alter table public.mega_menu_categories enable row level security;
alter table public.mega_menu_links enable row level security;
alter table public.mega_menu_products enable row level security;

create policy "mmc public read" on public.mega_menu_categories for select using (true);
create policy "mmc admin write" on public.mega_menu_categories for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "mml public read" on public.mega_menu_links for select using (true);
create policy "mml admin write" on public.mega_menu_links for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "mmp public read" on public.mega_menu_products for select using (true);
create policy "mmp admin write" on public.mega_menu_products for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
```

- [ ] **Step 2: Push and verify**

Run: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push --project-ref yevidhicrhyidrklflvn`
Verify:
```bash
curl -s -o /dev/null -w "%{http_code}\n" "$VITE_SUPABASE_URL/rest/v1/mega_menu_categories?limit=1" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```
Expected: `200`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260902020000_mega_menu.sql
git commit -m "feat(db): add mega menu backend tables"
```

---

### Task 5: Mega menu admin page

**Files:**
- Create: `src/pages/admin/AdminMegaMenu.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: `public.mega_menu_categories`, `public.mega_menu_links`, `public.mega_menu_products`, `public.categories`, `public.products`.

- [ ] **Step 1: Write the admin page**

```tsx
// src/pages/admin/AdminMegaMenu.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';

type Category = { id: string; name: string };
type MenuCategory = { id: string; category_id: string; position: number; is_active: boolean };
type MenuLink = { id: string; menu_category_id: string; category_id: string; position: number; is_active: boolean };
type Product = { slug: string; name: string };
type MenuProduct = { id: string; menu_category_id: string; product_slug: string; position: number };

export default function AdminMegaMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [links, setLinks] = useState<MenuLink[]>([]);
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  const load = async () => {
    const [{ data: cats }, { data: prods }, { data: mc }, { data: ml }, { data: mp }] = await Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('products').select('slug, name').eq('is_active', true).order('name'),
      supabase.from('mega_menu_categories').select('*').order('position'),
      supabase.from('mega_menu_links').select('*').order('position'),
      supabase.from('mega_menu_products').select('*').order('position'),
    ]);
    setCategories(cats || []);
    setProducts(prods || []);
    setMenuCategories((mc as MenuCategory[]) || []);
    setLinks((ml as MenuLink[]) || []);
    setMenuProducts((mp as MenuProduct[]) || []);
  };

  useEffect(() => { load(); }, []);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || '(deleted category)';
  const usedCategoryIds = new Set(menuCategories.map((m) => m.category_id));
  const availableForTab = categories.filter((c) => !usedCategoryIds.has(c.id));

  // ── Tabs (mega_menu_categories) ──────────────────────────────────────────
  const addTab = async (categoryId: string) => {
    const maxPos = menuCategories.reduce((m, c) => Math.max(m, c.position), -1);
    const { error } = await supabase
      .from('mega_menu_categories')
      .insert({ category_id: categoryId, position: maxPos + 1 });
    if (error) return toast.error(error.message);
    toast.success('Tab added');
    load();
  };

  const removeTab = async (id: string) => {
    if (!confirm('Remove this tab and all its sublinks/products?')) return;
    const { error } = await supabase.from('mega_menu_categories').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Tab removed');
    if (activeTabId === id) setActiveTabId('');
    load();
  };

  const moveTab = async (tab: MenuCategory, dir: 'up' | 'down') => {
    const idx = menuCategories.findIndex((t) => t.id === tab.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= menuCategories.length) return;
    const swap = menuCategories[swapIdx];
    await Promise.all([
      supabase.from('mega_menu_categories').update({ position: swap.position }).eq('id', tab.id),
      supabase.from('mega_menu_categories').update({ position: tab.position }).eq('id', swap.id),
    ]);
    load();
  };

  const toggleTabActive = async (tab: MenuCategory) => {
    await supabase.from('mega_menu_categories').update({ is_active: !tab.is_active }).eq('id', tab.id);
    load();
  };

  // ── Sublinks (mega_menu_links) ───────────────────────────────────────────
  const tabLinks = links.filter((l) => l.menu_category_id === activeTabId);
  const usedLinkCategoryIds = new Set(tabLinks.map((l) => l.category_id));
  const availableForLink = categories.filter((c) => !usedLinkCategoryIds.has(c.id));

  const addLink = async (categoryId: string) => {
    const maxPos = tabLinks.reduce((m, l) => Math.max(m, l.position), -1);
    const { error } = await supabase
      .from('mega_menu_links')
      .insert({ menu_category_id: activeTabId, category_id: categoryId, position: maxPos + 1 });
    if (error) return toast.error(error.message);
    load();
  };

  const removeLink = async (id: string) => {
    const { error } = await supabase.from('mega_menu_links').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  // ── Featured products (mega_menu_products, cap 2 per tab) ────────────────
  const tabProducts = menuProducts.filter((p) => p.menu_category_id === activeTabId);
  const usedProductSlugs = new Set(tabProducts.map((p) => p.product_slug));
  const availableForProduct = products.filter((p) => !usedProductSlugs.has(p.slug));

  const addProduct = async (slug: string) => {
    if (tabProducts.length >= 2) return toast.error('Maximum 2 featured products per tab');
    const maxPos = tabProducts.reduce((m, p) => Math.max(m, p.position), -1);
    const { error } = await supabase
      .from('mega_menu_products')
      .insert({ menu_category_id: activeTabId, product_slug: slug, position: maxPos + 1 });
    if (error) return toast.error(error.message);
    load();
  };

  const removeProduct = async (id: string) => {
    const { error } = await supabase.from('mega_menu_products').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Mega Menu</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Backend for the navbar mega menu — tabs, sublinks, and featured products. Not yet wired
        into the live navbar; changes here don't affect the storefront until that's done.
      </p>

      <div className="border border-border mb-6">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="eyebrow">Tabs</div>
          {availableForTab.length > 0 && (
            <select
              onChange={(e) => { if (e.target.value) addTab(e.target.value); e.target.value = ''; }}
              className="text-xs uppercase tracking-widest border border-border bg-transparent px-2 py-1"
              defaultValue=""
            >
              <option value="" disabled>+ Add tab</option>
              {availableForTab.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {menuCategories.map((tab, i) => (
              <tr
                key={tab.id}
                className={`border-t border-border cursor-pointer ${activeTabId === tab.id ? 'bg-secondary' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <td className="p-3 font-medium">{categoryName(tab.category_id)}</td>
                <td className="p-3 text-xs">{tab.is_active ? 'Active' : 'Hidden'}</td>
                <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => moveTab(tab, 'up')} disabled={i === 0} className="p-1.5 hover:bg-secondary disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => moveTab(tab, 'down')} disabled={i === menuCategories.length - 1} className="p-1.5 hover:bg-secondary disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button onClick={() => toggleTabActive(tab)} className="text-xs uppercase tracking-widest px-2 hover:text-accent">{tab.is_active ? 'Hide' : 'Show'}</button>
                  <button onClick={() => removeTab(tab.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {!menuCategories.length && (
              <tr><td colSpan={3} className="p-6 text-center text-muted-foreground text-xs">No tabs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {activeTabId && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-border">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <div className="eyebrow">Sublinks</div>
              {availableForLink.length > 0 && (
                <select
                  onChange={(e) => { if (e.target.value) addLink(e.target.value); e.target.value = ''; }}
                  className="text-xs uppercase tracking-widest border border-border bg-transparent px-2 py-1"
                  defaultValue=""
                >
                  <option value="" disabled>+ Add sublink</option>
                  {availableForLink.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            <ul>
              {tabLinks.map((l) => (
                <li key={l.id} className="flex items-center justify-between p-3 border-t border-border text-sm">
                  {categoryName(l.category_id)}
                  <button onClick={() => removeLink(l.id)} className="p-1.5 hover:bg-secondary text-destructive"><X className="h-4 w-4" /></button>
                </li>
              ))}
              {!tabLinks.length && <li className="p-6 text-center text-muted-foreground text-xs">No sublinks yet.</li>}
            </ul>
          </div>

          <div className="border border-border">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <div className="eyebrow">Featured Products (max 2)</div>
              {availableForProduct.length > 0 && tabProducts.length < 2 && (
                <select
                  onChange={(e) => { if (e.target.value) addProduct(e.target.value); e.target.value = ''; }}
                  className="text-xs uppercase tracking-widest border border-border bg-transparent px-2 py-1"
                  defaultValue=""
                >
                  <option value="" disabled>+ Add product</option>
                  {availableForProduct.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
            <ul>
              {tabProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between p-3 border-t border-border text-sm">
                  {products.find((pr) => pr.slug === p.product_slug)?.name || p.product_slug}
                  <button onClick={() => removeProduct(p.id)} className="p-1.5 hover:bg-secondary text-destructive"><X className="h-4 w-4" /></button>
                </li>
              ))}
              {!tabProducts.length && <li className="p-6 text-center text-muted-foreground text-xs">No featured products yet.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the route**

In `src/App.tsx`, after the `AdminSizes` lazy import:
```tsx
const AdminMegaMenu = lazy(() => import("@/pages/admin/AdminMegaMenu"));
```
After the `sizes` route:
```tsx
<Route path="mega-menu" element={<AdminMegaMenu />} />
```

- [ ] **Step 3: Add the NAV entry**

In `src/pages/admin/AdminLayout.tsx`, add `Navigation` to the `lucide-react` import list (or reuse `Globe` if a distinct icon isn't important — use `Navigation` for clarity), and add after the Sizes entry:
```tsx
{ to: '/admin/mega-menu', icon: Navigation, label: 'Mega Menu' },
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, go to `/admin/mega-menu`. Confirm: adding a tab removes that category from the "add tab" dropdown; clicking a tab shows its sublinks/products panels; adding a 3rd featured product is blocked with a toast; reorder chevrons persist after refresh; removing a tab removes its sublinks/products too (cascade).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminMegaMenu.tsx src/App.tsx src/pages/admin/AdminLayout.tsx
git commit -m "feat(admin): add mega menu backend admin page"
```

---

### Task 6: Shared Cloudinary upload hook (bug fix + consolidation)

**Files:**
- Create: `src/lib/useCloudinaryUpload.ts`
- Modify: `src/pages/admin/AdminCMS.tsx`
- Modify: `src/pages/admin/AdminProducts.tsx`

**Interfaces:**
- Produces: `useCloudinaryUpload()` hook returning `{ upload(file: File, opts?: { resourceType?: 'image' | 'video'; folder?: string }): Promise<string>, uploading: boolean, progress: number }`.

- [ ] **Step 1: Write the hook**

```ts
// src/lib/useCloudinaryUpload.ts
import { useState, useCallback } from 'react';

type UploadOpts = {
  resourceType?: 'image' | 'video';
  folder?: string;
};

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback((file: File, opts: UploadOpts = {}): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
    const resourceType = opts.resourceType || 'image';

    setUploading(true);
    setProgress(0);

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      if (opts.folder) formData.append('folder', opts.folder);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url as string);
        } else {
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        reject(new Error('Upload failed'));
      };

      xhr.send(formData);
    });
  }, []);

  return { upload, uploading, progress };
}
```

- [ ] **Step 2: Fix `AdminCMS.tsx`'s broken upload (wrong cloud/preset)**

Read the current `uploadMedia` function (around line 302) before editing, to preserve its `media_assets` insert logic. Replace only the upload mechanics — the hardcoded `fd.append('upload_preset', 'vault26_unsigned')` and hardcoded `https://api.cloudinary.com/v1_1/dsqeawg67/image/upload` URL — with a call to `useCloudinaryUpload()`'s `upload()`, keeping the existing `media_assets` insert that follows it unchanged. Add the import:
```tsx
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';
```
Add the hook call near the other state declarations:
```tsx
const { upload: uploadToCloudinary } = useCloudinaryUpload();
```
In `uploadMedia`, replace the manual `fetch`/`FormData` block with:
```ts
const secureUrl = await uploadToCloudinary(file, { folder: 'vault26/cms' });
```
then continue using `secureUrl` wherever the old code used the fetched `data.secure_url`.

- [ ] **Step 3: Fix `AdminProducts.tsx`'s duplicated inline upload**

In `uploadImage` (around line 70), replace the manual `FormData`/`fetch` block with the same hook:
```tsx
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';
// ...
const { upload: uploadToCloudinary } = useCloudinaryUpload();
// ...
const uploadImage = async (file: File) => {
  if (!editing) return;
  setUploading(true);
  try {
    const secureUrl = await uploadToCloudinary(file, { folder: 'vault26/products' });
    setEditing((prev) => prev ? { ...prev, images: [...prev.images, secureUrl] } : prev);
  } catch (e: any) {
    toast.error(e.message || 'Image upload failed');
  } finally {
    setUploading(false);
  }
};
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`. In `/admin/products`, upload a new product image — confirm it appears and the URL is on the `dnnfpvtwr` cloud (check the network tab or the resulting URL). In `/admin/cms` → Media tab, upload a file — confirm it now succeeds (previously may have silently failed against the wrong cloud/preset) and a `media_assets` row is created.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useCloudinaryUpload.ts src/pages/admin/AdminCMS.tsx src/pages/admin/AdminProducts.tsx
git commit -m "fix(admin): consolidate Cloudinary uploads into one hook, fix wrong cloud/preset in CMS uploads"
```

---

### Task 7: Preloader settings migration

**Files:**
- Create: `supabase/migrations/20260902030000_preloader_settings.sql`

**Interfaces:**
- Produces: singleton table `public.preloader_settings`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260902030000_preloader_settings.sql
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
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create trigger preloader_touch before update on public.preloader_settings
  for each row execute function public.touch_updated_at();

insert into public.preloader_settings (content_text) values ('26');
```

- [ ] **Step 2: Push and verify**

Run: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push --project-ref yevidhicrhyidrklflvn`
Verify:
```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/preloader_settings?limit=1" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```
Expected: a JSON array with one row, `content_text: "26"`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260902030000_preloader_settings.sql
git commit -m "feat(db): add preloader_settings singleton table"
```

---

### Task 8: Preloader settings admin tab + component rewire

**Files:**
- Modify: `src/pages/admin/AdminCMS.tsx`
- Modify: `src/components/shared/Preloader.tsx`

**Interfaces:**
- Consumes: `public.preloader_settings` (Task 7).
- Produces: `<Preloader onComplete={...} />` unchanged prop signature (no caller changes needed — `src/App.tsx:99` stays as-is).

- [ ] **Step 1: Add Preloader state, load, and save to `AdminCMS.tsx`**

Near the other tab state declarations (after the Brand tab block), add:
```tsx
// Preloader tab
const [preloader, setPreloader] = useState<Record<string, any>>({});
const [preloaderId, setPreloaderId] = useState<string | null>(null);
```

In the `useEffect` that loads theme/brand/media (the one with `supabase.from('theme_settings')...`), add:
```tsx
supabase.from('preloader_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
  if (data) { setPreloader(data as any); setPreloaderId((data as any).id); }
});
```

Add a save function next to `saveBrand`:
```tsx
const savePreloader = async () => {
  const { id: _id, ...rest } = preloader as any;
  if (preloaderId) {
    await supabase.from('preloader_settings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', preloaderId);
  } else {
    await supabase.from('preloader_settings').insert(rest);
  }
  toast.success('Preloader settings saved');
};
```

- [ ] **Step 2: Add the tab trigger and content**

In the `TabsList` (around line 358), add after `<TabsTrigger value="brand">Brand</TabsTrigger>`:
```tsx
<TabsTrigger value="preloader">Preloader</TabsTrigger>
```

Add a `<TabsContent value="preloader">` block, modeled on the existing Brand tab's structure (find it via `<TabsContent value="brand">` and match its form-field layout exactly — labeled inputs, a Save button at the bottom calling `saveBrand`). Preloader's version:
```tsx
<TabsContent value="preloader" className="space-y-6 max-w-2xl">
  <div>
    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Background type</label>
    <select
      value={preloader.bg_type || 'color'}
      onChange={(e) => setPreloader({ ...preloader, bg_type: e.target.value })}
      className="w-full border border-border bg-transparent px-3 py-2 text-sm"
    >
      <option value="color">Solid color</option>
      <option value="image">Image</option>
      <option value="video">Video</option>
    </select>
  </div>
  {preloader.bg_type === 'image' && (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Background image URL</label>
      <input value={preloader.bg_image_url || ''} onChange={(e) => setPreloader({ ...preloader, bg_image_url: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm" />
    </div>
  )}
  {preloader.bg_type === 'video' && (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Background video URL</label>
      <input value={preloader.bg_video_url || ''} onChange={(e) => setPreloader({ ...preloader, bg_video_url: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm" />
    </div>
  )}
  <div>
    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Content type</label>
    <select
      value={preloader.content_type || 'text'}
      onChange={(e) => setPreloader({ ...preloader, content_type: e.target.value })}
      className="w-full border border-border bg-transparent px-3 py-2 text-sm"
    >
      <option value="text">Text</option>
      <option value="image">Image</option>
    </select>
  </div>
  {preloader.content_type === 'text' ? (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Content text</label>
      <input value={preloader.content_text || ''} onChange={(e) => setPreloader({ ...preloader, content_text: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm" />
    </div>
  ) : (
    <div>
      <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Content image URL</label>
      <input value={preloader.content_image_url || ''} onChange={(e) => setPreloader({ ...preloader, content_image_url: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2 text-sm" />
    </div>
  )}
  <div>
    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Text color</label>
    <input type="color" value={preloader.text_color || '#000000'} onChange={(e) => setPreloader({ ...preloader, text_color: e.target.value })} className="h-10 w-24 border border-border" />
  </div>
  <div>
    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Duration (ms)</label>
    <input type="number" value={preloader.duration_ms ?? 1000} onChange={(e) => setPreloader({ ...preloader, duration_ms: Number(e.target.value) })} className="w-full border border-border bg-transparent px-3 py-2 text-sm" />
  </div>
  <button onClick={savePreloader} className="bg-foreground text-background py-2 px-6 text-xs uppercase tracking-widest">Save</button>
</TabsContent>
```

- [ ] **Step 3: Rewire `Preloader.tsx` to read the settings**

Read the full current file first (already read above — the exit animation block starting `exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)', ... }}` must be preserved exactly). Replace the component with:
```tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface PreloaderProps {
  onComplete: () => void;
}

type Settings = {
  bg_type: 'color' | 'image' | 'video';
  bg_image_url: string | null;
  bg_video_url: string | null;
  content_type: 'text' | 'image';
  content_image_url: string | null;
  content_text: string;
  text_color: string;
  duration_ms: number;
};

const DEFAULTS: Settings = {
  bg_type: 'color',
  bg_image_url: null,
  bg_video_url: null,
  content_type: 'text',
  content_image_url: null,
  content_text: '26',
  text_color: '#000000',
  duration_ms: 1000,
};

export default function Preloader({ onComplete }: PreloaderProps) {
  const [isDone, setIsDone] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    supabase.from('preloader_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setSettings({ ...DEFAULTS, ...(data as any) });
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDone(true);
      setTimeout(onComplete, 400);
    }, settings.duration_ms);
    return () => clearTimeout(timer);
  }, [onComplete, settings.duration_ms]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.1,
            filter: 'blur(20px)',
            transition: { duration: 1, ease: [0.7, 0, 0.3, 1] }
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: settings.bg_type === 'color' ? '#ffffff' : undefined }}
        >
          {settings.bg_type === 'image' && settings.bg_image_url && (
            <img src={settings.bg_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {settings.bg_type === 'video' && settings.bg_video_url && (
            <video src={settings.bg_video_url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
          )}

          {settings.content_type === 'text' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.03 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            >
              <h2
                className="text-[80vw] font-bold"
                style={{ fontFamily: 'Playfair Display, serif', color: settings.text_color }}
              >
                {settings.content_text}
              </h2>
            </motion.div>
          ) : (
            settings.content_image_url && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                src={settings.content_image_url}
                alt=""
                className="relative max-w-[60vw] max-h-[40vh] object-contain"
              />
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`. Load `/` fresh (hard reload) — confirm the preloader still shows the "26" watermark by default (unchanged behavior). In `/admin/cms` → Preloader tab, change content text to something else and duration to 2000, save, hard-reload the homepage — confirm the new text and longer duration take effect.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminCMS.tsx src/components/shared/Preloader.tsx
git commit -m "feat(admin): make the preloader admin-configurable"
```

---

### Task 9: Lookbook slides migration

**Files:**
- Create: `supabase/migrations/20260902040000_lookbook_slides.sql`

**Interfaces:**
- Produces: table `public.lookbook_slides`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260902040000_lookbook_slides.sql
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
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
```

- [ ] **Step 2: Push and verify**

Run: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push --project-ref yevidhicrhyidrklflvn`
Verify:
```bash
curl -s -o /dev/null -w "%{http_code}\n" "$VITE_SUPABASE_URL/rest/v1/lookbook_slides?limit=1" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```
Expected: `200`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260902040000_lookbook_slides.sql
git commit -m "feat(db): add lookbook_slides table"
```

---

### Task 10: Lookbook admin page

**Files:**
- Create: `src/pages/admin/AdminLookbook.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: `public.lookbook_slides` (Task 9), `public.products` (`slug, name`), `useCloudinaryUpload()` (Task 6).

- [ ] **Step 1: Write the admin page**

```tsx
// src/pages/admin/AdminLookbook.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, Upload } from 'lucide-react';
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';

type Slide = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  product_slug: string | null;
  is_active: boolean;
  position: number;
};
type Product = { slug: string; name: string };

export default function AdminLookbook() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Slide> | null>(null);
  const [saving, setSaving] = useState(false);
  const { upload, uploading } = useCloudinaryUpload();

  const load = async () => {
    const { data } = await supabase.from('lookbook_slides').select('*').order('position');
    setSlides((data as Slide[]) || []);
  };

  useEffect(() => {
    load();
    supabase.from('products').select('slug, name').eq('is_active', true).order('name').then(({ data }) => setProducts(data || []));
  }, []);

  const save = async () => {
    if (!editing?.image_url) return toast.error('Media is required');
    if (!editing?.product_slug) return toast.error('Linked product is required');
    setSaving(true);
    const payload = {
      image_url: editing.image_url,
      media_type: editing.media_type || 'image',
      caption: editing.caption || null,
      product_slug: editing.product_slug,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from('lookbook_slides').update(payload).eq('id', editing.id)
      : await supabase.from('lookbook_slides').insert({ ...payload, position: slides.length });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Saved');
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    const { error } = await supabase.from('lookbook_slides').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const move = async (slide: Slide, dir: 'up' | 'down') => {
    const idx = slides.findIndex((s) => s.id === slide.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= slides.length) return;
    const swap = slides[swapIdx];
    await Promise.all([
      supabase.from('lookbook_slides').update({ position: swap.position }).eq('id', slide.id),
      supabase.from('lookbook_slides').update({ position: slide.position }).eq('id', swap.id),
    ]);
    load();
  };

  const handleFile = async (file: File) => {
    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const url = await upload(file, { resourceType: mediaType, folder: 'vault26/lookbook' });
      setEditing((prev) => ({ ...prev, image_url: url, media_type: mediaType }));
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Lookbook</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Photo/video slides shown on the homepage lookbook section and the full /lookbook page.
      </p>

      <div className="border border-border max-w-2xl">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="eyebrow">Slides</div>
          <button onClick={() => setEditing({ media_type: 'image', is_active: true })} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {slides.map((s, i) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3">
                  {s.media_type === 'video' ? (
                    <video src={s.image_url} className="h-14 w-14 object-cover" />
                  ) : (
                    <img src={s.image_url} className="h-14 w-14 object-cover" alt="" />
                  )}
                </td>
                <td className="p-3 text-muted-foreground">{s.product_slug}</td>
                <td className="p-3 text-xs">{s.is_active ? 'Active' : 'Hidden'}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => move(s, 'up')} disabled={i === 0} className="p-1.5 hover:bg-secondary disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => move(s, 'down')} disabled={i === slides.length - 1} className="p-1.5 hover:bg-secondary disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button onClick={() => setEditing(s)} className="p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(s.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {!slides.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground text-xs">No slides yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl">{editing.id ? 'Edit' : 'New'} Slide</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>

            <label className="border border-dashed border-border flex flex-col items-center justify-center gap-2 p-6 cursor-pointer text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
              {editing.image_url ? (
                editing.media_type === 'video' ? (
                  <video src={editing.image_url} className="h-24 object-cover" />
                ) : (
                  <img src={editing.image_url} className="h-24 object-cover" alt="" />
                )
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {uploading ? 'Uploading…' : 'Upload image or video'}
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>

            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Linked product
              <select
                value={editing.product_slug || ''}
                onChange={(e) => setEditing({ ...editing, product_slug: e.target.value })}
                className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm"
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Caption
              <textarea
                value={editing.caption || ''}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                rows={2}
                className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
            </label>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the route**

In `src/App.tsx`:
```tsx
const AdminLookbook = lazy(() => import("@/pages/admin/AdminLookbook"));
```
```tsx
<Route path="lookbook" element={<AdminLookbook />} />
```

- [ ] **Step 3: Add the NAV entry**

In `AdminLayout.tsx`, add `Image` to the lucide import list and:
```tsx
{ to: '/admin/lookbook', icon: Image, label: 'Lookbook' },
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, go to `/admin/lookbook`. Confirm: uploading an image works and shows a thumbnail, saving without a linked product is blocked with a toast, reorder chevrons persist, deleting removes a row.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminLookbook.tsx src/App.tsx src/pages/admin/AdminLayout.tsx
git commit -m "feat(admin): add lookbook slides admin page"
```

---

### Task 11: Rewire LookbookSection.tsx to render real slides

**Files:**
- Modify: `src/cms/sections/LookbookSection.tsx`
- Modify: `src/cms/types.ts` (`LookbookConfig`)
- Modify: `tests/e2e/cms.spec.ts`
- Seed data: added via a one-off insert in this task (not a new migration file — reuses Task 9's table)

**Interfaces:**
- Consumes: `public.lookbook_slides` (Task 9).

- [ ] **Step 1: Seed one slide for e2e coverage**

Run once against the live project (values are illustrative — use a real existing product slug from `products`):
```bash
curl -s -X POST "$VITE_SUPABASE_URL/rest/v1/lookbook_slides" \
  -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"image_url":"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1200","media_type":"image","caption":"Vault 26 Editorial","product_slug":"<a real product slug>","position":0}'
```
This will fail with an RLS error using the publishable key (write requires admin) — instead run this insert from `/admin/lookbook`'s UI once Task 10 is deployed, or via the Supabase SQL Editor as the project owner. Confirm afterward with:
```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/lookbook_slides?limit=1" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```
Expected: one row back.

- [ ] **Step 2: Update `LookbookConfig` to match reality**

In `src/cms/types.ts`, replace:
```ts
export interface LookbookConfig {
  heading: string;
  images: string[];
}
```
with:
```ts
export interface LookbookConfig {
  heading?: string;
  subtitle?: string;
}
```

- [ ] **Step 3: Rewrite the component**

Replace the full contents of `src/cms/sections/LookbookSection.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection } from '../types';

type Slide = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  product_slug: string | null;
};

export default function LookbookSection({ section, isPage = false }: { section?: CMSSection; isPage?: boolean }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const heading = section?.config?.heading || 'VAULT 26 JOURNAL';
  const subtitle = section?.config?.subtitle || 'EDITORIAL & LOOKBOOK';

  useEffect(() => {
    supabase
      .from('lookbook_slides')
      .select('id, image_url, media_type, caption, product_slug')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setSlides((data as Slide[]) || []));
  }, []);

  if (!slides.length) return null;

  return (
    <section className="py-12 md:py-20 bg-white text-black font-sans w-full border-t border-black/10">
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-10 md:mb-14 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/10 pb-6">
          <div>
            <span className="text-xs font-mono font-bold tracking-[0.2em] text-black/50 uppercase block mb-1">
              {subtitle}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-primary font-bold uppercase tracking-tight text-black leading-none">
              {heading}
            </h2>
          </div>
          {!isPage && (
            <Link
              to="/lookbook"
              className="text-xs font-bold tracking-[0.2em] uppercase text-black border-b-2 border-black pb-1 hover:text-black/60 hover:border-black/60 transition-colors inline-block w-fit"
            >
              EXPLORE ALL →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {slides.map((slide, i) => (
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.05 }}
              className="group"
            >
              <Link
                to={slide.product_slug ? `/products/${slide.product_slug}` : '/lookbook'}
                className="block"
              >
                <div className="aspect-[3/4] bg-[#F2F2F2] overflow-hidden mb-3">
                  {slide.media_type === 'video' ? (
                    <video
                      src={slide.image_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={slide.image_url}
                      alt={slide.caption || ''}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  )}
                </div>
                {slide.caption && (
                  <p className="text-xs sm:text-sm text-black/70 leading-relaxed">{slide.caption}</p>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add e2e coverage**

In `tests/e2e/cms.spec.ts`, add a new test in the existing `describe` block:
```ts
test('Lookbook: renders real slides from lookbook_slides, not hardcoded mock content', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  const body = await page.textContent('body');
  // The old hardcoded mock content must be gone
  expect(body).not.toContain('BRUTALISMUS 3000');
  expect(body).not.toContain('Hideo Kojima');
});
```

- [ ] **Step 5: Run the e2e test**

Run: `npm run test:e2e -- cms.spec.ts` (check the actual script name in `package.json` if this differs — it should invoke `playwright test tests/e2e/cms.spec.ts`)
Expected: the new test passes; re-run the full `cms.spec.ts` file to confirm no other test in it broke (the original "Homepage loads all 10 CMS sections" test's `expect(body).toContain('Lookbook')` assertion should still pass since the section still renders "EXPLORE ALL" text near a "Lookbook"-labeled section — verify manually if the exact string it checks for still appears; adjust that pre-existing assertion if needed since this task intentionally changes this section's rendered text).

- [ ] **Step 6: Commit**

```bash
git add src/cms/sections/LookbookSection.tsx src/cms/types.ts tests/e2e/cms.spec.ts
git commit -m "feat(cms): render real lookbook_slides instead of hardcoded mock content"
```

---

### Task 12: Community photos migration

**Files:**
- Create: `supabase/migrations/20260902050000_community_photos.sql`

**Interfaces:**
- Produces: table `public.community_photos`, one seeded `website_sections` row (`section_type = 'community'`).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260902050000_community_photos.sql
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

alter table public.community_photos enable row level security;

create policy "community_photos public read" on public.community_photos for select using (true);
create policy "community_photos admin write" on public.community_photos for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Seed one row + one website_sections row so the section has real content and
-- shows up in the admin's "Pages" tab without a manual step.
insert into public.community_photos (image_url, handle, bento_size, position)
values ('https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=800', '@vault26', 'md', 0);

insert into public.website_sections (page_slug, section_type, label, config, position, is_visible, is_locked)
select 'home', 'community', 'Community', '{}'::jsonb,
  coalesce((select max(position) from public.website_sections where page_slug = 'home'), 0) + 10,
  true, false
where not exists (
  select 1 from public.website_sections where page_slug = 'home' and section_type = 'community'
);
```

- [ ] **Step 2: Push and verify**

Run: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push --project-ref yevidhicrhyidrklflvn`
Verify:
```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/community_photos?limit=1" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```
Expected: one seeded row.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260902050000_community_photos.sql
git commit -m "feat(db): add community_photos table + seeded community section"
```

---

### Task 13: Community section component + registry wiring

**Files:**
- Create: `src/cms/sections/CommunitySection.tsx`
- Modify: `src/cms/registry.ts`
- Modify: `src/cms/types.ts`
- Modify: `tests/e2e/cms.spec.ts`

**Interfaces:**
- Consumes: `public.community_photos` (Task 12).
- Produces: `SECTION_COMPONENTS.community`, importable default export `CommunitySection`.

- [ ] **Step 1: Write the failing e2e test first**

In `tests/e2e/cms.spec.ts`, add:
```ts
test('Community section renders seeded photos', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  const body = await page.textContent('body');
  expect(body).toContain('@vault26');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test:e2e -- cms.spec.ts`
Expected: FAIL — "@vault26" not found (the section doesn't exist yet).

- [ ] **Step 3: Add the type**

In `src/cms/types.ts`, extend `SectionType`:
```ts
export type SectionType =
  | 'hero' | 'cinematic_hero' | 'category_bar' | 'campaign_carousel' | 'best_sellers' | 'text_reveal' | 'editorial_split' | 'bento_grid'
  | 'new_arrivals' | 'category_grid' | 'marquee' | 'testimonials' | 'flagship_stores'
  | 'lookbook' | 'newsletter' | 'promo_banner' | 'faq' | 'linen_collection' | 'instagram_reels'
  | 'community' | 'influencer_picks';
```
Add a config shape near the other config interfaces:
```ts
export interface CommunityConfig {
  heading?: string;
  subtitle?: string;
}
```

- [ ] **Step 4: Write the component**

```tsx
// src/cms/sections/CommunitySection.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection } from '../types';

type Photo = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  handle: string | null;
  bento_size: 'sm' | 'md' | 'lg' | 'wide' | 'tall';
};

const SPAN: Record<Photo['bento_size'], string> = {
  sm: 'col-span-1 row-span-1',
  md: 'col-span-1 row-span-2',
  lg: 'col-span-2 row-span-2',
  wide: 'col-span-2 row-span-1',
  tall: 'col-span-1 row-span-3',
};

export default function CommunitySection({ section }: { section?: CMSSection }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const heading = section?.config?.heading || 'WORN BY VAULT 26';
  const subtitle = section?.config?.subtitle || 'FROM THE COMMUNITY';

  useEffect(() => {
    supabase
      .from('community_photos')
      .select('id, image_url, media_type, handle, bento_size')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setPhotos((data as Photo[]) || []));
  }, []);

  if (!photos.length) return null;

  return (
    <section className="py-12 md:py-20 bg-white text-black w-full border-t border-black/10">
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-10 md:mb-14 border-b border-black/10 pb-6">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-black/50 uppercase block mb-1">
            {subtitle}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-primary font-bold uppercase tracking-tight text-black leading-none">
            {heading}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[140px] md:auto-rows-[180px] gap-3 md:gap-4">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 6) * 0.05 }}
              className={`relative overflow-hidden bg-[#F2F2F2] group ${SPAN[photo.bento_size]}`}
            >
              {photo.media_type === 'video' ? (
                <video src={photo.image_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={photo.image_url} alt={photo.handle || ''} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              )}
              {photo.handle && (
                <span className="absolute bottom-2 left-2 text-xs font-mono uppercase tracking-widest text-white bg-black/50 px-2 py-1">
                  {photo.handle}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Register in `src/cms/registry.ts`**

Add to `SECTION_COMPONENTS`:
```ts
community: lazy(() => import('./sections/CommunitySection')),
```
Add to `SECTION_META`:
```ts
community: { label: 'Community', description: 'Bento-grid gallery of community/customer photos' },
```
Add to `SECTION_FIELDS`:
```ts
community: [
  { key: 'heading', label: 'Heading', type: 'text', placeholder: 'WORN BY VAULT 26' },
  { key: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'FROM THE COMMUNITY' },
],
```

- [ ] **Step 6: Run the e2e test to confirm it passes**

Run: `npm run test:e2e -- cms.spec.ts`
Expected: the "Community section renders seeded photos" test now passes.

- [ ] **Step 7: Commit**

```bash
git add src/cms/sections/CommunitySection.tsx src/cms/registry.ts src/cms/types.ts tests/e2e/cms.spec.ts
git commit -m "feat(cms): add community photos homepage section"
```

---

### Task 14: Community admin page

**Files:**
- Create: `src/pages/admin/AdminCommunity.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: `public.community_photos` (Task 12), `useCloudinaryUpload()` (Task 6).

- [ ] **Step 1: Write the admin page**

Every field saves individually on change — no page-level Save button, matching the simplest CMS page shape in the reference project.

```tsx
// src/pages/admin/AdminCommunity.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';

type Photo = {
  id: string;
  image_url: string;
  media_type: 'image' | 'video';
  handle: string | null;
  bento_size: 'sm' | 'md' | 'lg' | 'wide' | 'tall';
  is_active: boolean;
  position: number;
};

const SIZES: Photo['bento_size'][] = ['sm', 'md', 'lg', 'wide', 'tall'];

export default function AdminCommunity() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const { upload, uploading } = useCloudinaryUpload();

  const load = async () => {
    const { data } = await supabase.from('community_photos').select('*').order('position');
    setPhotos((data as Photo[]) || []);
  };

  useEffect(() => { load(); }, []);

  const addBlank = async () => {
    const { error } = await supabase.from('community_photos').insert({
      image_url: '', handle: '', bento_size: 'md', position: photos.length,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const patch = async (id: string, fields: Partial<Photo>) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)));
    const { error } = await supabase.from('community_photos').update(fields).eq('id', id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this photo?')) return;
    const { error } = await supabase.from('community_photos').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const handleFile = async (id: string, file: File) => {
    try {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const url = await upload(file, { resourceType: mediaType, folder: 'vault26/community' });
      patch(id, { image_url: url, media_type: mediaType });
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl md:text-3xl">Community</h1>
        <button onClick={addBlank} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent">
          <Plus className="h-3 w-3" /> New
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Photos/videos shown in the homepage "Worn By Vault 26" bento grid. Every field saves
        immediately as you change it.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((p) => (
          <div key={p.id} className="border border-border p-4 space-y-3">
            <label className="border border-dashed border-border flex items-center justify-center h-40 cursor-pointer relative overflow-hidden">
              {p.image_url ? (
                p.media_type === 'video' ? (
                  <video src={p.image_url} className="w-full h-full object-cover" />
                ) : (
                  <img src={p.image_url} className="w-full h-full object-cover" alt="" />
                )
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(p.id, f); }} />
            </label>
            <input
              placeholder="@handle"
              value={p.handle || ''}
              onChange={(e) => patch(p.id, { handle: e.target.value })}
              className="w-full border border-border bg-transparent px-3 py-2 text-sm"
            />
            <select
              value={p.bento_size}
              onChange={(e) => patch(p.id, { bento_size: e.target.value as Photo['bento_size'] })}
              className="w-full border border-border bg-transparent px-3 py-2 text-sm"
            >
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={p.is_active} onChange={(e) => patch(p.id, { is_active: e.target.checked })} /> Active
              </label>
              <button onClick={() => remove(p.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {!photos.length && <p className="text-sm text-muted-foreground">No photos yet — click New to add one.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Wire the route**

In `src/App.tsx`:
```tsx
const AdminCommunity = lazy(() => import("@/pages/admin/AdminCommunity"));
```
```tsx
<Route path="community" element={<AdminCommunity />} />
```

- [ ] **Step 3: Add the NAV entry**

In `AdminLayout.tsx`, add `Users2` (or another distinct lucide icon not already used) and:
```tsx
{ to: '/admin/community', icon: Users2, label: 'Community' },
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, go to `/admin/community`. Confirm: New adds a blank card, uploading a file fills it in immediately, changing bento size / handle / active saves without a page reload, delete removes a card after confirming, and the homepage's Community section (Task 13) reflects changes after a refresh.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminCommunity.tsx src/App.tsx src/pages/admin/AdminLayout.tsx
git commit -m "feat(admin): add community photos admin page"
```

---

### Task 15: Influencer picks migration

**Files:**
- Create: `supabase/migrations/20260902060000_influencer_picks.sql`

**Interfaces:**
- Produces: tables `public.influencer_picks`, `public.influencer_pick_products`, one seeded `website_sections` row (`section_type = 'influencer_picks'`).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260902060000_influencer_picks.sql
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

alter table public.influencer_picks enable row level security;
alter table public.influencer_pick_products enable row level security;

create policy "influencer_picks public read" on public.influencer_picks for select using (true);
create policy "influencer_picks admin write" on public.influencer_picks for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "influencer_pick_products public read" on public.influencer_pick_products for select using (true);
create policy "influencer_pick_products admin write" on public.influencer_pick_products for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.influencer_picks (name, handle, video_source, link_url, thumbnail_url, quote, position)
values (
  'Vault 26 Style Edit', '@vault26',
  'link', 'https://www.instagram.com/vault26ofc/',
  'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&q=80&w=800',
  'Effortless, minimal, made in India.',
  0
);

insert into public.website_sections (page_slug, section_type, label, config, position, is_visible, is_locked)
select 'home', 'influencer_picks', 'Influencer Picks', '{}'::jsonb,
  coalesce((select max(position) from public.website_sections where page_slug = 'home'), 0) + 10,
  true, false
where not exists (
  select 1 from public.website_sections where page_slug = 'home' and section_type = 'influencer_picks'
);
```

- [ ] **Step 2: Push and verify**

Run: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push --project-ref yevidhicrhyidrklflvn`
Verify:
```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/influencer_picks?limit=1" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```
Expected: one seeded row, `handle: "@vault26"`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260902060000_influencer_picks.sql
git commit -m "feat(db): add influencer_picks tables + seeded section"
```

---

### Task 16: Influencer picks section component + registry wiring

**Files:**
- Create: `src/cms/sections/InfluencerPicksSection.tsx`
- Modify: `src/cms/registry.ts`
- Modify: `src/cms/types.ts`
- Modify: `tests/e2e/cms.spec.ts`

**Interfaces:**
- Consumes: `public.influencer_picks`, `public.influencer_pick_products` (Task 15).
- Produces: `SECTION_COMPONENTS.influencer_picks`, importable default export `InfluencerPicksSection`.

- [ ] **Step 1: Write the failing e2e test first**

In `tests/e2e/cms.spec.ts`:
```ts
test('Influencer picks section renders seeded content', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  const body = await page.textContent('body');
  expect(body).toContain('Effortless, minimal, made in India.');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm run test:e2e -- cms.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Add the config type**

In `src/cms/types.ts`:
```ts
export interface InfluencerPicksConfig {
  heading?: string;
  subtitle?: string;
}
```

- [ ] **Step 4: Write the component**

```tsx
// src/cms/sections/InfluencerPicksSection.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { CMSSection } from '../types';

type Pick = {
  id: string;
  name: string;
  handle: string | null;
  video_source: 'upload' | 'link';
  video_url: string | null;
  link_url: string | null;
  thumbnail_url: string | null;
  thumbnail_type: 'image' | 'video';
  quote: string | null;
};

export default function InfluencerPicksSection({ section }: { section?: CMSSection }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const heading = section?.config?.heading || 'STYLED BY';
  const subtitle = section?.config?.subtitle || 'INFLUENCER PICKS';

  useEffect(() => {
    supabase
      .from('influencer_picks')
      .select('id, name, handle, video_source, video_url, link_url, thumbnail_url, thumbnail_type, quote')
      .eq('is_active', true)
      .order('position')
      .then(({ data }) => setPicks((data as Pick[]) || []));
  }, []);

  if (!picks.length) return null;

  return (
    <section className="py-12 md:py-20 bg-white text-black w-full border-t border-black/10">
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-10 md:mb-14 border-b border-black/10 pb-6">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-black/50 uppercase block mb-1">
            {subtitle}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-primary font-bold uppercase tracking-tight text-black leading-none">
            {heading}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {picks.map((pick, i) => {
            const content = (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: (i % 4) * 0.08 }}
                className="group cursor-pointer"
              >
                <div className="aspect-[3/4] bg-[#F2F2F2] overflow-hidden mb-3 relative">
                  {pick.video_source === 'upload' && pick.video_url ? (
                    <video
                      src={pick.video_url}
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                      poster={pick.thumbnail_url || undefined}
                      className="w-full h-full object-cover"
                    />
                  ) : pick.thumbnail_type === 'video' && pick.thumbnail_url ? (
                    <video src={pick.thumbnail_url} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                  ) : (
                    <img src={pick.thumbnail_url || ''} alt={pick.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  )}
                </div>
                <h3 className="text-sm font-primary font-bold uppercase tracking-tight text-black leading-snug">
                  {pick.name}
                </h3>
                {pick.handle && <p className="text-xs text-black/50 font-mono">{pick.handle}</p>}
                {pick.quote && <p className="text-xs text-black/70 mt-1 leading-relaxed">{pick.quote}</p>}
              </motion.div>
            );
            return pick.video_source === 'link' && pick.link_url ? (
              <a key={pick.id} href={pick.link_url} target="_blank" rel="noopener noreferrer">
                {content}
              </a>
            ) : (
              <div key={pick.id}>{content}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Register in `src/cms/registry.ts`**

```ts
influencer_picks: lazy(() => import('./sections/InfluencerPicksSection')),
```
```ts
influencer_picks: { label: 'Influencer Picks', description: 'Grid of influencer/creator style picks with video or link' },
```
```ts
influencer_picks: [
  { key: 'heading', label: 'Heading', type: 'text', placeholder: 'STYLED BY' },
  { key: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'INFLUENCER PICKS' },
],
```

- [ ] **Step 6: Run the e2e test to confirm it passes**

Run: `npm run test:e2e -- cms.spec.ts`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add src/cms/sections/InfluencerPicksSection.tsx src/cms/registry.ts src/cms/types.ts tests/e2e/cms.spec.ts
git commit -m "feat(cms): add influencer picks homepage section"
```

---

### Task 17: Influencer picks admin page

**Files:**
- Create: `src/pages/admin/AdminInfluencerPicks.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: `public.influencer_picks`, `public.influencer_pick_products` (Task 15), `public.products` (`slug, name`), `useCloudinaryUpload()` (Task 6).

- [ ] **Step 1: Write the admin page**

A new pick's modal stays open after the first save specifically so products can be tagged immediately (this is a deliberate carry-over from the reference project's UX, since tagging requires a real `id`).

```tsx
// src/pages/admin/AdminInfluencerPicks.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react';
import { useCloudinaryUpload } from '@/lib/useCloudinaryUpload';

type Pick = {
  id: string;
  name: string;
  handle: string | null;
  video_source: 'upload' | 'link';
  video_url: string | null;
  link_url: string | null;
  thumbnail_url: string | null;
  thumbnail_type: 'image' | 'video';
  quote: string | null;
  is_active: boolean;
  position: number;
};
type Product = { slug: string; name: string };
type PickProduct = { id: string; influencer_pick_id: string; product_slug: string };

export default function AdminInfluencerPicks() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pickProducts, setPickProducts] = useState<PickProduct[]>([]);
  const [editing, setEditing] = useState<Partial<Pick> | null>(null);
  const [saving, setSaving] = useState(false);
  const { upload, uploading } = useCloudinaryUpload();

  const load = async () => {
    const [{ data: p }, { data: pp }] = await Promise.all([
      supabase.from('influencer_picks').select('*').order('position'),
      supabase.from('influencer_pick_products').select('*'),
    ]);
    setPicks((p as Pick[]) || []);
    setPickProducts((pp as PickProduct[]) || []);
  };

  useEffect(() => {
    load();
    supabase.from('products').select('slug, name').eq('is_active', true).order('name').then(({ data }) => setProducts(data || []));
  }, []);

  const save = async () => {
    if (!editing?.name) return toast.error('Name required');
    if (editing.video_source === 'upload' && !editing.video_url) return toast.error('Upload a video first');
    if (editing.video_source === 'link' && !editing.link_url) return toast.error('Link URL required');
    setSaving(true);
    const payload = {
      name: editing.name,
      handle: editing.handle || null,
      video_source: editing.video_source || 'link',
      video_url: editing.video_source === 'upload' ? editing.video_url : null,
      link_url: editing.video_source === 'link' ? editing.link_url : null,
      thumbnail_url: editing.thumbnail_url || null,
      thumbnail_type: editing.thumbnail_type || 'image',
      quote: editing.quote || null,
      is_active: editing.is_active ?? true,
    };
    if (editing.id) {
      const { error } = await supabase.from('influencer_picks').update(payload).eq('id', editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success('Saved');
      load();
    } else {
      const { data, error } = await supabase.from('influencer_picks').insert({ ...payload, position: picks.length }).select().single();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success('Saved — now tag products below');
      setEditing({ ...editing, id: data.id }); // keep modal open for product tagging
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this pick?')) return;
    const { error } = await supabase.from('influencer_picks').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  const taggedFor = (pickId: string) => pickProducts.filter((pp) => pp.influencer_pick_id === pickId);

  const addProductTag = async (pickId: string, slug: string) => {
    const { error } = await supabase.from('influencer_pick_products').insert({ influencer_pick_id: pickId, product_slug: slug, position: taggedFor(pickId).length });
    if (error) return toast.error(error.message);
    load();
  };

  const removeProductTag = async (id: string) => {
    const { error } = await supabase.from('influencer_pick_products').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const handleThumbnail = async (file: File) => {
    try {
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const url = await upload(file, { resourceType: type, folder: 'vault26/influencer' });
      setEditing((prev) => ({ ...prev, thumbnail_url: url, thumbnail_type: type }));
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  const handleVideo = async (file: File) => {
    try {
      const url = await upload(file, { resourceType: 'video', folder: 'vault26/influencer' });
      setEditing((prev) => ({ ...prev, video_url: url }));
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl mb-2">Influencer Picks</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Creator style picks shown on the homepage — upload a video or link to a reel, then tag the products featured.
      </p>

      <div className="border border-border">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="eyebrow">Picks</div>
          <button onClick={() => setEditing({ video_source: 'link', thumbnail_type: 'image', is_active: true })} className="text-xs uppercase tracking-widest flex items-center gap-1 hover:text-accent">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {picks.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-muted-foreground">{p.handle}</td>
                <td className="p-3 text-xs uppercase">{p.video_source}</td>
                <td className="p-3 text-xs">{taggedFor(p.id).length} product(s)</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => setEditing(p)} className="p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(p.id)} className="p-1.5 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {!picks.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">No picks yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-background w-full max-w-lg p-6 space-y-4 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl">{editing.id ? 'Edit' : 'New'} Pick</h3>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>

            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Name
              <input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" autoFocus />
            </label>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Handle
              <input value={editing.handle || ''} onChange={(e) => setEditing({ ...editing, handle: e.target.value })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" placeholder="@handle" />
            </label>

            <div className="flex gap-2">
              <button onClick={() => setEditing({ ...editing, video_source: 'upload' })} className={`flex-1 border py-2 text-xs uppercase tracking-widest ${editing.video_source === 'upload' ? 'bg-foreground text-background border-foreground' : 'border-border'}`}>Upload video</button>
              <button onClick={() => setEditing({ ...editing, video_source: 'link' })} className={`flex-1 border py-2 text-xs uppercase tracking-widest ${editing.video_source === 'link' ? 'bg-foreground text-background border-foreground' : 'border-border'}`}>Link out</button>
            </div>

            {editing.video_source === 'upload' ? (
              <label className="border border-dashed border-border flex items-center justify-center h-32 cursor-pointer text-xs uppercase tracking-widest text-muted-foreground">
                {editing.video_url ? 'Video uploaded ✓' : uploading ? 'Uploading…' : (<><Upload className="h-5 w-5 mr-2" /> Upload video</>)}
                <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideo(f); }} />
              </label>
            ) : (
              <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                Link URL
                <input value={editing.link_url || ''} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" placeholder="https://instagram.com/reel/..." />
              </label>
            )}

            <label className="border border-dashed border-border flex items-center justify-center h-32 cursor-pointer relative overflow-hidden text-xs uppercase tracking-widest text-muted-foreground">
              {editing.thumbnail_url ? (
                <img src={editing.thumbnail_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
              ) : (
                <><Upload className="h-5 w-5 mr-2" /> Thumbnail</>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnail(f); }} />
            </label>

            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Quote
              <textarea value={editing.quote || ''} onChange={(e) => setEditing({ ...editing, quote: e.target.value })} rows={2} className="mt-1.5 w-full border border-border bg-transparent px-3 py-2 text-sm" />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
            </label>

            {editing.id && (
              <div className="border-t border-border pt-4">
                <div className="eyebrow mb-2">Tagged products</div>
                <ul className="space-y-1 mb-2">
                  {taggedFor(editing.id).map((pp) => (
                    <li key={pp.id} className="flex items-center justify-between text-sm border border-border px-3 py-1.5">
                      {products.find((p) => p.slug === pp.product_slug)?.name || pp.product_slug}
                      <button onClick={() => removeProductTag(pp.id)} className="p-1 hover:bg-secondary text-destructive"><X className="h-3 w-3" /></button>
                    </li>
                  ))}
                </ul>
                <select
                  onChange={(e) => { if (e.target.value) addProductTag(editing!.id!, e.target.value); e.target.value = ''; }}
                  className="w-full border border-border bg-transparent px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>+ Tag a product</option>
                  {products.filter((p) => !taggedFor(editing!.id!).some((pp) => pp.product_slug === p.slug)).map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 border border-border py-3 text-xs uppercase tracking-widest">Close</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-foreground text-background py-3 text-xs uppercase tracking-widest disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the route**

In `src/App.tsx`:
```tsx
const AdminInfluencerPicks = lazy(() => import("@/pages/admin/AdminInfluencerPicks"));
```
```tsx
<Route path="influencer-picks" element={<AdminInfluencerPicks />} />
```

- [ ] **Step 3: Add the NAV entry**

In `AdminLayout.tsx`, add `Video` (or `Star`) to the lucide import list and:
```tsx
{ to: '/admin/influencer-picks', icon: Star, label: 'Influencer Picks' },
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, go to `/admin/influencer-picks`. Confirm: creating a new pick with `link` source requires a link URL; saving a brand-new pick keeps the modal open and now shows the "Tagged products" section; tagging/untagging a product works; toggling upload-vs-link swaps the relevant fields; the homepage's Influencer Picks section (Task 16) reflects changes after a refresh.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminInfluencerPicks.tsx src/App.tsx src/pages/admin/AdminLayout.tsx
git commit -m "feat(admin): add influencer picks admin page"
```

---

## Self-Review

**Spec coverage**: All 7 spec items have tasks — sizes (1–3), mega menu backend (4–5), Cloudinary fix (6), preloader (7–8), lookbook (9–11), community (12–14), influencer picks (15–17). The spec's "out of scope" items (loyalty, popup promo, invoice settings, section headings, Navbar wiring) have no tasks, correctly.

**Placeholder scan**: No TBD/TODO markers. Every step has real, complete code or an exact command. The one intentionally-approximate note is Task 11 Step 1's seed insert, which is flagged as needing a real admin-authenticated write (RLS blocks the publishable key) — that's a correct statement of an RLS constraint, not a placeholder.

**Type consistency**: `useCloudinaryUpload()`'s `upload(file, opts)` signature is identical everywhere it's consumed (Tasks 6, 10, 14, 17). `Slide`/`Photo`/`Pick` types match their table columns exactly across the migration (Tasks 9, 12, 15) and the components/admin pages that consume them (Tasks 10–11, 13–14, 16–17). `SectionType` additions (Task 13 Step 3, Task 16 Step 3) are both applied to the same union in `src/cms/types.ts` — note Task 16 should append `'influencer_picks'` to the already-extended union from Task 13, not restate the pre-Task-13 version.

Plan complete and saved to `docs/superpowers/plans/2026-09-02-admin-cms-buildout.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
