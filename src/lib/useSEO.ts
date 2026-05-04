import { useEffect } from 'react';

type SEO = {
  title: string;
  description?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  canonical?: string;
  jsonLd?: Record<string, any>;
};

function setMeta(selector: string, attr: 'name' | 'property', name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useSEO({ title, description, image, type = 'website', canonical, jsonLd }: SEO) {
  useEffect(() => {
    document.title = title.length > 60 ? title.slice(0, 57) + '…' : title;
    const desc = (description || '').slice(0, 160);
    if (desc) setMeta('meta[name="description"]', 'name', 'description', desc);

    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    if (desc) setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);
    setMeta('meta[property="og:url"]', 'property', 'og:url', window.location.href);
    if (image) setMeta('meta[property="og:image"]', 'property', 'og:image', image);

    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    if (desc) setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    if (image) setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

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
  }, [title, description, image, type, canonical, JSON.stringify(jsonLd)]);
}
