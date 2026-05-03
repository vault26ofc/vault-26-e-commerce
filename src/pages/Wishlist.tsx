import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import ProductCard, { ProductCardData } from '@/components/product/ProductCard';

export default function Wishlist() {
  const { ids } = useWishlist();
  const [items, setItems] = useState<ProductCardData[]>([]);
  useEffect(() => {
    if (ids.length === 0) { setItems([]); return; }
    supabase.from('products').select('id, name, slug, images, brands(name), product_variants(price, compare_price)').in('id', ids).then(({ data }) => {
      setItems((data || []).map((p: any) => {
        const v = p.product_variants?.[0];
        return { id: p.id, slug: p.slug, name: p.name, brand: p.brands?.name, images: p.images || [], price: Number(v?.price || 0), comparePrice: v?.compare_price ? Number(v.compare_price) : null };
      }));
    });
  }, [ids]);
  return (
    <div className="container-px py-10">
      <span className="eyebrow">Saved for later</span>
      <h1 className="display-2 mt-2 mb-10">Wishlist</h1>
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nothing saved yet. <Link to="/category/shirts" className="link-underline text-foreground">Discover pieces</Link>.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10">
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
