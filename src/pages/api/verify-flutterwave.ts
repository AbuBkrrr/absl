import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { transaction_id } = await request.json();

    if (!transaction_id) return new Response('Missing transaction ID', { status: 400 });

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${import.meta.env.FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data.status === 'successful') {
      return new Response(JSON.stringify({ status: 'success', amount: data.data.amount }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ status: 'failed', message: 'Payment not successful' }), { status: 400 });
    }
  } catch (err: any) {
    return new Response('Server error: ' + err.message, { status: 500 });
  }
};