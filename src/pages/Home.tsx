import { Suspense, useMemo } from 'react';
import { useSEO } from '@/lib/useSEO';
import { useCMSPage } from '@/cms/hooks/useCMSPage';
import { SECTION_COMPONENTS } from '@/cms/registry';
import type { CMSSection } from '@/cms/types';

function SectionRenderer({ section }: { section: CMSSection }) {
  const Component = SECTION_COMPONENTS[section.section_type as keyof typeof SECTION_COMPONENTS];
  if (!Component) return null;
  return (
    <Suspense fallback={null}>
      <Component section={section} />
    </Suspense>
  );
}

export default function Home() {
  useSEO({
    title: 'VAULT 26 — Premium Streetwear Archive',
    description: 'Where high fashion meets street authenticity. Not just worn. Remembered.',
  });
  const { sections, loading } = useCMSPage('home');

  // Deduplicate by section_type — keeps lowest-position row for each type
  const dedupedSections = useMemo(() => {
    const seen = new Set<string>();
    const filtered = sections.filter((s) => {
      if (
        s.section_type === 'editorial_split' ||
        s.section_type === 'new_arrivals' ||
        s.section_type === 'bento_grid' ||
        s.section_type === 'collections' ||
        s.section_type === 'linen_collection' ||
        s.section_type === 'flagship_stores' ||
        s.section_type === 'cinematic_hero' ||
        s.section_type === 'newsletter'
      ) return false;
      if (seen.has(s.section_type)) return false;
      seen.add(s.section_type);
      return true;
    });


    // Ensure category_bar section is always included right after marquee tag
    if (!seen.has('category_bar')) {
      const categoryBarSec: CMSSection = {
        id: 'category-bar-section-auto',
        page_slug: 'home',
        section_type: 'category_bar',
        label: 'Category Bar',
        position: 13,
        is_visible: true,
        is_locked: false,
        config: {}
      };
      const insertIdx = filtered.findIndex((s) => s.position >= 14);
      if (insertIdx !== -1) {
        filtered.splice(insertIdx, 0, categoryBarSec);
      } else {
        filtered.push(categoryBarSec);
      }
      seen.add('category_bar');
    }

    // Ensure campaign_carousel section is always included right after best_sellers
    if (!seen.has('campaign_carousel')) {
      const carouselSec: CMSSection = {
        id: 'campaign-carousel-section-auto',
        page_slug: 'home',
        section_type: 'campaign_carousel',
        label: 'Campaign Carousel',
        position: 16,
        is_visible: true,
        is_locked: false,
        config: {}
      };
      const insertIdx = filtered.findIndex((s) => s.position >= 17);
      if (insertIdx !== -1) {
        filtered.splice(insertIdx, 0, carouselSec);
      } else {
        filtered.push(carouselSec);
      }
      seen.add('campaign_carousel');
    }

    // Ensure lookbook section is always included
    if (!seen.has('lookbook')) {
      const lookbookSec: CMSSection = {
        id: 'lookbook-section-auto',
        page_slug: 'home',
        section_type: 'lookbook',
        label: 'SSENSE Lookbook',
        position: 25,
        is_visible: true,
        is_locked: false,
        config: {}
      };
      const insertIdx = filtered.findIndex((s) => s.position >= 30);
      if (insertIdx !== -1) {
        filtered.splice(insertIdx, 0, lookbookSec);
      } else {
        filtered.push(lookbookSec);
      }
      seen.add('lookbook');
    }


    // Ensure instagram_reels section is always included
    if (!seen.has('instagram_reels')) {
      const reelsSec: CMSSection = {
        id: 'reels-section-auto',
        page_slug: 'home',
        section_type: 'instagram_reels',
        label: 'Instagram Reels',
        position: 92,
        is_visible: true,
        is_locked: false,
        config: {}
      };
      const insertIdx = filtered.findIndex((s) => s.position >= 95);
      if (insertIdx !== -1) {
        filtered.splice(insertIdx, 0, reelsSec);
      } else {
        filtered.push(reelsSec);
      }
      seen.add('instagram_reels');
    }

    return filtered;
  }, [sections]);

  return (
    <div className="bg-white min-h-screen">
      {dedupedSections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
}
