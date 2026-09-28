import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** slug → name for every category (so admins pick a category and its current name shows). */
export function useCategoryNames(): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from('categories').select('slug, name').then(({ data }) =>
      setNames(Object.fromEntries((data || []).map((c) => [c.slug, c.name]))));
  }, []);
  return names;
}
