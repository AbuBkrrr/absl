import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import type { AstroCookies } from "astro";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ SUPABASE ERROR: Missing environment variables in .env file.");
}

// 1. Standard Browser Client (For existing pages and scripts)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// 2. SSR Server Client (For API routes and OAuth Callback)
export function createClient({ request, cookies }: { request: Request; cookies: AstroCookies }) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookies.set(name, value, options)
        );
      },
    },
  });
}