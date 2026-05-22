import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Supabase environment variables are missing');
}

export const supabaseAdmin = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseServiceRoleKey ?? 'placeholder-service-role-key'
);
