import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, status } = await request.json();
    const { error } = await supabase.from('absl_contact_messages').update({ status }).eq('id', id);
    
    if (error) return new Response(error.message, { status: 400 });
    return new Response('ok');
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};