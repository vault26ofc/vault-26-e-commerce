import { Link } from 'react-router-dom';
import { Instagram, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';

const LOGO_URL = "https://res.cloudinary.com/dsqeawg67/image/upload/v1776861404/WhatsApp_Image_2026-04-21_at_23.40.39-removebg-preview_1_ztvyke.png";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-black/20 py-24 px-6 lg:px-12">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="space-y-8">
            <div className="h-16">
              <img
                src={LOGO_URL}
                alt="VAULT 26"
                className="h-full w-auto object-contain brightness-0"
              />
            </div>
            <p className="text-sm text-black/50 max-w-xs leading-relaxed font-ui font-light">
              Where high fashion meets street authenticity. Vault 26 is more than clothing — it's a statement of individuality.
            </p>
            <div className="flex gap-6 opacity-40">
              {['INSTAGRAM', 'TWITTER', 'TIKTOK'].map(social => (
                <a key={social} href="#" className="text-[9px] tracking-[0.3em] font-ui font-bold hover:text-accent transition-colors">
                  {social}
                </a>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold text-black mb-8 block">Collections</span>
            <ul className="space-y-4">
              {['New Drops', 'Men', 'Women', 'Archive'].map(item => (
                <li key={item}>
                  <Link to="#" className="text-sm font-ui font-light text-black/60 hover:text-black transition-colors uppercase tracking-[0.1em]">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold text-black mb-8 block">Support</span>
            <ul className="space-y-4">
              {['Shipping', 'Returns', 'Privacy', 'Contact'].map(item => (
                <li key={item}>
                  <Link to="#" className="text-sm font-ui font-light text-black/60 hover:text-black transition-colors uppercase tracking-[0.1em]">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-8">
            <span className="text-[10px] tracking-[0.4em] uppercase font-ui font-bold text-black block">Newsletter</span>
            <p className="text-sm font-ui font-light text-black/50 leading-relaxed">
              Join the archive for early access and editorial stories.
            </p>
            <div className="relative group">
              <input 
                type="email" 
                placeholder="EMAIL ADDRESS" 
                className="w-full bg-transparent border-b border-black/20 py-4 text-[11px] tracking-[0.3em] font-light outline-none focus:border-accent transition-colors placeholder:text-black/50 font-ui"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-black/10 gap-8">
          <div className="flex items-center gap-12">
            <span className="text-[9px] tracking-[0.4em] uppercase text-black/50 font-ui">
              © {new Date().getFullYear()} VAULT 26 ARCHIVE
            </span>
            <span className="hidden md:block text-[9px] tracking-[0.4em] uppercase text-black/50 font-ui">
              EST. MMXXVI
            </span>
          </div>
          <div className="flex items-center gap-8">
            <span className="text-[9px] tracking-[0.4em] uppercase text-black/50 font-ui">
              DESIGNED BY STUDIO V
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

