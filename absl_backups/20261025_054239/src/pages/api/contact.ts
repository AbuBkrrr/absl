import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, whatsapp, subject, message } = body;

    if (!name || !email || !message) {
      return new Response('Name, email, and message are required.', { status: 400 });
    }

    // 1. Save to Database
    const { error } = await supabase.from('absl_contact_messages').insert({
      full_name: name,
      email: email,
      whatsapp_number: whatsapp || null,
      subject: subject || 'General Inquiry',
      message: message
    });

    if (error) throw error;

    // 2. Send Email Notification to Admin
    if (import.meta.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'ABSL Notifications <noreply@absl.com.ng>', // Make sure this domain is verified in Resend
        to: ['info@absl.com.ng'], // Your admin email
        subject: `New Contact Message: ${subject || 'No Subject'}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>New Message from ${name}</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>WhatsApp:</strong> ${whatsapp || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; margin-left: 0;">
              ${message}
            </blockquote>
          </div>
        `
      });
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};