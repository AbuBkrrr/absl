import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, is_admin } = await request.json();
    if (!id) return new Response('Missing id', { status: 400 });
    const { error } = await supabase.from('absl_profiles').update({ is_admin }).eq('id', id);
    if (error) return new Response(error.message, { status: 400 });
    return new Response('ok');
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};