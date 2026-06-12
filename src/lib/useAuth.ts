import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async (uid: string) => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      setIsAdmin(!!data?.some((r: any) => r.role === 'admin'));
    };

    // Resolve loading as soon as any auth event fires
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      if (s?.user) {
        checkRole(s.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    // Fallback: resolve via getSession if onAuthStateChange hasn't fired yet
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) checkRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, isAdmin, loading };
}
