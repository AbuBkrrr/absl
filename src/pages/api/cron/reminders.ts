import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const GET: APIRoute = async ({ request }) => {
  try {
    // Security: Verify Vercel Cron Secret
    const authHeader = request.headers.get('authorization');
    if (import.meta.env.CRON_SECRET && authHeader !== `Bearer ${import.meta.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 1. Calculate the target date (Exactly 7 days from today)
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 7);
    const targetDateString = targetDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // 2. Fetch recent travel bookings (last 90 days to keep query small)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const { data: bookings, error } = await supabase
      .from('absl_travel_bookings')
      .select('*')
      .gte('created_at', ninetyDaysAgo.toISOString());

    if (error) throw error;
    if (!bookings || bookings.length === 0) return new Response('No bookings found', { status: 200 });

    let emailsSent = 0;

    // 3. Loop through bookings and check dates
    for (const booking of bookings) {
      const details = booking.details || {};
      
      // Check all possible date fields
      const possibleDates = [
        details.DEPARTURE, 
        details['CHECK-IN'], 
        details['START DATE'], 
        details['PICK-UP DATE']
      ];

      const hasTripIn7Days = possibleDates.some(date => date && String(date).includes(targetDateString));

      if (hasTripIn7Days && booking.customer_email) {
        // 4. Send the Reminder Email
        await resend.emails.send({
          from: 'ABSL Travel <noreply@absl.com.ng>',
          to: [booking.customer_email],
          subject: `Your ${booking.service_type} is in 7 days! ✈️`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0A1128;">
              <h2 style="color: #1E5F9E;">Your Trip is Approaching!</h2>
              <p>Dear ${booking.customer_name},</p>
              <p>We are excited to remind you that your <strong>${booking.service_type}</strong> is exactly <strong>7 days away</strong>.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0A1128;">Trip Details:</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  ${Object.entries(details).map(([key, val]) => `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #eee; color: #555;">${key}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #111;">${val}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>

              <p>Have you booked your airport transfer yet? Reply to this email or call <strong>+234 803 335 5060</strong> and we can arrange a premium ABSL driver to pick you up.</p>
              <p>Safe travels from all of us at ABSL!</p>
              
              <br/>
              <p style="color: #C5A059; font-weight: bold;">Allstates Business Solutions & Logistics Ltd</p>
            </div>
          `
        });
        emailsSent++;
      }
    }

    return new Response(`Cron job finished. Emails sent: ${emailsSent}`, { status: 200 });

  } catch (err: any) {
    console.error('Cron Error:', err);
    return new Response(err.message, { status: 500 });
  }
};