import { defineMiddleware } from 'astro:middleware';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';

export const onRequest = defineMiddleware(async (context, next) => {
  // CRITICAL FIX: Skip middleware for the OAuth callback route
  // This prevents the middleware from accidentally wiping the PKCE code-verifier cookie
  if (context.url.pathname.startsWith('/api/auth/callback')) {
    return next();
  }

  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            context.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session and sync cookies for all other routes
  await supabase.auth.getSession();

  return next();
});