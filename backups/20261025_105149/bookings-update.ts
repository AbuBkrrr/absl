import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { verifyAdmin } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  if (!(await verifyAdmin(request))) return new Response('Unauthorized', { status: 401 });
  const { id, status } = await request.json();
  const { error } = await supabase.from('absl_bookings').update({ booking_status: status }).eq('id', id);
  if (error) return new Response(error.message, { status: 400 });
  return new Response('ok');
};