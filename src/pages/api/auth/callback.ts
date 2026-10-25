import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/account';

  if (code) {
    const supabase = createClient({ request, cookies });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirect(next);
    } else {
      console.error('Auth callback error:', error.message);
      return redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
  }

  // If no code is present, redirect to login with an error
  return redirect('/login?error=no-code');
};