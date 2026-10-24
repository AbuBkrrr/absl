import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const { to, subject, message, originalMessage } = await request.json();

    if (!to || !message) {
      return new Response('Email and message are required.', { status: 400 });
    }

    const data = await resend.emails.send({
      from: 'ABSL Support <support@absl.com.ng>', // Make sure this domain is verified
      to: [to],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="white-space: pre-wrap; margin-bottom: 20px;">${message}</div>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <div style="font-size: 12px; color: #888;">
            <p><strong>On ${new Date().toLocaleDateString()}, the user wrote:</strong></p>
            <blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 0;">${originalMessage}</blockquote>
          </div>
        </div>
      `
    });

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
};