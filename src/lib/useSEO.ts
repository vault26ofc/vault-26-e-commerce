import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type SEO = {
  title: string;
  description?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  canonical?: string;
  jsonLd?: Record<string, any>;
  noindex?: boolean;
  /**
   * Admin → CMS → SEO page slug ("home", "shop", "lookbook", "category/<slug>", "products/<slug>"…).
   * When that page has saved settings, its non-empty fields replace the defaults given here.
   */
  page?: string;
};

type SeoRow = { page_slug: string; title: string | null; description: string | null; og_image: string | null; og_title: string | null; og_description: string | null; canonical_url: string | null; no_index: boolean };

// All saved SEO rows, loaded once per page load.
let seoRequest: Promise<Map<string, SeoRow>> | null = null;
const loadSeo = () => (seoRequest ??= Promise.resolve(supabase.from('seo_settings').select('*'))
  .then(({ data }) => new Map(((data as unknown as SeoRow[]) || []).map((r) => [r.page_slug, r])))
  .catch(() => { seoRequest = null; return new Map<string, SeoRow>(); }));

function setMeta(selector: string, attr: 'name' | 'property', name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useSEO(seo: SEO) {
  const [row, setRow] = useState<SeoRow | null>(null);
  useEffect(() => {
    if (!seo.page) { setRow(null); return; }
    let cancelled = false;
    loadSeo().then((m) => { if (!cancelled) setRow(m.get(seo.page!) || null); });
    return () => { cancelled = true; };
  }, [seo.page]);

  const title = row?.title?.trim() || seo.title;
  const description = row?.description?.trim() || seo.description;
  const image = row?.og_image?.trim() || seo.image;
  const canonical = row?.canonical_url?.trim() || seo.canonical;
  const noindex = !!(row?.no_index || seo.noindex);
  const ogTitle = row?.og_title?.trim() || title;
  const ogDescription = (row?.og_description?.trim() || description || '').slice(0, 200);
  const { type = 'website', jsonLd } = seo;

  useEffect(() => {
    document.title = title.length > 60 ? title.slice(0, 57) + '…' : title;
    const desc = (description || '').slice(0, 160);
    if (desc) setMeta('meta[name="description"]', 'name', 'description', desc);

    setMeta('meta[property="og:title"]', 'property', 'og:title', ogTitle);
    if (ogDescription) setMeta('meta[property="og:description"]', 'property', 'og:description', ogDescription);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);
    setMeta('meta[property="og:url"]', 'property', 'og:url', window.location.href);
    if (image) setMeta('meta[property="og:image"]', 'property', 'og:image', image);

    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', ogTitle);
    if (ogDescription) setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', ogDescription);
    if (image) setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    const canonHref = canonical || window.location.href.split('?')[0];
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonHref;

    let ld = document.head.querySelector<HTMLScriptElement>('script[data-seo-jsonld]');
    if (jsonLd) {
      if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.setAttribute('data-seo-jsonld', '1'); document.head.appendChild(ld); }
      ld.textContent = JSON.stringify(jsonLd);
    } else if (ld) {
      ld.remove();
    }
  }, [title, description, image, type, canonical, noindex, ogTitle, ogDescription, JSON.stringify(jsonLd)]);
}
