import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import type { CMSSection } from '../types';

type Reel = {
  id: string;
  videoUrl: string;
  posterUrl: string;
  handle: string;
  caption: string;
  likes: string;
  comments: string;
  shares: string;
  productSlug?: string;
  productName?: string;
};

const REELS_DATA: Reel[] = [
  {
    id: 'reel-1',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-black-jacket-41584-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=800',
    handle: '@vault26.official',
    caption: 'Archival Double-Breasted Tailoring in Milan 🇮🇹 #VAULT26',
    likes: '18.4K',
    comments: '412',
    shares: '2.1K',
    productSlug: 'unstructured-raw-linen-blazer',
    productName: 'Raw Linen Blazer'
  },
  {
    id: 'reel-2',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-model-posing-in-a-studio-setting-41585-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800',
    handle: '@vault26.official',
    caption: 'Summer Linen Capsule drop now live 🌾 Link in bio.',
    likes: '24.1K',
    comments: '589',
    shares: '3.4K',
    productSlug: 'relaxed-resort-linen-shirt',
    productName: 'Resort Linen Shirt'
  },
  {
    id: 'reel-3',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-feet-of-a-person-walking-in-sneakers-42686-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800',
    handle: '@vault26.official',
    caption: 'Movement test: Handcrafted Atelier Loafer 👞 #FootwearArchive',
    likes: '14.8K',
    comments: '304',
    shares: '1.9K',
    productSlug: 'italian-leather-atelier-loafer',
    productName: 'Atelier Loafer'
  },
  {
    id: 'reel-4',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-leather-wallet-41589-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800',
    handle: '@vault26.official',
    caption: 'Full-grain vegetable-tanned leather details ✨',
    likes: '12.3K',
    comments: '215',
    shares: '1.2K',
    productSlug: 'minimalist-cargo-trousers',
    productName: 'Pleated Trousers'
  },
  {
    id: 'reel-5',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-wearing-a-hat-and-sunglasses-41582-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800',
    handle: '@vault26.official',
    caption: 'Eyewear & Accessories Archive 04 🕶️ #VaultEyewear',
    likes: '19.6K',
    comments: '478',
    shares: '2.8K',
    productSlug: 'heavyweight-box-tee',
    productName: 'Box Tee — Onyx'
  },
  {
    id: 'reel-6',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-model-walking-on-a-runway-41587-large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800',
    handle: '@vault26.official',
    caption: 'Paris Fashion Week Runway Highlight 🇫🇷',
    likes: '31.2K',
    comments: '890',
    shares: '5.6K',
    productSlug: 'raw-selvedge-oversized-denim',
    productName: 'Selvedge Jacket'
  }
];

export default function InstagramReelsSection({ section: _section }: { section?: CMSSection }) {
  const [muted, setMuted] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const togglePlay = (id: string, videoEl: HTMLVideoElement | null) => {
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play();
      setPlayingId(id);
    } else {
      videoEl.pause();
      setPlayingId(null);
    }
  };

  return (
    <section className="py-14 md:py-20 bg-[#FAF8F5] text-black font-sans border-t border-black/5 overflow-hidden">
      <div className="w-full">
        
        {/* Section Header Bar */}
        <div className="px-4 md:px-8 flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Instagram className="w-4 h-4 text-[#B90F1A]" />
              <span className="text-[10px] font-mono tracking-widest text-[#B90F1A] uppercase font-bold">
                (03) INSTAGRAM ARCHIVE // @VAULT26.OFFICIAL
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif-condensed font-medium text-[#111111] tracking-tight uppercase">
              As Seen On Instagram
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Audio Mute/Unmute Toggle */}
            <button
              onClick={() => setMuted(!muted)}
              className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase px-4 py-2 border border-black/15 hover:border-black transition-colors cursor-pointer bg-white"
            >
              {muted ? <VolumeX className="w-4 h-4 text-black/60" /> : <Volume2 className="w-4 h-4 text-[#B90F1A]" />}
              <span>{muted ? 'SOUND OFF' : 'SOUND ON'}</span>
            </button>

            {/* Scroll Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                aria-label="Scroll left"
                className="w-9 h-9 rounded-full border border-black/15 bg-white flex items-center justify-center text-black hover:border-[#B90F1A] hover:text-[#B90F1A] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                aria-label="Scroll right"
                className="w-9 h-9 rounded-full border border-black/15 bg-white flex items-center justify-center text-black hover:border-[#B90F1A] hover:text-[#B90F1A] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="border border-[#B90F1A] text-[#B90F1A] hover:bg-[#B90F1A] hover:text-white px-5 py-2.5 text-xs font-mono tracking-widest uppercase transition-all duration-300 inline-flex items-center gap-2 font-bold"
            >
              <Instagram className="w-3.5 h-3.5" /> FOLLOW @VAULT26
            </a>
          </div>
        </div>

        {/* Edge-to-Edge Scrollable Reels Cards (Small Edge Padding & Tight Gap) */}
        <div
          ref={scrollRef}
          className="w-full overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-3 md:px-6 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-2 md:gap-3 w-max">
            {REELS_DATA.map((reel) => {
              const isPlaying = playingId === reel.id;

              return (
                <div
                  key={reel.id}
                  className="w-[200px] sm:w-[240px] md:w-[260px] lg:w-[285px] shrink-0 snap-start relative group rounded-md overflow-hidden bg-black aspect-[9/16] shadow-md border border-black/10"
                >
                  {/* Video Reel Tag */}
                  <video
                    autoPlay
                    loop
                    muted={muted}
                    playsInline
                    poster={reel.posterUrl}
                    src={reel.videoUrl}
                    onClick={(e) => togglePlay(reel.id, e.currentTarget)}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500 cursor-pointer"
                  />

                  {/* Top Left Instagram Badge */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[9px] font-mono tracking-widest uppercase">
                    <Instagram className="w-3 h-3 text-white" />
                    <span>REEL</span>
                  </div>

                  {/* Play/Pause Overlay Indicator on Hover */}
                  <button
                    onClick={(e) => {
                      const videoEl = e.currentTarget.parentElement?.querySelector('video');
                      if (videoEl) togglePlay(reel.id, videoEl);
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/40">
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                    </div>
                  </button>

                  {/* Right Side Engagement Column */}
                  <div className="absolute right-3 bottom-16 z-20 flex flex-col items-center gap-3 text-white">
                    <button className="flex flex-col items-center gap-1 text-white hover:text-[#B90F1A] transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                        <Heart className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono font-bold">{reel.likes}</span>
                    </button>

                    <button className="flex flex-col items-center gap-1 text-white hover:text-[#B90F1A] transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono font-bold">{reel.comments}</span>
                    </button>

                    <button className="flex flex-col items-center gap-1 text-white hover:text-[#B90F1A] transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono font-bold">{reel.shares}</span>
                    </button>
                  </div>

                  {/* Bottom Information Bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 space-y-2 pointer-events-none">
                    <div className="text-xs font-mono font-bold text-white tracking-wide">
                      {reel.handle}
                    </div>
                    <p className="text-[11px] font-sans text-white/90 line-clamp-2 leading-tight font-light">
                      {reel.caption}
                    </p>

                    {reel.productSlug && (
                      <div className="pt-1.5 pointer-events-auto">
                        <Link
                          to={`/products/${reel.productSlug}`}
                          className="w-full py-1.5 px-3 bg-white/90 hover:bg-white text-black text-[10px] font-mono font-bold tracking-widest uppercase rounded flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <ShoppingBag className="w-3 h-3 text-[#B90F1A]" />
                          SHOP LOOK: {reel.productName}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
