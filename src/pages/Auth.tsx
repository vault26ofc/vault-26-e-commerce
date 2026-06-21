import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSEO } from '@/lib/useSEO';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Phone, Eye, EyeOff } from 'lucide-react';

const LOGO_URL = "https://res.cloudinary.com/dsqeawg67/image/upload/v1776861404/WhatsApp_Image_2026-04-21_at_23.40.39-removebg-preview_1_ztvyke.png";

function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/account' },
    });
    if (error) { toast.error(error.message || 'Google sign-in failed'); setBusy(false); }
  };
  return (
    <button type="button" onClick={onClick} disabled={busy} className="w-full flex items-center justify-center gap-3 border border-black/15 py-4 text-[11px] tracking-[0.25em] uppercase font-ui font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-40">
      <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
      {busy ? 'Connecting…' : label}
    </button>
  );
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getAttempts(email: string) {
  try { return JSON.parse(localStorage.getItem(`_la_${email}`) || '{"n":0,"t":0}'); } catch { return { n: 0, t: 0 }; }
}
function recordFailure(email: string) {
  const a = getAttempts(email);
  localStorage.setItem(`_la_${email}`, JSON.stringify({ n: a.n + 1, t: Date.now() }));
}
function clearAttempts(email: string) { localStorage.removeItem(`_la_${email}`); }
function isLockedOut(email: string) {
  const a = getAttempts(email);
  return a.n >= MAX_ATTEMPTS && Date.now() - a.t < LOCKOUT_MS;
}
function minutesLeft(email: string) {
  const a = getAttempts(email);
  return Math.ceil((LOCKOUT_MS - (Date.now() - a.t)) / 60000);
}

export function Login() {
  useSEO({ title: 'Sign In — Vault 26', noindex: true });
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (isLockedOut(trimmed)) {
      const mins = minutesLeft(trimmed);
      return toast.error(`Access suspended — try again in ${mins} ${mins === 1 ? 'minute' : 'minutes'}`);
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    setLoading(false);
    if (error) {
      recordFailure(trimmed);
      const a = getAttempts(trimmed);
      const left = MAX_ATTEMPTS - a.n;
      if (left <= 0) {
        const mins = minutesLeft(trimmed);
        return toast.error(`Too many failed attempts — suspended for ${mins} ${mins === 1 ? 'minute' : 'minutes'}`);
      }
      return toast.error(`Wrong email or password — ${left} ${left === 1 ? 'attempt' : 'attempts'} remaining`);
    }
    clearAttempts(trimmed);
    toast.success('Welcome back');
    navigate('/account');
  };

  return (
    <div className="container-px py-32 flex flex-col items-center justify-center min-h-[80vh] bg-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-12">
          <img src={LOGO_URL} alt="Vault 26" className="h-16 brightness-0" />
        </div>
        
        <div className="text-center mb-12">
          <span className="eyebrow block mb-4">Archive Access</span>
          <h1 className="display-2 font-elegant italic">Member <span className="text-accent">Login</span></h1>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="relative group">
            <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-black transition-colors" strokeWidth={1.5} />
            <input 
              type="email" 
              name="email"
              autoComplete="email"
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="IDENTITY@EMAIL.COM"
              className="w-full border-b border-black/10 bg-transparent pl-8 py-4 text-[11px] tracking-[0.2em] font-ui outline-none focus:border-black transition-colors placeholder:text-black/10"
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-black transition-colors" strokeWidth={1.5} />
            <input 
              type={showPassword ? "text" : "password"} 
              name="password"
              autoComplete="current-password"
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="ACCESS_KEY"
              className="w-full border-b border-black/10 bg-transparent pl-8 pr-10 py-4 text-[11px] tracking-[0.2em] font-ui outline-none focus:border-black transition-colors placeholder:text-black/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-black/20 hover:text-black transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Eye className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 text-[11px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 disabled:opacity-30 mt-8"
          >
            {loading ? 'Verifying Identity...' : 'Authorize Access'}
          </button>
        </form>
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-black/10" />
          <span className="text-[9px] tracking-[0.4em] uppercase text-black/30 font-ui">Or</span>
          <div className="flex-1 h-px bg-black/10" />
        </div>
        <GoogleButton />

        <div className="mt-12 text-center">
          <p className="text-[10px] tracking-[0.2em] text-black/40 uppercase font-ui">
            New to the Archive? <Link to="/register" className="text-black font-bold border-b border-black pb-0.5 ml-2 hover:text-accent hover:border-accent transition-colors">Apply for Membership</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function Register() {
  useSEO({ title: 'Create Account — Vault 26', noindex: true });
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail, password,
      options: { data: { name: name.trim(), phone: phone.trim() } },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // If Supabase returned no session, email confirmation is still enabled server-side —
    // attempt immediate sign-in so the user isn't left in limbo.
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      setLoading(false);
      if (signInError) {
        toast.success('Account created — check your email to activate it');
        return navigate('/login');
      }
    } else {
      setLoading(false);
    }
    toast.success('Account created. Welcome to Vault 26');
    navigate('/account');
  };

  return (
    <div className="container-px py-32 flex flex-col items-center justify-center min-h-[80vh] bg-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-12">
          <img src={LOGO_URL} alt="Vault 26" className="h-16 brightness-0" />
        </div>
        
        <div className="text-center mb-12">
          <span className="eyebrow block mb-4">Membership Application</span>
          <h1 className="display-2 font-elegant italic">Join the <span className="text-accent">Vault</span></h1>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="relative group">
            <UserIcon className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-black transition-colors" strokeWidth={1.5} />
            <input 
              name="name"
              autoComplete="name"
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="FULL_NAME" 
              className="w-full border-b border-black/10 bg-transparent pl-8 py-4 text-[11px] tracking-[0.2em] font-ui outline-none focus:border-black transition-colors placeholder:text-black/10" 
            />
          </div>
          <div className="relative group">
            <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-black transition-colors" strokeWidth={1.5} />
            <input 
              type="email" 
              name="email"
              autoComplete="email"
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="IDENTITY@EMAIL.COM" 
              className="w-full border-b border-black/10 bg-transparent pl-8 py-4 text-[11px] tracking-[0.2em] font-ui outline-none focus:border-black transition-colors placeholder:text-black/10" 
            />
          </div>
          <div className="relative group">
            <Phone className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-black transition-colors" strokeWidth={1.5} />
            <input 
              name="phone"
              autoComplete="tel"
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="MOBILE_CONTACT" 
              className="w-full border-b border-black/10 bg-transparent pl-8 py-4 text-[11px] tracking-[0.2em] font-ui outline-none focus:border-black transition-colors placeholder:text-black/10" 
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20 group-focus-within:text-black transition-colors" strokeWidth={1.5} />
            <input 
              type={showPassword ? "text" : "password"} 
              name="password"
              autoComplete="new-password"
              required 
              minLength={6} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="SET_ACCESS_KEY" 
              className="w-full border-b border-black/10 bg-transparent pl-8 pr-10 py-4 text-[11px] tracking-[0.2em] font-ui outline-none focus:border-black transition-colors placeholder:text-black/10" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-black/20 hover:text-black transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Eye className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 text-[11px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 disabled:opacity-30 mt-8"
          >
            {loading ? 'Processing Application...' : 'Register Account'}
          </button>
        </form>
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-black/10" />
          <span className="text-[9px] tracking-[0.4em] uppercase text-black/30 font-ui">Or</span>
          <div className="flex-1 h-px bg-black/10" />
        </div>
        <GoogleButton label="Sign up with Google" />

        <div className="mt-12 text-center">
          <p className="text-[10px] tracking-[0.2em] text-black/40 uppercase font-ui">
            Already in the Archive? <Link to="/login" className="text-black font-bold border-b border-black pb-0.5 ml-2 hover:text-accent hover:border-accent transition-colors">Authorize Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

