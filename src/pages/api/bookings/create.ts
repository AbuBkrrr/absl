import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.cart || body.cart.length === 0) return new Response('Empty cart', { status: 400 });
    if (!body.name || !body.phone) return new Response('Missing details', { status: 400 });

    const total = body.cart.reduce((s: number, i: any) => s + (Number(i.qty) * Number(i.price)), 0);

    // 1. Save to DB
    const { error } = await supabase.from('absl_bookings').insert({
      customer_name: body.name,
      customer_phone: body.phone,
      customer_email: body.email || null,
      delivery_location: body.location || null,
      notes: body.notes || null,
      items: body.cart,
      total_amount: total,
      payment_status: 'pending',
      booking_status: 'pending'
    });

    if (error) throw error;

    // 2. Send Email to Customer (If they provided an email)
    if (body.email && import.meta.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'ABSL Bookings <bookings@absl.com.ng>',
        to: [body.email],
        subject: 'Booking Received - ABSL',
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>Hi ${body.name},</h2>
            <p>Thank you for booking with ABSL. We have received your order.</p>
            <p><strong>Total Amount:</strong> ₦${total.toLocaleString()}</p>
            <p>Our team will contact you shortly on ${body.phone} to finalize payment and delivery.</p>
            <br>
            <p><em>Allstates Business Solutions & Logistics Ltd</em></p>
          </div>
        `
      });
    }

    return new Response('ok');
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};