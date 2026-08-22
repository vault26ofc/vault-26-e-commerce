import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { CMSSection } from '../types';

export interface CampaignSlide {
  id: string;
  title: string;
  cta_label: string;
  cta_href: string;
  image: string;
}

const DEFAULT_SLIDES: CampaignSlide[] = [
  {
    id: 'slide-1',
    title: 'VAULT 26 POLO CLUB',
    cta_label: 'SHOP NOW',
    cta_href: '/shop',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=95&w=2000'
  },
  {
    id: 'slide-2',
    title: 'ARCHIVE DROPS 26',
    cta_label: 'EXPLORE COLLECTION',
    cta_href: '/shop',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=2000'
  },
  {
    id: 'slide-3',
    title: 'QUIET LUXURY ESSENTIALS',
    cta_label: 'DISCOVER DROPS',
    cta_href: '/shop',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=95&w=2000'
  },
  {
    id: 'slide-4',
    title: 'SEASONAL CAPSULES',
    cta_label: 'VIEW LOOKBOOK',
    cta_href: '/lookbook',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=95&w=2000'
  }
];

export default function CampaignCarouselSection({ section }: { section?: CMSSection }) {
  const cfg = section?.config || {};
  const slides: CampaignSlide[] = cfg.slides && cfg.slides.length > 0 ? cfg.slides : DEFAULT_SLIDES;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // Swipe / Drag tracking (Touch & Mouse)
  const dragStartX = useRef<number | null>(null);
  const dragEndX = useRef<number | null>(null);
  const isMouseDown = useRef<boolean>(false);

  // Auto scrolling timer (every 5s)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex, isPaused, slides.length]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
    dragEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    dragEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    evaluateSwipe();
  };

  // Mouse Drag Handlers for Desktop Swiping
  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDown.current = true;
    dragStartX.current = e.clientX;
    dragEndX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current) return;
    dragEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
    evaluateSwipe();
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    if (isMouseDown.current) {
      isMouseDown.current = false;
      evaluateSwipe();
    }
  };

  const evaluateSwipe = () => {
    if (dragStartX.current === null || dragEndX.current === null) return;
    const distance = dragStartX.current - dragEndX.current;
    if (distance > 40) {
      handleNext(); // Swiped left -> next slide
    } else if (distance < -40) {
      handlePrev(); // Swiped right -> prev slide
    }
    dragStartX.current = null;
    dragEndX.current = null;
  };

  const currentSlide = slides[currentIndex];

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 1.05
    }),
    center: {
      x: '0%',
      opacity: 1,
      scale: 1,
      transition: { duration: 0.7, ease: [0.25, 1, 0.5, 1] }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.7, ease: [0.25, 1, 0.5, 1] }
    })
  };

  return (
    <section className="w-full py-0 bg-black font-sans">
      <div className="w-full px-0">
        {/* Full Edge-to-Edge Sharp Hero Carousel with Manual Swipe & Auto Scroll */}
        <div
          className="relative w-full h-[70vh] sm:h-[80vh] md:h-[85vh] min-h-[480px] max-h-[850px] rounded-none overflow-hidden bg-black group select-none cursor-grab active:cursor-grabbing"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Animated Slide Image */}
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentSlide.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <img
                src={currentSlide.image}
                alt={currentSlide.title}
                className="w-full h-full object-cover object-center brightness-90 pointer-events-none"
                draggable={false}
              />
              {/* Vignette gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />
            </motion.div>
          </AnimatePresence>

          {/* Slide Text Content & CTA Overlay (Centered at Bottom) */}
          <div className="absolute bottom-12 sm:bottom-16 md:bottom-20 inset-x-0 z-20 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
            <motion.h2
              key={`title-${currentSlide.id}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight uppercase text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] mb-3 font-sans"
            >
              {currentSlide.title}
            </motion.h2>

            <motion.div
              key={`cta-${currentSlide.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="pointer-events-auto"
            >
              <Link
                to={currentSlide.cta_href || '/shop'}
                className="inline-block text-xs sm:text-sm font-bold tracking-[0.25em] text-white uppercase border-b-2 border-white pb-1 hover:text-white/80 hover:border-white/80 transition-all duration-300 drop-shadow-md font-sans"
              >
                {currentSlide.cta_label || 'SHOP NOW'}
              </Link>
            </motion.div>
          </div>

          {/* Dot Pagination Indicators (Bottom Center) */}
          <div className="absolute bottom-5 sm:bottom-6 inset-x-0 z-30 flex items-center justify-center gap-2 pointer-events-auto">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? 'w-7 sm:w-8 h-2 bg-white rounded-none shadow-md'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/90 rounded-none'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
