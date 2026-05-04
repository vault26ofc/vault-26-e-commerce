import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Package, Heart, Settings, MapPin, Trash2, Plus } from 'lucide-react';

export default function Account() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const empty = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };
  const [newAddr, setNewAddr] = useState(empty);

  useEffect(() => { if (!loading && !user) navigate('/login'); }, [user, loading]);

  const loadAddresses = () => user && supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setAddresses(data || []));

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      setProfileForm({ name: data?.name || '', phone: data?.phone || '' });
    });
    loadAddresses();
  }, [user]);

  const saveProfile = async () => {
    const { error } = await supabase.from('profiles').update(profileForm).eq('id', user!.id);
    if (error) return toast.error(error.message);
    toast.success('Profile updated');
  };

  const addAddress = async () => {
    if (!newAddr.full_name || !newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.pincode || !newAddr.phone) {
      return toast.error('Fill all required fields');
    }
    const { error } = await supabase.from('addresses').insert({ ...newAddr, user_id: user!.id });
    if (error) return toast.error(error.message);
    toast.success('Address added'); setNewAddr(empty); setAdding(false); loadAddresses();
  };

  const deleteAddr = async (id: string) => {
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) return toast.error(error.message);
    loadAddresses();
  };

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

      <section className="mt-14">
        <h2 className="font-display text-2xl mb-4">Profile</h2>
        <div className="grid md:grid-cols-2 gap-4 max-w-xl">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Name
            <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="mt-1.5 w-full border border-border bg-transparent px-3 py-2.5 text-sm text-foreground" />
          </label>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Phone
            <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="mt-1.5 w-full border border-border bg-transparent px-3 py-2.5 text-sm text-foreground" />
          </label>
        </div>
        <button onClick={saveProfile} className="mt-4 bg-foreground text-background px-5 py-2.5 text-xs uppercase tracking-widest btn-press">Save</button>
      </section>

      <section className="mt-14">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Addresses</h2>
          {!adding && <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-foreground"><Plus className="h-3.5 w-3.5" /> Add</button>}
        </div>
        {adding && (
          <div className="border border-border p-5 mb-4 grid md:grid-cols-2 gap-3">
            {(['full_name','phone','line1','line2','city','state','pincode'] as const).map((k) => (
              <input key={k} placeholder={k.replace('_', ' ')} value={(newAddr as any)[k]}
                onChange={(e) => setNewAddr({ ...newAddr, [k]: e.target.value })}
                className="border border-border bg-transparent px-3 py-2 text-sm" />
            ))}
            <div className="md:col-span-2 flex gap-2">
              <button onClick={addAddress} className="bg-foreground text-background px-5 py-2.5 text-xs uppercase tracking-widest">Save address</button>
              <button onClick={() => { setAdding(false); setNewAddr(empty); }} className="border border-border px-5 py-2.5 text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        )}
        {addresses.length === 0 && !adding && <p className="text-sm text-muted-foreground">No saved addresses yet.</p>}
        <div className="grid md:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="border border-border p-5 relative">
              <MapPin className="h-4 w-4 text-accent mb-2" />
              <div className="font-medium">{a.full_name}</div>
              <div className="text-sm text-muted-foreground mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br/>{a.city}, {a.state} {a.pincode}<br/>{a.phone}</div>
              <button onClick={() => deleteAddr(a.id)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <button onClick={async () => { await supabase.auth.signOut(); toast.success('Signed out'); navigate('/'); }}
        className="mt-14 inline-flex items-center gap-2 text-sm border border-border px-5 py-2.5 hover:border-foreground btn-press">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
