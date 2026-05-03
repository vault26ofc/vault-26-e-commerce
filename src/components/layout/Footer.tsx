import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-24">
      <div className="container-px py-16 grid md:grid-cols-4 gap-10">
        <div>
          <div className="font-display text-2xl tracking-[0.15em] uppercase mb-3">Vault 26</div>
          <p className="text-sm opacity-70 leading-relaxed">A curated wardrobe for the modern minimalist. Crafted in India, worn worldwide.</p>
          <div className="flex gap-4 mt-5 opacity-80">
            <a href="#" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="Facebook"><Facebook className="h-4 w-4" /></a>
            <a href="#" aria-label="Twitter"><Twitter className="h-4 w-4" /></a>
          </div>
        </div>
        <div>
          <div className="eyebrow text-primary-foreground/60 mb-4">Shop</div>
          <ul className="space-y-2 text-sm opacity-80">
            <li><Link to="/category/outerwear">Outerwear</Link></li>
            <li><Link to="/category/shirts">Shirts</Link></li>
            <li><Link to="/category/trousers">Trousers</Link></li>
            <li><Link to="/category/knitwear">Knitwear</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow text-primary-foreground/60 mb-4">Help</div>
          <ul className="space-y-2 text-sm opacity-80">
            <li><Link to="/orders">Track Order</Link></li>
            <li><Link to="/privacy-policy">Privacy</Link></li>
            <li><Link to="/terms">Terms</Link></li>
            <li><a href="mailto:hello@vault26.com">Contact</a></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow text-primary-foreground/60 mb-4">Newsletter</div>
          <p className="text-sm opacity-80 mb-3">Receive new drops + private collections.</p>
          <form className="flex border border-primary-foreground/20">
            <input className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-primary-foreground/50" placeholder="Your email" />
            <button className="px-4 text-xs uppercase tracking-widest hover:bg-accent hover:text-accent-foreground transition-colors">Join</button>
          </form>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 py-5 text-center text-xs opacity-60">
        © {new Date().getFullYear()} Vault 26. All rights reserved.
      </div>
    </footer>
  );
}
