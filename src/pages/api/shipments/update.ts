import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, status, location, estimated_delivery } = await request.json();

    // 1. Get current shipment (select * to safely handle unknown columns)
    const { data: current, error: fetchErr } = await supabase
      .from('absl_shipments')
      .select('*')
      .eq('id', id)
      .single();
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

    // 4. Notify customer if they have an email (column may or may not exist)
    if (current.customer_email && import.meta.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'ABSL Logistics <logistics@absl.com.ng>',
          to: [current.customer_email],
          subject: `Shipment Update: ${status} | ABSL`,
          html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>Hi ${current.customer_name || 'there'},</h2>
              <p>Your shipment${current.tracking_number ? ` (<strong>${current.tracking_number}</strong>)` : ''} has been updated:</p>
              <p style="font-size: 1.2rem;"><strong>Status:</strong> ${status}</p>
              ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
              ${estimated_delivery ? `<p><strong>Estimated delivery:</strong> ${estimated_delivery}</p>` : ''}
              <p>Track anytime at <a href="https://absl.com.ng/account">absl.com.ng/account</a></p>
              <br>
              <p><em>Allstates Business Solutions & Logistics Ltd</em></p>
            </div>
          `
        });
      } catch (e) {
        console.error('Shipment email send failed:', e);
      }
    }

    return new Response('ok');
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};