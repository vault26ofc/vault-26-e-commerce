import { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LogOut, Package, Heart, Settings, MapPin, Trash2, Plus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Account() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const empty = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };
  const [newAddr, setNewAddr] = useState(empty);

  const loadAddresses = () => {
    if (!user) return;
    supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setAddresses(data || []));
  };

  // useEffect must be before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      setProfileForm({ name: data?.name || '', phone: data?.phone || '' });
    });
    loadAddresses();
  }, [user?.id]);

  if (loading) return <div className="min-h-screen bg-white" />;
  if (!user) return <Navigate to="/login" replace />;

  const saveProfile = async () => {
    const { error } = await supabase.from('profiles').update(profileForm).eq('id', user!.id);
    if (error) return toast.error(error.message);
    toast.success('Profile updated');
  };

  const addAddress = async () => {
    if (!newAddr.full_name || !newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.pincode || !newAddr.phone) {
      return toast.error('Please complete all required fields');
    }
    const { error } = await supabase.from('addresses').insert({ ...newAddr, user_id: user!.id });
    if (error) return toast.error(error.message);
    toast.success('Address added to profile'); setNewAddr(empty); setAdding(false); loadAddresses();
  };

  const deleteAddr = async (id: string) => {
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if (error) return toast.error(error.message);
    loadAddresses();
  };

  if (!user && !loading) return null;

  return (
    <div className="container-px py-24 min-h-screen bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-5xl mx-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <span className="eyebrow">Member Archive</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); toast.success('Signed out'); navigate('/'); }}
            className="flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase font-ui font-bold text-black/40 hover:text-black transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} /> Sign Out
          </button>
        </div>
        <h1 className="display-2 mb-16">
          Hello, <span className="italic font-elegant font-light">{profile?.name || user?.email?.split('@')[0] || 'Member'}</span>
        </h1>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {[
            { to: '/orders', icon: Package, title: 'Order History', desc: 'Manage your archive purchases' },
            { to: '/wishlist', icon: Heart, title: 'Your Wishlist', desc: 'View saved archive pieces' },
            ...(isAdmin ? [{ to: '/admin', icon: Settings, title: 'Management', desc: 'Vault 26 admin controls' }] : [])
          ].map((item, i) => (
            <Link 
              key={i} 
              to={item.to} 
              className="group border border-black/5 p-8 hover:border-black transition-all duration-500 bg-muted/30"
            >
              <item.icon className="h-5 w-5 text-accent mb-6 transition-transform group-hover:scale-110" strokeWidth={1.5} />
              <h3 className="text-sm font-ui font-bold tracking-[0.2em] uppercase mb-2">{item.title}</h3>
              <p className="text-[10px] text-black/40 tracking-[0.1em] uppercase font-ui">{item.desc}</p>
              <div className="mt-8 flex items-center gap-2 text-[9px] font-bold tracking-[0.3em] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                Access <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_450px] gap-24">
          {/* Profile Section */}
          <section>
            <div className="flex items-center justify-between mb-10 border-b border-black pb-4">
              <h2 className="text-[11px] tracking-[0.4em] uppercase font-ui font-bold">Identity Settings</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                { label: 'Display Name', value: profileForm.name, key: 'name' },
                { label: 'Mobile Contact', value: profileForm.phone, key: 'phone' }
              ].map((field) => (
                <div key={field.key} className="space-y-3">
                  <label className="text-[9px] tracking-[0.4em] uppercase font-ui font-bold text-black/30">{field.label}</label>
                  <input 
                    value={field.value} 
                    onChange={(e) => setProfileForm({ ...profileForm, [field.key]: e.target.value })}
                    className="w-full border-b border-black/10 bg-transparent py-4 text-sm font-ui outline-none focus:border-black transition-colors placeholder:text-black/10"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
            <button 
              onClick={saveProfile} 
              className="mt-12 bg-black text-white px-12 py-4 text-[10px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500"
            >
              Update Profile
            </button>
          </section>

          {/* Address Section */}
          <section>
            <div className="flex items-center justify-between mb-10 border-b border-black pb-4">
              <h2 className="text-[11px] tracking-[0.4em] uppercase font-ui font-bold">Address Book</h2>
              <button 
                onClick={() => setAdding(!adding)} 
                className="text-[9px] tracking-[0.3em] uppercase font-ui font-bold hover:text-accent transition-colors"
              >
                {adding ? 'Close' : 'Add New'}
              </button>
            </div>

            <AnimatePresence>
              {adding && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-12 space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    {(['full_name', 'phone', 'pincode', 'city', 'state'] as const).map((k) => (
                      <input 
                        key={k} 
                        placeholder={k.replace('_', ' ').toUpperCase()} 
                        value={(newAddr as any)[k]}
                        onChange={(e) => setNewAddr({ ...newAddr, [k]: e.target.value })}
                        className="border border-black/5 bg-muted/50 px-5 py-4 text-[10px] tracking-[0.2em] font-ui outline-none focus:border-black transition-colors"
                      />
                    ))}
                  </div>
                  <input 
                    placeholder="STREET ADDRESS" 
                    value={newAddr.line1}
                    onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                    className="w-full border border-black/5 bg-muted/50 px-5 py-4 text-[10px] tracking-[0.2em] font-ui outline-none focus:border-black transition-colors"
                  />
                  <div className="flex gap-4 pt-2">
                    <button onClick={addAddress} className="flex-1 bg-black text-white py-4 text-[9px] tracking-[0.4em] uppercase font-bold">Confirm Address</button>
                    <button onClick={() => setAdding(false)} className="px-8 border border-black/10 py-4 text-[9px] tracking-[0.4em] uppercase font-bold">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {addresses.length === 0 && !adding && (
                <p className="text-[10px] tracking-[0.2em] text-black/30 uppercase font-ui">No saved shipping locations.</p>
              )}
              {addresses.map((a) => (
                <div key={a.id} className="group border border-black/5 p-6 relative hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[11px] font-ui font-bold tracking-[0.2em] uppercase mb-2">{a.full_name}</div>
                      <div className="text-[10px] text-black/50 leading-relaxed font-ui uppercase tracking-[0.1em]">
                        {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br/>
                        {a.city}, {a.state} {a.pincode}<br/>
                        T: {a.phone}
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteAddr(a.id)} 
                      className="text-black/20 hover:text-accent transition-colors"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

      </motion.div>
    </div>
  );
}

