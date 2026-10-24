import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return new Response('Name, email, and message are required.', { status: 400 });
    }

    const { error } = await supabase.from('absl_contact_messages').insert({
      full_name: name,
      email: email,
      subject: subject || 'General Inquiry',
      message: message
    });

    if (error) {
      console.error('Supabase Error:', error);
      return new Response(error.message, { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};