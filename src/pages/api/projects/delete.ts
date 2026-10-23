import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const { id } = await request.json();
  const { error } = await supabase.from('absl_projects').delete().eq('id', id);
  if (error) return new Response(error.message, { status: 400 });
  return new Response('ok');
};