/**
 * Turns any error (Supabase/PostgREST, edge function, JS) into the real, readable cause:
 * message + details + hint, with common database codes translated.
 */
export function describeError(e: unknown): string {
  if (!e) return 'Something went wrong';
  if (typeof e === 'string') return e;
  const err = e as { message?: string; details?: string | null; hint?: string | null; code?: string };
  const friendly: Record<string, string> = {
    '23505': 'That value already exists (duplicate name, slug or SKU).',
    '23503': 'It is still used somewhere else, so it cannot be changed or removed.',
    '23502': 'A required field is empty.',
    '42501': 'You do not have permission to do this (are you signed in as an admin?).',
    'PGRST116': 'The record was not found — it may have been deleted.',
  };
  const parts = [err.code && friendly[err.code] ? friendly[err.code] : null, err.message, err.details, err.hint]
    .filter((x): x is string => !!x && !!String(x).trim());
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  return unique.join(' — ') || 'Something went wrong';
}
