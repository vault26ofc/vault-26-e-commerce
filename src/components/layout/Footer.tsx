import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TornEdge } from '@/components/polka/Polka';

// Stepped edge of the red panel (x% per band), traced from the Polka sign-off board.
const SIGNOFF_STEPS = [49, 45, 42, 48, 45, 50, 54, 52, 58, 53, 51, 47, 42];
const SIGNOFF_CLIP = (() => {
  const h = 100 / SIGNOFF_STEPS.length;
  const pts = ['0% 0%', `${SIGNOFF_STEPS[0]}% 0%`];
  SIGNOFF_STEPS.forEach((x, i) => {
    if (i > 0) pts.push(`${SIGNOFF_STEPS[i - 1]}% ${(h * i).toFixed(2)}%`, `${x}% ${(h * i).toFixed(2)}%`);
  });
  pts.push(`${SIGNOFF_STEPS[SIGNOFF_STEPS.length - 1]}% 100%`, '0% 100%');
  return `polygon(${pts.join(', ')})`;
})();

type FooterLink = { label: string; to: string; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Tops',
    links: [
      { label: 'T-shirts', to: '/shop?category=t-shirts' },
      { label: 'Shirts', to: '/shop?category=jackets' },
      { label: 'Longsleeves', to: '/shop?category=sweaters' },
      { label: 'Hoodies', to: '/shop?category=jackets' },
      { label: 'Sweaters', to: '/shop?category=sweaters' },
      { label: 'Jackets', to: '/shop?category=jackets' },
    ],
  },
  {
    title: 'Bottoms',
    links: [
      { label: 'Shorts', to: '/shop?category=trousers' },
      { label: 'Jeans', to: '/shop?category=trousers' },
      { label: 'Pants', to: '/shop?category=trousers' },
      { label: 'Sweatpants', to: '/shop?category=trousers' },
    ],
  },
  {
    title: 'Navigation',
    links: [
      { label: 'New arrivals', to: '/shop' },
      { label: 'Essentials', to: '/shop' },
      { label: 'Accessories', to: '/accessories' },
      { label: 'Lookbook', to: '/lookbook' },
      { label: 'About the brand', to: '/about' },
    ],
  },
  {
    title: 'Customers',
    links: [
      { label: 'Payment', to: '/faq' },
      { label: 'Shipping', to: '/faq' },
      { label: 'Returns', to: '/faq' },
      { label: 'FAQ', to: '/faq' },
      { label: 'My orders', to: '/orders' },
    ],
  },
  {
    title: 'Social',
    links: [
      { label: 'Instagram', to: 'https://instagram.com', external: true },
      { label: 'Twitter', to: 'https://twitter.com', external: true },
      { label: 'Facebook', to: 'https://facebook.com', external: true },
      { label: 'Tiktok', to: 'https://tiktok.com', external: true },
      { label: 'Playlist', to: 'https://music.apple.com', external: true },
    ],
  },
];

/*
 * Polka footer: Editor's Red paper that tears in from the page above, contact
 * + newsletter on the left, link columns on the right, giant wordmark, legal row.
 */
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
    <footer className="relative w-full bg-[#BB0006] text-white font-sans mt-[clamp(30px,4vw,64px)] select-none">
      <img
        src="/hero_paper_texture.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-40 pointer-events-none"
      />
      <TornEdge color="#BB0006" position="top" seed={97} className="!-translate-y-[98%] !rotate-0" />

      <div className="relative mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-[30px] pt-12 md:pt-16 pb-8">
        <div className="grid lg:grid-cols-[1fr_1.9fr] gap-12">
          {/* Contact + newsletter */}
          <div>
            <a href="tel:+919999999999" className="text-[15px] hover:underline">+91 99999 99999</a>
            <a href="mailto:hello@vault26.co.in" className="block mt-2 text-[22px] md:text-[26px] underline underline-offset-4 decoration-1">
              hello@vault26.co.in
            </a>

            <div className="mt-10 max-w-[440px]">
              <p className="font-display font-[800] uppercase text-[26px] md:text-[30px] leading-none">Stay in the know</p>
              <p className="text-[14px] text-white/85 mt-2">First access to drops, restocks and private sales.</p>
              {subscribed ? (
                <p className="mt-4 h-12 flex items-center px-4 bg-white text-[#BB0006] text-[15px]">You&apos;re on the list.</p>
              ) : (
                <form onSubmit={handleSubscribe} className="mt-4 flex">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    aria-label="Email address"
                    className="flex-1 min-w-0 h-12 bg-transparent border border-white/80 px-4 text-[15px] placeholder:text-white/60 outline-none focus:border-white"
                  />
                  <button type="submit" className="h-12 px-6 bg-white text-[#BB0006] text-[15px] hover:bg-[#F1F1F1] transition-colors">
                    Subscribe
                  </button>
                </form>
              )}
            </div>

            <p className="mt-10 text-[15px] leading-relaxed">
              <span className="underline underline-offset-4 decoration-1">Made in India · Shipping worldwide</span>
              <br />
              <span className="underline underline-offset-4 decoration-1">Mon–Sun: 11:00–20:00 IST</span>
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-10">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="uppercase text-[15px] md:text-[16px] mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.external ? (
                        <a href={l.to} target="_blank" rel="noreferrer" className="text-[13px] md:text-[14px] underline underline-offset-4 decoration-1 hover:opacity-75">
                          {l.label}
                        </a>
                      ) : (
                        <Link to={l.to} className="text-[13px] md:text-[14px] hover:underline underline-offset-4">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Giant wordmark */}
        <p className="mt-12 md:mt-16 font-display font-[800] uppercase leading-[0.8] text-right text-[clamp(90px,19vw,300px)] tracking-[-0.01em]">
          Vault 26
        </p>

        {/* Legal row */}
        <div className="mt-8 pt-5 border-t border-white/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] md:text-[12px] uppercase">
          <span>© {new Date().getFullYear()} Vault 26. All rights reserved</span>
          <Link to="/privacy" className="hover:underline">Privacy policy</Link>
          <Link to="/privacy" className="hover:underline">Terms of service</Link>
          <Link to="/faq" className="hover:underline">Shipping &amp; returns</Link>
          <span>India · ₹ INR</span>
        </div>
      </div>

      {/* Sign-off poster: red panel stepping into crumpled paper (mirrors the hero) */}
      <div className="relative mt-4 overflow-hidden">
        <div className="relative md:h-[440px]">
          <img src="/hero_paper_texture.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
          <div className="hidden md:block absolute inset-0 bg-[#BB0006]" style={{ clipPath: SIGNOFF_CLIP }} />
          <div className="relative mx-auto h-full w-full max-w-[1440px] md:px-8 lg:px-[30px] md:py-12 flex flex-col md:flex-row md:justify-between">
            <div className="flex flex-col md:max-w-[46%] bg-[#BB0006] md:bg-transparent px-4 sm:px-6 md:px-0 py-10 md:py-0">
              <p className="font-display font-[800] uppercase text-[22px] md:text-[28px] leading-none">Need a hand with your order?</p>
              <p className="font-sans uppercase text-[13px] md:text-[15px] mt-8">Write to us:</p>
              <a href="mailto:hello@vault26.co.in" className="font-sans text-[20px] md:text-[26px] mt-1 hover:underline underline-offset-4">hello@vault26.co.in</a>
              <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer" className="mt-5 self-start h-11 px-6 bg-white text-[#BB0006] font-sans text-[14px] flex items-center hover:bg-[#F1F1F1] transition-colors">
                Chat on WhatsApp
              </a>
              <p className="mt-8 md:mt-auto font-sans text-[12px] leading-relaxed text-white/85 max-w-[340px]">
                Secure checkout · Free shipping over ₹999 · 7-day returns · Made in India
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end justify-between gap-8 text-left md:text-right px-4 sm:px-6 md:px-0 pt-10 pb-24 md:py-0">
              <p className="font-display font-[800] uppercase text-[#BB0006] leading-none text-[clamp(40px,6vw,92px)]">Vault 26</p>
              {/* Studio credit */}
              <a
                href="https://artechstudio.co.in"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-start md:items-end text-[#0F0F0F]"
              >
                <span className="font-display font-[800] uppercase text-[18px] md:text-[22px] leading-none">Developed &amp; maintained by</span>
                <span className="mt-2 bg-[#BB0006] text-white font-display font-[800] uppercase leading-none text-[clamp(34px,3.8vw,60px)] px-[0.16em] pt-[0.14em] pb-[0.04em] group-hover:bg-[#0F0F0F] transition-colors">
                  AR Tech Studio
                </span>
                <span className="mt-2 font-sans text-[13px] md:text-[15px] text-[#BB0006] underline underline-offset-4 decoration-1">
                  artechstudio.co.in ↗
                </span>
              </a>
            </div>
          </div>
        </div>
        <div className="bg-[#BB0006] pt-2 pb-[1.2vw]">
          <p className="font-display font-[800] uppercase text-[#F4F4F2] leading-[0.92] whitespace-nowrap text-center text-[clamp(40px,10.2vw,158px)]">
            Thanks for shopping
          </p>
        </div>
      </div>
    </footer>
  );
}
