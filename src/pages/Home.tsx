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

    // Polka motion sections (from the reference videos) — always present, each slotted
    // straight after an anchor section type (or at the end if the anchor is missing).
    const MOTION_SECTIONS: [CMSSection['section_type'], string, CMSSection['section_type']][] = [
      ['category_cards', 'Category Cards', 'best_sellers'],
      ['product_marquee', 'Product Belt', 'category_cards'],
      ['polka_bento', 'Season Board', 'product_marquee'],
      ['split_scroll', 'Split Scroll', 'campaign_carousel'],
      ['photo_shuffle', 'Photo Shuffle', 'category_grid'],
      ['colour_story', 'Colour Stories', 'photo_shuffle'],
      ['standing_look', 'Standing Look', 'colour_story'],
      ['phone_showcase', 'Phone Showcase', 'instagram_reels'],
      ['drop_countdown', 'Drop Countdown', 'phone_showcase'],
      ['services_strip', 'Store Promise', 'community'],
    ];
    for (const [type, label, anchor] of MOTION_SECTIONS) {
      if (seen.has(type)) continue;
      const anchorIdx = filtered.findIndex((s) => s.section_type === anchor);
      const sec: CMSSection = {
        id: `${type}-section-auto`,
        page_slug: 'home',
        section_type: type,
        label,
        position: anchorIdx !== -1 ? filtered[anchorIdx].position : 999,
        is_visible: true,
        is_locked: false,
        config: {},
      };
      if (anchorIdx !== -1) filtered.splice(anchorIdx + 1, 0, sec);
      else filtered.push(sec);
      seen.add(type);
    }

    return filtered;
  }, [sections]);

  return (
    <div className="bg-white min-h-screen relative">
      {dedupedSections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
}
