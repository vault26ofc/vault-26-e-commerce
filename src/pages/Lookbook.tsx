import LookbookSection from '@/cms/sections/LookbookSection';
import { useSEO } from '@/lib/useSEO';

export default function Lookbook() {
  useSEO({
    title: 'Lookbook — WALL 26',
    description: 'Explore the Spring / Summer 24 Editorial Lookbook by WALL 26 — timeless pieces, contemporary attitude, built for everyday.',
    canonical: 'https://vault26.co.in/lookbook'
  });

  return <LookbookSection isPage={true} />;
}
