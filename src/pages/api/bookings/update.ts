import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { verifyAdmin } from '../../../lib/auth';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  if (!(await verifyAdmin(request))) return new Response('Unauthorized', { status: 401 });
  const { id, status } = await request.json();

  // Fetch booking for notification + status diff
  const { data: booking } = await supabase
    .from('absl_bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (!booking) return new Response('Booking not found', { status: 404 });

  const statusChanged = booking.booking_status !== status;

  const { error } = await supabase
    .from('absl_bookings')
    .update({ booking_status: status })
    .eq('id', id);

  if (error) return new Response(error.message, { status: 400 });

  // Notify customer only if status actually changed
  if (statusChanged && booking.customer_email && import.meta.env.RESEND_API_KEY) {
    try {
      const statusMessages: Record<string, string> = {
        pending: 'Your booking is pending review. We will contact you shortly.',
        confirmed: 'Your booking has been confirmed. Our team will be in touch soon.',
        in_progress: 'Work on your booking is now in progress.',
        completed: 'Your booking has been completed. Thank you for choosing ABSL!',
        cancelled: 'Your booking has been cancelled. Please contact us if this was in error.'
      };
      await resend.emails.send({
        from: 'ABSL Bookings <bookings@absl.com.ng>',
        to: [booking.customer_email],
        subject: `Booking Update: ${status.replace('_', ' ')} | ABSL`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>Hi ${booking.customer_name || 'there'},</h2>
            <p>Your booking status has been updated to: <strong style="text-transform:uppercase;">${status.replace('_', ' ')}</strong></p>
            <p>${statusMessages[status] || 'Your booking status has changed.'}</p>
            <p><strong>Total Amount:</strong> ₦${Number(booking.total_amount).toLocaleString()}</p>
            <p>Questions? Reply to this email or call +234 803 335 5060.</p>
            <br>
            <p><em>Allstates Business Solutions & Logistics Ltd</em></p>
          </div>
        `
      });
    } catch (e) {
      console.error('Status update email failed:', e);
    }
  }

  return new Response('ok');
};