import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, status } = await request.json();
    const { error } = await supabase.from('absl_travel_bookings').update({ status }).eq('id', id);
    if (error) throw error;
    return new Response('ok');
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};