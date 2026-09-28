import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { CMSSection } from '../types';
import { Num, Wrap } from '@/components/polka/Polka';
import { resolveHref, type LinkValue } from '@/lib/links';

const SERVICES = [
  { title: 'Free shipping', body: 'On every order above ₹999, delivered in 3–5 days across India.', to: '/faq' },
  { title: '7-day returns', body: 'Changed your mind? Send it back unworn with tags for a full refund.', to: '/faq' },
  { title: 'Size exchange', body: 'Wrong fit? We swap sizes free of charge, once per order.', to: '/faq' },
  { title: 'Pay your way', body: 'UPI, cards, net banking or cash on delivery — all secured.', to: '/faq' },
];

/*
 * Polka numbered-list board as the store promise: four numbered columns with
 * rule lines, a big display title per service, and an ink underline on hover.
 */
export default function ServicesStripSection({ section }: { section?: CMSSection }) {
  const cfg = (section?.config || {}) as { items?: { title?: string; body?: string; link?: LinkValue }[] };
  const services = cfg.items?.some((s) => s.title)
    ? cfg.items.filter((s) => s.title).map((s) => ({ title: s.title!, body: s.body || '', to: resolveHref(s.link, '/shop') }))
    : SERVICES;
  return (
    <section className="bg-white py-14 md:py-20">
      <Wrap>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-[#0F0F0F]">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="border-b lg:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-r border-[#0F0F0F] lg:last:border-r-0"
            >
              <Link to={s.to} className="group block p-5 md:p-6 h-full">
                <Num n={i + 1} className="text-[#BB0006] text-[22px]" />
                <p className="font-display uppercase text-[#0F0F0F] text-[32px] md:text-[40px] leading-[0.9] mt-6 group-hover:text-[#BB0006] transition-colors">
                  {s.title}
                </p>
                <p className="font-sans text-[14px] md:text-[15px] leading-relaxed text-[#0F0F0F]/80 mt-3">{s.body}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
