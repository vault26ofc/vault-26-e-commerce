import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { inr } from '@/lib/format';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('products').select('id, name, slug, is_active, brands(name), product_variants(price, stock)').order('created_at', { ascending: false }).then(({ data }) => setProducts(data || []));
  }, []);
  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Products</h1>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary"><tr>{['Name','Brand','Price from','Stock','Active'].map((h) => <th key={h} className="text-left p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {products.map((p) => {
              const minP = Math.min(...p.product_variants.map((v: any) => Number(v.price)));
              const stock = p.product_variants.reduce((s: number, v: any) => s + v.stock, 0);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-muted-foreground">{p.brands?.name}</td>
                  <td className="p-3">{inr(minP)}</td>
                  <td className="p-3">{stock}</td>
                  <td className="p-3 text-xs">{p.is_active ? '✓' : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-4">Editing products inline coming next iteration. Use Lovable Cloud → Tables to add/edit for now.</p>
    </div>
  );
}
