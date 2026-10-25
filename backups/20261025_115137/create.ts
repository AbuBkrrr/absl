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

    // Extract user_id from Bearer token (guests allowed)
    let userId: string | null = null;
    try {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const { data } = await supabase.auth.getUser(token);
        userId = data?.user?.id || null;
      }
    } catch {
      // Guest checkout — proceed without user_id
    }

    // 1. Save booking
    const { error } = await supabase.from('absl_bookings').insert({
      user_id: userId,
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

    // 2. Auto-accrue loyalty miles (1 mile per ₦1,000 spent)
    let milesEarned = 0;
    if (userId && total > 0) {
      // 1. Calculate custom points from the cart items
      const customPoints = body.cart.reduce((sum: number, item: any) => sum + ((item.points || 0) * Number(item.qty)), 0);
      
      // 2. Use custom points if set, otherwise fallback to 1 mile per ₦1,000
      milesEarned = customPoints > 0 ? customPoints : Math.floor(total / 1000);
      if (milesEarned > 0) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 2);
        try {
          await supabase.from('absl_rewards_loyalty').insert({
            user_id: userId,
            airline: 'ABSL Booking Rewards',
            points: milesEarned,
            tier: 'Bronze',
            expiry: expiryDate.toISOString().slice(0, 10)
          });
        } catch (e) {
          // Non-fatal: booking still succeeded even if miles failed
          console.error('Auto-miles insert failed:', e);
        }
      }
    }

    // 3. Send confirmation email (with miles info if earned)
    if (body.email && import.meta.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'ABSL Bookings <bookings@absl.com.ng>',
          to: [body.email],
          subject: 'Booking Received - ABSL',
          html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>Hi ${body.name},</h2>
              <p>Thank you for booking with ABSL. We have received your order.</p>
              <p><strong>Total Amount:</strong> ₦${total.toLocaleString()}</p>
              ${milesEarned > 0 ? `<p>🎉 You have earned <strong>${milesEarned.toLocaleString()} loyalty miles</strong> on this booking.</p>` : ''}
              <p>Our team will contact you shortly on ${body.phone} to finalize payment and delivery.</p>
              <br>
              <p><em>Allstates Business Solutions & Logistics Ltd</em></p>
            </div>
          `
        });
      } catch (e) {
        console.error('Booking email send failed:', e);
      }
    }

    return new Response('ok');
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};