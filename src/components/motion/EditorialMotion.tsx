import React from 'react';
import { motion } from 'framer-motion';

// Refined easing curves as specified in VAULT 26 Motion System
export const EASE_PRIMARY = [0.22, 1, 0.36, 1];   // Entrance: cubic-bezier(0.22, 1, 0.36, 1)
export const EASE_SECONDARY = [0.16, 1, 0.3, 1]; // Transitions: cubic-bezier(0.16, 1, 0.3, 1)
export const EASE_FAST = [0.4, 0, 0.2, 1];       // Fast interaction: cubic-bezier(0.4, 0, 0.2, 1)

interface TextRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * 03 — TEXT REVEAL SYSTEM
 * Masked / clipped vertical text reveal from behind an overflow-hidden boundary.
 */
export function TextReveal({
  children,
  delay = 0,
  duration = 0.8,
  className = '',
  as: Component = 'div'
}: TextRevealProps) {
  return (
    <Component className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: '110%' }}
        whileInView={{ opacity: 1, y: '0%' }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{
          duration,
          delay,
          ease: EASE_PRIMARY
        }}
      >
        {children}
      </motion.div>
    </Component>
  );
}

/**
 * 04 — WORD / LINE STAGGER REVEAL
 * Splits text string into words and reveals each word with subtle stagger.
 */
interface WordRevealProps {
  text: string;
  delay?: number;
  staggerMs?: number;
  className?: string;
  wordClassName?: string;
}

export function WordReveal({
  text,
  delay = 0,
  staggerMs = 60,
  className = '',
  wordClassName = ''
}: WordRevealProps) {
  const words = text.split(' ');

  return (
    <div className={`flex flex-wrap gap-x-[0.25em] gap-y-[0.1em] ${className}`}>
      {words.map((word, idx) => (
        <span key={`${word}-${idx}`} className={`overflow-hidden inline-block ${wordClassName}`}>
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, y: '110%' }}
            whileInView={{ opacity: 1, y: '0%' }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{
              duration: 0.8,
              delay: delay + (idx * (staggerMs / 1000)),
              ease: EASE_PRIMARY
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </div>
  );
}

/**
 * 07 — SCROLL REVEAL SYSTEM
 * Triggers staggered typography animation when section reaches 75–85% viewport.
 */
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  staggerChildren?: number;
  delay?: number;
}

export function ScrollReveal({
  children,
  className = '',
  staggerChildren = 0.1,
  delay = 0
}: ScrollRevealProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren,
            delayChildren: delay
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

export const scrollRevealChildVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: EASE_PRIMARY
    }
  }
};

export function ScrollRevealItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={scrollRevealChildVariants}>
      {children}
    </motion.div>
  );
}

/**
 * 09 & 10 — EDITORIAL INDEX & CHERRY RED ACCENT MOTION
 * Number reveal (01, 02) + cherry-red line draw (scaleX(0) -> scaleX(1)).
 */
interface EditorialIndexProps {
  num: string;
  label?: string;
  isActive?: boolean;
  className?: string;
}

export function EditorialIndex({ num, label, isActive = false, className = '' }: EditorialIndexProps) {
  return (
    <div className={`inline-flex flex-col group ${className}`}>
      <div className="flex items-center gap-2">
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_PRIMARY }}
          className={`font-mono text-xs tracking-widest ${isActive ? 'text-[#B11226]' : 'text-neutral-500'}`}
        >
          {num}
        </motion.span>
        {label && (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE_PRIMARY }}
            className="text-xs uppercase font-sans tracking-widest text-neutral-800"
          >
            {label}
          </motion.span>
        )}
      </div>
      {/* Cherry Red Line Reveal */}
      <motion.div
        className="h-[1.5px] bg-[#B11226] origin-left mt-1"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: isActive ? 1 : 0 }}
        whileHover={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.06, ease: EASE_SECONDARY }}
      />
    </div>
  );
}

/**
 * 10 — CHERRY RED INDICATOR LINE
 */
export function CherryAccentLine({ className = '', isActive = true }: { className?: string; isActive?: boolean }) {
  return (
    <motion.div
      className={`h-[1px] bg-[#B11226] origin-left ${className}`}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: isActive ? 1 : 0 }}
      transition={{ duration: 0.3, ease: EASE_SECONDARY }}
    />
  );
}

/**
 * 19 — CTA TYPOGRAPHIC MOTION
 * Refined arrow translate and text micro-shift on hover without scale/box-shadow.
 */
interface CTAMotionProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function CTAMotion({ children, href, onClick, className = '' }: CTAMotionProps) {
  const content = (
    <motion.span
      className={`inline-flex items-center gap-2 cursor-pointer font-sans text-xs tracking-[0.2em] uppercase font-semibold text-black group ${className}`}
      whileHover="hover"
      initial="initial"
    >
      <motion.span
        variants={{
          initial: { x: 0 },
          hover: { x: 2 }
        }}
        transition={{ duration: 0.25, ease: EASE_FAST }}
      >
        {children}
      </motion.span>
      <motion.span
        variants={{
          initial: { x: 0 },
          hover: { x: 5 }
        }}
        transition={{ duration: 0.25, ease: EASE_FAST }}
      >
        →
      </motion.span>
    </motion.span>
  );

  if (href) {
    return <a href={href} onClick={onClick}>{content}</a>;
  }

  return <button onClick={onClick}>{content}</button>;
}

/**
 * 21 — PAGE TRANSITION WRAPPER
 * Magazine page turn transition (opacity 1, y: 0 -> opacity 0, y: -8px -> opacity 1, y: 0)
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.6, ease: EASE_PRIMARY }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 17 — LETTER-SPACING EDITORIAL TRANSITION
 */
export function LetterSpacingReveal({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      className={`inline-block ${className}`}
      initial={{ opacity: 0, letterSpacing: '0.18em' }}
      whileInView={{ opacity: 1, letterSpacing: '0.12em' }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE_PRIMARY }}
    >
      {children}
    </motion.span>
  );
}
