import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-black/10 py-12 md:py-16 text-black font-ui">
      <div className="container-px">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 mb-12">
          {/* Column 1: Contacts (Matching Chienne Reference Image) */}
          <div>
            <h3 className="text-xl md:text-2xl font-serif-condensed font-medium text-[#B11226] tracking-tight mb-4">
              Contacts
            </h3>
            <div className="space-y-2 text-xs md:text-sm font-ui text-black/70 font-light">
              <p>+91 904-501-66-10</p>
              <p>+91 928-164-13-33</p>
              <p className="pt-1">archive@vault26.co.in</p>
              <p className="pt-2">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-[#B11226] transition-colors">
                  Instagram →
                </a>
              </p>
              <p>
                <a href="https://telegram.org" target="_blank" rel="noreferrer" className="hover:text-[#B11226] transition-colors">
                  Telegram →
                </a>
              </p>
              <div className="pt-3 text-[10px] text-black/40 leading-normal">
                <p>Vault 26 Luxury Goods Pvt. Ltd.</p>
                <p>GSTIN: 07AAACV2600F1Z2</p>
              </div>
            </div>
          </div>

          {/* Column 2: Catalog (Matching Chienne Reference Image) */}
          <div>
            <h3 className="text-xl md:text-2xl font-serif-condensed font-medium text-[#B11226] tracking-tight mb-4">
              Catalog
            </h3>
            <ul className="space-y-2 text-xs md:text-sm font-ui text-black/70 font-light">
              <li><Link to="/shop" className="hover:text-[#B11226] transition-colors">All Products</Link></li>
              <li><Link to="/category/men" className="hover:text-[#B11226] transition-colors">Outerwear</Link></li>
              <li><Link to="/category/men" className="hover:text-[#B11226] transition-colors">Tees & Tops</Link></li>
              <li><Link to="/category/men" className="hover:text-[#B11226] transition-colors">Trousers</Link></li>
              <li><Link to="/category/shoes" className="hover:text-[#B11226] transition-colors">Footwear</Link></li>
              <li><Link to="/category/accessories" className="hover:text-[#B11226] transition-colors">Accessories</Link></li>
              <li><Link to="/shop" className="text-[#B11226] hover:underline">Sale</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Care (Matching Chienne Reference Image) */}
          <div>
            <h3 className="text-xl md:text-2xl font-serif-condensed font-medium text-[#B11226] tracking-tight mb-4">
              Customer Care
            </h3>
            <ul className="space-y-2 text-xs md:text-sm font-ui text-black/70 font-light">
              <li><Link to="/about" className="hover:text-[#B11226] transition-colors">About Brand</Link></li>
              <li><Link to="/faq" className="hover:text-[#B11226] transition-colors">How to Place an Order</Link></li>
              <li><Link to="/faq" className="hover:text-[#B11226] transition-colors">Shipping & Delivery</Link></li>
              <li><Link to="/faq" className="hover:text-[#B11226] transition-colors">Exchanges & Returns</Link></li>
              <li><Link to="/privacy" className="hover:text-[#B11226] transition-colors">Public Offer</Link></li>
              <li><Link to="/privacy" className="hover:text-[#B11226] transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar (Matching Chienne Reference Image) */}
        <div className="pt-6 border-t border-black/5 flex flex-col sm:flex-row justify-between items-center text-[11px] text-black/40 font-ui gap-2">
          <span>© {new Date().getFullYear()} Vault 26 — All rights reserved</span>
          <span>Designed for Quiet Luxury</span>
        </div>
      </div>
    </footer>
  );
}
