import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CMSSection, NewsletterConfig } from '../types';

export default function NewsletterSection({ section }: { section: CMSSection }) {
  const cfg = section.config as NewsletterConfig;
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const line1 = cfg.heading_line1 || 'JOIN THE';
  const line2 = cfg.heading_line2 || 'Vault';
  const body = cfg.body || 'BE THE FIRST TO RECEIVE EXCLUSIVE ACCESS TO LIMITED DROPS, EDITORIAL CONTENT, AND SECRET ARCHIVE RELEASES.';
  const placeholder = cfg.placeholder || 'ENTER YOUR EMAIL';
  const ctaLabel = cfg.cta_label || 'Join Now';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('newsletter_subscribers').upsert({ email: email.trim() }, { onConflict: 'email' });
      toast.success('Welcome to the Vault.');
      setEmail('');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-16 md:py-32 container-px bg-white relative overflow-hidden">
      <div className="absolute inset-0 flex flex-col justify-center opacity-[0.05] pointer-events-none select-none">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="whitespace-nowrap text-[20vw] font-light uppercase tracking-tighter flex font-elegant"
        >
          <span>VAULT 26 &nbsp; VAULT 26 &nbsp; VAULT 26 &nbsp; VAULT 26 &nbsp;</span>
          <span>VAULT 26 &nbsp; VAULT 26 &nbsp; VAULT 26 &nbsp; VAULT 26 &nbsp;</span>
        </motion.div>
      </div>

      <div className="max-w-[1600px] mx-auto text-center relative z-10">
        <div className="overflow-hidden mb-4">
          <motion.span
            initial={{ y: '100%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="block text-[12vw] md:text-[6vw] lg:text-[5vw] leading-tight text-black uppercase tracking-[0.2em] font-elegant font-normal"
          >
            {line1}
          </motion.span>
        </div>
        <div className="overflow-hidden mb-16">
          <motion.span
            initial={{ y: '100%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="block text-[12vw] md:text-[10vw] lg:text-[8vw] leading-none italic text-accent -mt-4 font-elegant font-light"
          >
            {line2}
          </motion.span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <p className="text-black/60 mb-12 text-sm md:text-base tracking-[0.2em] uppercase font-light leading-relaxed font-ui">
            {body}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4 mb-12">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              className="flex-1 w-full bg-transparent border-b border-black/20 py-4 text-[12px] tracking-[0.3em] font-light outline-none focus:border-accent transition-colors placeholder:text-black/60 font-ui"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto border border-black px-12 py-4 text-[11px] tracking-[0.3em] uppercase transition-all duration-500 bg-transparent text-black whitespace-nowrap font-ui hover:bg-black hover:text-white disabled:opacity-50"
            >
              {submitting ? '...' : ctaLabel}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
