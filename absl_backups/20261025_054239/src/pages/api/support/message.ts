import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createClient({ request, cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return new Response('Unauthorized', { status: 401 });

    const body = await request.json();
    const { message } = body;

    if (!message) return new Response('Message is required', { status: 400 });

    // Save to contact messages table
    const { error } = await supabase.from('absl_contact_messages').insert({
      full_name: user.user_metadata?.full_name || 'Client Dashboard User',
      email: user.email,
      subject: 'Inline Dashboard Message',
      message: message
    });

    if (error) throw error;

    // Send Email Notification to Admin
    if (import.meta.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'ABSL Notifications <noreply@absl.com.ng>',
        to: ['info@absl.com.ng'],
        subject: `New Dashboard Message from ${user.email}`,
        html: `<p><strong>From:</strong> ${user.email}</p><p><strong>Message:</strong></p><p>${message}</p>`
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};