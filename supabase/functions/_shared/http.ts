import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from './cors.ts';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

export async function getUser(req: Request): Promise<User | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await anon.auth.getUser(auth.slice(7));
  return error ? null : data.user;
}

export const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** DB triggers (pg_net) call with x-internal-secret; admins retry from the panel with their JWT. */
export async function isInternalOrAdmin(req: Request, db: SupabaseClient): Promise<boolean> {
  const secret = Deno.env.get('SHIPPING_HOOK_SECRET');
  if (secret && req.headers.get('x-internal-secret') === secret) return true;
  const user = await getUser(req);
  return !!user && (await isAdmin(db, user.id));
}

export async function isAdmin(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.rpc('has_role', { _user_id: userId, _role: 'admin' });
  return data === true;
}
