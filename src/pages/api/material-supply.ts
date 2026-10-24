import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { transaction_id, tx_ref, amount, customer_name, customer_email, customer_phone, items } = await request.json();

    if (!transaction_id) return new Response('Missing transaction ID', { status: 400 });

    // 1. Verify payment with Flutterwave
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${import.meta.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.status !== 'success' || data.data.status !== 'successful') {
      return new Response(JSON.stringify({ status: 'failed', message: 'Payment not successful' }), { status: 400 });
    }

    // 2. Save to Database
    const { error: dbError } = await supabase.from('absl_material_orders').insert({
      customer_name,
      customer_email,
      customer_phone,
      items,
      total_amount: data.data.amount,
      payment_status: 'paid',
      tx_ref
    });

    if (dbError) console.error('DB Save Error:', dbError);

    // 3. Format items for email
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">${item.qty} ${item.unit}</td>
        <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">₦${Number(item.price).toLocaleString()}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #0A1128;">
        <h2 style="color: #C5A059;">Payment Receipt: Material Supply</h2>
        <p>Dear ${customer_name},</p>
        <p>Thank you for your payment. ABSL has successfully received your order for building materials.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0A1128;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="text-align:left; background:#eef2f6;">
                <th style="padding:8px;">Material</th>
                <th style="padding:8px; text-align:center;">Qty</th>
                <th style="padding:8px; text-align:right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <h3 style="text-align:right; margin-top:20px; color: #C5A059;">Total Paid: ₦${Number(data.data.amount).toLocaleString()}</h3>
        </div>

        <p>Our logistics team will contact you shortly to arrange delivery.</p>
        <br/>
        <p style="color: #C5A059; font-weight: bold;">Allstates Business Solutions & Logistics Ltd</p>
      </div>
    `;

    // 4. Send receipt to Customer AND accounts@absl.com.ng
    await resend.emails.send({
      from: 'ABSL Accounts <accounts@absl.com.ng>',
      to: [customer_email, 'accounts@absl.com.ng'],
      subject: `Payment Receipt - Material Supply Order`,
      html: emailHtml
    });

    return new Response(JSON.stringify({ status: 'success' }), { status: 200 });

  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};