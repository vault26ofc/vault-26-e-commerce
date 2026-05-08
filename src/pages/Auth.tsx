import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Phone, Eye, EyeOff } from 'lucide-react';

const LOGO_URL = "https://res.cloudinary.com/dsqeawg67/image/upload/v1776861404/WhatsApp_Image_2026-04-21_at_23.40.39-removebg-preview_1_ztvyke.png";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Access Granted // Welcome Back');
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
            disabled={loading} 
            className="w-full bg-black text-white py-5 text-[11px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 disabled:opacity-30 mt-8"
          >
            {loading ? 'Verifying Identity...' : 'Authorize Access'}
          </button>
        </form>

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
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { name: name.trim(), phone: phone.trim() }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Registration Initiated // Check Email');
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
            disabled={loading} 
            className="w-full bg-black text-white py-5 text-[11px] tracking-[0.4em] uppercase font-ui font-bold hover:bg-accent transition-colors duration-500 disabled:opacity-30 mt-8"
          >
            {loading ? 'Processing Application...' : 'Register Account'}
          </button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-[10px] tracking-[0.2em] text-black/40 uppercase font-ui">
            Already in the Archive? <Link to="/login" className="text-black font-bold border-b border-black pb-0.5 ml-2 hover:text-accent hover:border-accent transition-colors">Authorize Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

