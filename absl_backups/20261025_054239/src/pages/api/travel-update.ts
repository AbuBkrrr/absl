import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, status } = await request.json();

    // 1. Fetch the booking details first so we have the customer's email
    const { data: booking, error: fetchError } = await supabase
      .from('absl_travel_bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      throw new Error('Booking not found');
    }

    // 2. Update the status in the database
    const { error: updateError } = await supabase
      .from('absl_travel_bookings')
      .update({ status })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. Send an email to the customer notifying them of the status change
    const statusColors = {
      pending: '#C5A059',
      contacted: '#1E5F9E',
      confirmed: '#0F7B4A',
      cancelled: '#EF4444'
    };

    const statusColor = statusColors[status] || '#C5A059';

    const { error: emailError } = await resend.emails.send({
      from: 'ABSL Travel <noreply@absl.com.ng>',
      to: [booking.customer_email],
      subject: `Update on your ${booking.service_type} Request - ABSL`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0A1128;">
          <h2 style="color: #C5A059;">Request Status Update</h2>
          <p>Dear ${booking.customer_name},</p>
          <p>The status of your <strong>${booking.service_type}</strong> request has been updated.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 0.9em; color: #666; text-transform: uppercase; letter-spacing: 1px;">New Status</p>
            <h3 style="margin: 8px 0 0 0; color: ${statusColor}; font-size: 1.5rem; text-transform: uppercase;">
              ${status}
            </h3>
          </div>

          <p>Our team will be in touch shortly if further action is needed from your side. If you have any questions, feel free to reply to this email or call us.</p>
          
          <br/>
          <p style="color: #C5A059; font-weight: bold;">Allstates Business Solutions & Logistics Ltd</p>
        </div>
      `
    });

    if (emailError) {
      console.error('Failed to send status email:', emailError);
      // We don't throw here because the status was updated successfully
    }

    return new Response('ok');
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};