import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { service_type, customer_name, customer_email, customer_phone, details } = body;

    if (!customer_name || !customer_email) {
      return new Response('Missing required fields', { status: 400 });
    }

    // 1. Save to Database
    const { error: dbError } = await supabase.from('absl_travel_bookings').insert({
      service_type,
      customer_name,
      customer_email,
      customer_phone,
      details
    });

    if (dbError) throw dbError;

    // 2. Format Details for Email
    const detailsHtml = Object.entries(details)
      .map(([key, val]) => `<tr><td style="padding:8px; border-bottom:1px solid #eee; color:#555;">${key}</td><td style="padding:8px; border-bottom:1px solid #eee; font-weight:bold; color:#111;">${val}</td></tr>`)
      .join('');

    // 3. Send Email to Customer via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'ABSL Travel <noreply@absl.com.ng>',
      to: [customer_email],
      subject: `Your ${service_type} Request - ABSL`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0A1128;">
          <h2 style="color: #C5A059;">Request Received!</h2>
          <p>Dear ${customer_name},</p>
          <p>Thank you for choosing ABSL. We have received your request for a <strong>${service_type}</strong>.</p>
          <p>Our travel desk is currently reviewing your details and will contact you shortly at <strong>${customer_phone}</strong> to finalize your booking.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0A1128;">Your Request Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${detailsHtml}
            </table>
          </div>

          <p style="font-size: 0.9em; color: #666;">If you did not make this request, please contact us immediately.</p>
          <br/>
          <p style="color: #C5A059; font-weight: bold;">Allstates Business Solutions & Logistics Ltd</p>
        </div>
      `
    });

    if (emailError) {
      console.error('Resend Error:', emailError);
      // We don't throw here, because the DB save succeeded. The user just didn't get an email.
    }

    // 4. Send Email to Admin (You)
    const { data: adminData, error: adminError } = await resend.emails.send({
      from: 'ABSL System <system@absl.com.ng>',
      to: ['info@absl.com.ng'], // Change this to your actual admin email
      subject: `NEW BOOKING: ${service_type} - ${customer_name}`,
      html: `
        <h2>New Booking Request</h2>
        <p><strong>Name:</strong> ${customer_name}</p>
        <p><strong>Email:</strong> ${customer_email}</p>
        <p><strong>Phone:</strong> ${customer_phone}</p>
        <p><strong>Service:</strong> ${service_type}</p>
        <h3>Details:</h3>
        <pre>${JSON.stringify(details, null, 2)}</pre>
        <p><a href="https://absl.com.ng/admin/travel">Go to Admin Dashboard</a></p>
      `
    });

    if (adminError) {
      console.error('Admin Email Failed:', adminError);
    } else {

    }

    return new Response('OK', { status: 200 });

  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};