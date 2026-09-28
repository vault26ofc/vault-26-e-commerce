import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = { user: User | null; session: Session | null; isAdmin: boolean; loading: boolean };

/*
 * One shared auth state for the whole app. Every useAuth() used to start from scratch, and it
 * reported "not loading" before the admin role was known — so admin pages flashed
 * "Admin access required" and re-checked the role on every navigation. Now the role is checked
 * once per user and `loading` stays true until it is known.
 */
let state: AuthState = { user: null, session: null, isAdmin: false, loading: true };
const listeners = new Set<(s: AuthState) => void>();
const roleCache = new Map<string, boolean>();
let started = false;

const emit = (patch: Partial<AuthState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
};

async function applySession(session: Session | null) {
  const user = session?.user ?? null;
  if (!user) { emit({ session, user: null, isAdmin: false, loading: false }); return; }
  const cached = roleCache.get(user.id);
  if (cached !== undefined) { emit({ session, user, isAdmin: cached, loading: false }); return; }
  // Keep loading (and the previous role) until we know — no flash of "access required".
  emit({ session, user });
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  const isAdmin = !!data?.some((r: { role: string }) => r.role === 'admin');
  roleCache.set(user.id, isAdmin);
  emit({ isAdmin, loading: false });
}

function start() {
  if (started) return;
  started = true;
  supabase.auth.getSession().then(({ data: { session } }) => applySession(session));
  supabase.auth.onAuthStateChange((event, session) => {
    // Token refreshes don't change who is signed in; don't re-check anything.
    if (event === 'TOKEN_REFRESHED' && session?.user?.id === state.user?.id) { emit({ session }); return; }
    if (event === 'SIGNED_OUT') roleCache.clear();
    applySession(session);
  });
}

export function useAuth() {
  const [s, setS] = useState<AuthState>(state);
  useEffect(() => {
    start();
    listeners.add(setS);
    setS(state);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
}
