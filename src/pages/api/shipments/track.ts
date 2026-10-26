import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { tracking_number } = await request.json();
    if (!tracking_number) return new Response('Tracking number required', { status: 400 });

    const { data, error } = await supabase
      .from('absl_shipments')
      .select('*')
      .eq('tracking_number', tracking_number)
      .single();

    if (error || !data) return new Response('Shipment not found', { status: 404 });
    
    return new Response(JSON.stringify(data), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};