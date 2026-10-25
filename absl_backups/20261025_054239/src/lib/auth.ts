import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const adminSupabase = createClient(supabaseUrl, supabaseAnonKey);

export async function verifyAdmin(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token) return false;

    const { data: { user } } = await adminSupabase.auth.getUser(token);
    if (!user) return false;

    const { data: profile } = await adminSupabase.from('absl_profiles').select('role, is_admin').eq('id', user.id).single();
    
    // Allow if role is not customer OR is_admin is true
    return (profile?.role && profile.role !== 'customer') || profile?.is_admin === true;
  } catch (e) {
    return false;
  }
}