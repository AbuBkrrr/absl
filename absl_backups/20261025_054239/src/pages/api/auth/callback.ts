import type { APIRoute } from 'astro';
import { createClient } from '../../../lib/supabase';

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/account';

  if (!code) {
    console.error("Callback Error: No code parameter found in URL.");
    return redirect('/login?error=missing_code_from_supabase');
  }

  const supabase = createClient({ request, cookies });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Exchange Code Error:", error.message);
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  return redirect(next);
};