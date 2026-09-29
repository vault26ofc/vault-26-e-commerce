import { Fragment, Suspense, useEffect } from 'react';
import { useSEO } from '@/lib/useSEO';
import { useCMSPage } from '@/cms/hooks/useCMSPage';
import { SECTION_COMPONENTS } from '@/cms/registry';
import type { CMSSection } from '@/cms/types';

/** Anchor id for a section, so Admin → CMS "View on site" can link to /#section-<id>. */
const sectionAnchor = (id: string) => `section-${id}`;

function SectionRenderer({ section }: { section: CMSSection }) {
  const Component = SECTION_COMPONENTS[section.section_type as keyof typeof SECTION_COMPONENTS];
  if (!Component) return null;
  return (
    <Suspense fallback={null}>
      <Component section={section} />
    </Suspense>
  );
}

/** Scroll to the section named in the URL hash once it exists, re-settling while lazy sections and images above it load. */
function useScrollToSectionHash(sections: CMSSection[]) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith('section-') || !sections.some((s) => sectionAnchor(s.id) === id)) return;
    const jump = () => document.getElementById(id)?.scrollIntoView({ block: 'start' });
    const timers = [0, 400, 1000, 2000].map((ms) => window.setTimeout(jump, ms));
    // Stop re-settling as soon as the visitor scrolls on their own.
    const stop = () => timers.forEach(clearTimeout);
    window.addEventListener('wheel', stop, { once: true, passive: true });
    window.addEventListener('touchstart', stop, { once: true, passive: true });
    return () => {
      stop();
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
    };
  }, [sections]);
}

/** The homepage is exactly what Admin → CMS says: its sections, order and visibility. */
export default function Home() {
  useSEO({
    title: 'VAULT 26 — Premium Streetwear Archive',
    description: 'Where high fashion meets street authenticity. Not just worn. Remembered.',
  });
  const { sections } = useCMSPage('home');
  useScrollToSectionHash(sections);

  return (
    <div className="bg-white min-h-screen relative">
      {sections.map((section) => (
        <Fragment key={section.id}>
          {/* Zero-height anchor: leaves each section's own layout (sticky, full-bleed…) untouched. */}
          <div id={sectionAnchor(section.id)} aria-hidden className="scroll-mt-16" />
          <SectionRenderer section={section} />
        </Fragment>
      ))}
    </div>
  );
}
