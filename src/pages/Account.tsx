import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Package, Heart, Settings } from 'lucide-react';

export default function Account() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (!user) return null;
  return (
    <div className="container-px py-12 max-w-4xl">
      <span className="eyebrow">Account</span>
      <h1 className="display-2 mt-2">Hello, {profile?.name || user.email?.split('@')[0]}</h1>

      <div className="mt-10 grid md:grid-cols-3 gap-4">
        <Link to="/orders" className="border border-border p-6 hover:border-foreground transition-colors">
          <Package className="h-5 w-5 text-accent" />
          <div className="mt-4 font-medium">Orders</div>
          <div className="text-xs text-muted-foreground mt-1">View order history & tracking</div>
        </Link>
        <Link to="/wishlist" className="border border-border p-6 hover:border-foreground transition-colors">
          <Heart className="h-5 w-5 text-accent" />
          <div className="mt-4 font-medium">Wishlist</div>
          <div className="text-xs text-muted-foreground mt-1">Pieces you've saved</div>
        </Link>
        {isAdmin && (
          <Link to="/admin" className="border border-border p-6 hover:border-foreground transition-colors">
            <Settings className="h-5 w-5 text-accent" />
            <div className="mt-4 font-medium">Admin Panel</div>
            <div className="text-xs text-muted-foreground mt-1">Manage products & orders</div>
          </Link>
        )}
      </div>

      <button onClick={async () => { await supabase.auth.signOut(); toast.success('Signed out'); navigate('/'); }}
        className="mt-10 inline-flex items-center gap-2 text-sm border border-border px-5 py-2.5 hover:border-foreground btn-press">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
