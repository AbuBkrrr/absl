import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createClient({ request, cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return new Response('Unauthorized', { status: 401 });

    const body = await request.json();
    const { sqm, duration, description } = body;

    if (!sqm || !duration) {
      return new Response('Missing required fields', { status: 400 });
    }

    const { error } = await supabase.from('absl_warehouse_requests').insert({
      user_id: user.id,
      customer_email: user.email,
      requested_sqm: sqm,
      duration,
      description
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};