import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setSubscribed(false);
      }, 4000);
    }
  };

  return (
    <footer className="w-full bg-black text-white font-sans border-t border-white/10 select-none">
      
      {/* 01 — GIANT BRAND BANNER HEADER (Daily Paper Style) */}
      <div className="w-full bg-black pt-10 pb-4 overflow-hidden leading-none text-center select-none border-b border-white/10">
        <h1 className="text-[13vw] sm:text-[15vw] font-sans font-black uppercase tracking-tighter text-white leading-none opacity-95 scale-y-105 transform translate-y-2">
          VAULT 26
        </h1>
      </div>

      {/* 02 — SPLIT COMMUNITY & NEWSLETTER CARDS */}
      <div className="w-full bg-black p-4 sm:p-6 md:p-10 border-b border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-7xl mx-auto">
          
          {/* LEFT CARD (2/3 width): STAY IN THE KNOW NEWSLETTER */}
          <div className="lg:col-span-8 relative min-h-[380px] sm:min-h-[420px] bg-[#111111] overflow-hidden rounded-none flex flex-col justify-end p-8 sm:p-12 border border-white/10 group">
            {/* Background Editorial Image */}
            <img
              src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=95&w=1600"
              alt="Vault 26 Community"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 opacity-60"
            />
            {/* Dark Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40" />

            <div className="relative z-10 max-w-xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-primary font-bold uppercase tracking-tight text-white mb-2 leading-none">
                Stay in the know
              </h2>
              <p className="text-xs sm:text-sm text-white/80 font-normal leading-relaxed mb-6">
                Sign up to be the first to know about drops, special offers and more.
              </p>

              {subscribed ? (
                <div className="bg-white/10 border border-white/30 backdrop-blur-md px-6 py-3 text-xs font-mono font-bold text-white uppercase tracking-widest inline-block">
                  ✓ YOU ARE SUBSCRIBED TO VAULT 26
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="w-full max-w-md flex items-center border border-white/40 focus-within:border-white bg-black/60 backdrop-blur-md px-4 py-3 rounded-none transition-colors">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    className="bg-transparent text-white text-xs placeholder:text-white/50 outline-none w-full font-mono"
                  />
                  <button
                    type="submit"
                    className="text-white text-xs font-mono font-bold tracking-[0.2em] uppercase hover:text-white/70 transition-colors ml-3 whitespace-nowrap cursor-pointer"
                  >
                    JOIN →
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT CARD (1/3 width): SOUNDS OF NOW PLAYLIST */}
          <div className="lg:col-span-4 relative bg-[#141414] border border-white/10 p-8 sm:p-10 flex flex-col justify-between items-center text-center rounded-none overflow-hidden min-h-[380px]">
            {/* Vertical Marquee Side Text Borders */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[9px] font-mono text-white/30 tracking-[0.3em] uppercase whitespace-nowrap pointer-events-none">
              VAULT 26 PLAYLIST
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 origin-center text-[9px] font-mono text-white/30 tracking-[0.3em] uppercase whitespace-nowrap pointer-events-none">
              VAULT 26 PLAYLIST
            </div>

            <div className="z-10 pt-2">
              <h3 className="text-3xl sm:text-4xl font-primary font-bold uppercase tracking-tight text-white mb-2">
                Sounds of now
              </h3>
              <p className="text-xs text-white/70 font-normal leading-relaxed max-w-xs mx-auto">
                Making people dance with our curated flagship store Playlists since 2026.
              </p>
            </div>

            <div className="z-10 my-4">
              <a
                href="https://music.apple.com"
                target="_blank"
                rel="noreferrer"
                className="bg-white text-black hover:bg-white/90 px-6 py-2.5 text-xs font-mono font-bold tracking-[0.15em] uppercase transition-all rounded-none shadow-md inline-block cursor-pointer"
              >
                LISTEN ON APPLE MUSIC
              </a>
            </div>

            {/* Vinyl Disk Visual */}
            <div className="relative z-10 w-28 h-28 rounded-full bg-[#181818] border-4 border-[#282828] flex items-center justify-center shadow-xl animate-[spin_10s_linear_infinite]">
              <div className="w-10 h-10 rounded-full bg-amber-400/90 border-2 border-black flex items-center justify-center text-[8px] font-black text-black">
                V26
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 03 — MULTI-COLUMN NAVIGATION FOOTER (Daily Paper Style) */}
      <div className="w-full bg-black pt-14 pb-10 px-6 sm:px-10 md:px-14">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 mb-16 items-start text-xs font-normal">
            
            {/* COL 1: TOPS */}
            <div>
              <span className="text-xs font-mono font-bold text-white tracking-widest uppercase mb-4 block">
                Tops
              </span>
              <ul className="space-y-2.5 text-white/70 text-xs">
                <li><Link to="/shop?category=t-shirts" className="hover:text-white transition-colors">T-Shirts</Link></li>
                <li><Link to="/shop?category=jackets" className="hover:text-white transition-colors">Shirts</Link></li>
                <li><Link to="/shop?category=sweaters" className="hover:text-white transition-colors">Longsleeves</Link></li>
                <li><Link to="/shop?category=jackets" className="hover:text-white transition-colors">Hoodies</Link></li>
                <li><Link to="/shop?category=sweaters" className="hover:text-white transition-colors">Sweaters</Link></li>
                <li><Link to="/shop?category=jackets" className="hover:text-white transition-colors">Jackets</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors font-bold text-white">All Tops</Link></li>
              </ul>
            </div>

            {/* COL 2: BOTTOMS */}
            <div>
              <span className="text-xs font-mono font-bold text-white tracking-widest uppercase mb-4 block">
                Bottoms
              </span>
              <ul className="space-y-2.5 text-white/70 text-xs">
                <li><Link to="/shop?category=trousers" className="hover:text-white transition-colors">Shorts</Link></li>
                <li><Link to="/shop?category=trousers" className="hover:text-white transition-colors">Jeans</Link></li>
                <li><Link to="/shop?category=trousers" className="hover:text-white transition-colors">Pants</Link></li>
                <li><Link to="/shop?category=trousers" className="hover:text-white transition-colors">Sweatpants</Link></li>
                <li><Link to="/shop?category=trousers" className="hover:text-white transition-colors">Swimwear</Link></li>
                <li><Link to="/shop?category=trousers" className="hover:text-white transition-colors font-bold text-white">All Bottoms</Link></li>
              </ul>
            </div>

            {/* COL 3: SEASON HIGHLIGHTS */}
            <div>
              <span className="text-xs font-mono font-bold text-white tracking-widest uppercase mb-4 block">
                Season Highlights
              </span>
              <ul className="space-y-2.5 text-white/70 text-xs">
                <li><Link to="/shop" className="hover:text-white transition-colors">New Arrivals</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors">Essentials</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors">Monogram</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors">Flagship Store</Link></li>
                <li><Link to="/lookbook" className="hover:text-white transition-colors">Archive</Link></li>
              </ul>
            </div>

            {/* COL 4: VAULT 26 */}
            <div>
              <span className="text-xs font-mono font-bold text-white tracking-widest uppercase mb-4 block">
                Vault 26
              </span>
              <ul className="space-y-2.5 text-white/70 text-xs">
                <li><Link to="/about" className="hover:text-white transition-colors">About the brand</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">UNITE Membership</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors">Stores</Link></li>
              </ul>
            </div>

            {/* COL 5: GET HELP */}
            <div>
              <span className="text-xs font-mono font-bold text-white tracking-widest uppercase mb-4 block">
                Get help
              </span>
              <ul className="space-y-2.5 text-white/70 text-xs">
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Terms of service</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">Shipping</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">Payment</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">Withdrawal request</Link></li>
                <li><a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors text-white font-mono">#ConnectV26</a></li>
              </ul>
            </div>

            {/* COL 6: SOCIAL & REGION SELECTOR */}
            <div>
              <span className="text-xs font-mono font-bold text-white tracking-widest uppercase mb-4 block">
                Social
              </span>
              <ul className="space-y-2.5 text-white/70 text-xs mb-6">
                <li><a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Facebook</a></li>
                <li><a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="https://tiktok.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Tiktok</a></li>
              </ul>

              {/* Region & Language Selector Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button className="border border-white/30 hover:border-white bg-black px-3 py-2 text-[10px] font-mono font-bold text-white tracking-widest uppercase flex items-center justify-between transition-colors rounded-none cursor-pointer">
                  <span>WORLDWIDE</span>
                  <span>📍</span>
                </button>
                <button className="border border-white/30 hover:border-white bg-black px-3 py-2 text-[10px] font-mono font-bold text-white tracking-widest uppercase flex items-center justify-between transition-colors rounded-none cursor-pointer">
                  <span>INDIA</span>
                  <span>🇮🇳 / ₹</span>
                </button>
              </div>
            </div>

          </div>

          {/* BOTTOM COPYRIGHT BAR */}
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-white/40 gap-2">
            <span>© {new Date().getFullYear()} VAULT 26 ARCHIVE INC. ALL RIGHTS RESERVED.</span>
            <span>ENGINEERED FOR EVERYDAY LUXURY</span>
          </div>
        </div>
      </div>

    </footer>
  );
}
