import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Welcome back');
    navigate('/account');
  };
  return (
    <div className="container-px py-20 max-w-md">
      <span className="eyebrow">Account</span>
      <h1 className="display-2 mt-2 mb-8">Sign in</h1>
      <form onSubmit={submit} className="space-y-4">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          className="w-full border border-border bg-transparent px-3 py-3 text-sm outline-none focus:border-foreground" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
          className="w-full border border-border bg-transparent px-3 py-3 text-sm outline-none focus:border-foreground" />
        <button disabled={loading} className="w-full bg-foreground text-background py-3.5 text-xs uppercase tracking-widest btn-press disabled:opacity-50">{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="text-sm text-muted-foreground mt-6 text-center">No account? <Link to="/register" className="link-underline text-foreground">Create one</Link></p>
    </div>
  );
}

export function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, phone }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Account created');
    navigate('/account');
  };
  return (
    <div className="container-px py-20 max-w-md">
      <span className="eyebrow">Account</span>
      <h1 className="display-2 mt-2 mb-8">Create account</h1>
      <form onSubmit={submit} className="space-y-4">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full border border-border bg-transparent px-3 py-3 text-sm outline-none focus:border-foreground" />
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border border-border bg-transparent px-3 py-3 text-sm outline-none focus:border-foreground" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full border border-border bg-transparent px-3 py-3 text-sm outline-none focus:border-foreground" />
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className="w-full border border-border bg-transparent px-3 py-3 text-sm outline-none focus:border-foreground" />
        <button disabled={loading} className="w-full bg-foreground text-background py-3.5 text-xs uppercase tracking-widest btn-press disabled:opacity-50">{loading ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="text-sm text-muted-foreground mt-6 text-center">Already a member? <Link to="/login" className="link-underline text-foreground">Sign in</Link></p>
    </div>
  );
}
