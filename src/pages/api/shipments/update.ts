import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, status, location, estimated_delivery } = await request.json();
    
    // 1. Get current history
    const { data: current, error: fetchErr } = await supabase.from('absl_shipments').select('history').eq('id', id).single();
    if (fetchErr) throw fetchErr;

    // 2. Append new status to history
    const newHistory = Array.isArray(current.history) ? current.history : [];
    newHistory.push({
      status,
      location,
      timestamp: new Date().toISOString()
    });

    // 3. Update database
    const { error } = await supabase.from('absl_shipments').update({
      status,
      current_location: location,
      estimated_delivery: estimated_delivery || null,
      history: newHistory
    }).eq('id', id);

    if (error) throw error;
    return new Response('ok');
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};