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
    let orgId: string | null = null;
    
    try {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const { data } = await supabase.auth.getUser(token);
        userId = data?.user?.id || null;
        
        // Fetch the user's org_id if they are logged in
        if (userId) {
          const { data: profile } = await supabase.from('absl_profiles').select('org_id').eq('id', userId).single();
          if (profile?.org_id) orgId = profile.org_id;
        }
      }
    } catch {
      // Guest checkout
    }

    // 1. Save booking
    const { error } = await supabase.from('absl_bookings').insert({
      user_id: userId,
      org_id: orgId,
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
      org_id: orgId,
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

        const itemsHtml = body.cart.map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.title} (x${item.qty})</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₦${(Number(item.price) * Number(item.qty)).toLocaleString()}</td>
      </tr>
    `).join('');

    // 3. Send confirmation email (with miles info if earned)
    if (body.email && import.meta.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: 'ABSL Bookings <bookings@absl.com.ng>',
          to: [body.email],
          subject: 'Booking Received - ABSL',
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px;">
              <h2>Hi ${body.name},</h2>
              <p>Thank you for booking with ABSL. We have received your order.</p>
              
              <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; font-size: 16px;">Order Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  ${itemsHtml}
                  <tr>
                    <td style="padding: 12px 8px; font-weight: bold;">Total</td>
                    <td style="padding: 12px 8px; font-weight: bold; text-align: right; color: #1E5F9E;">₦${total.toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              ${milesEarned > 0 
                ? `<div style="background: #eef2f6; border-left: 4px solid #C5A059; padding: 12px; margin: 20px 0;"><strong>🎉 Reward:</strong> You have earned ${milesEarned.toLocaleString()} loyalty miles for this booking!</div>` 
                : (!userId ? `<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; font-size: 14px;"><strong>Tip:</strong> You checked out as a guest. Log in to your account next time to earn loyalty miles on your bookings!</div>` : '')
              }

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