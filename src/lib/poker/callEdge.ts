import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Shared utility to call Supabase Edge Functions.
 * Supports GET (params as query string) and POST (params as JSON body).
 */
export async function callEdge(fn: string, body: any, method: 'GET' | 'POST' = 'POST') {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const url = method === 'GET' && body
    ? `${SUPABASE_URL}/functions/v1/${fn}?${new URLSearchParams(body).toString()}`
    : `${SUPABASE_URL}/functions/v1/${fn}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Edge function error');
  return data;
}
