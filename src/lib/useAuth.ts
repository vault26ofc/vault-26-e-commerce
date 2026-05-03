import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(async () => {
          const { data } = await supabase.from('user_roles').select('role').eq('user_id', s.user.id);
          setIsAdmin(!!data?.some((r: any) => r.role === 'admin'));
        }, 0);
      } else setIsAdmin(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('user_roles').select('role').eq('user_id', session.user.id).then(({ data }) => {
          setIsAdmin(!!data?.some((r: any) => r.role === 'admin'));
        });
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, session, isAdmin, loading };
}
