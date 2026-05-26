import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Supabase environment variables are missing');
}

export const supabaseAdmin = createClient(
  supabaseUrl!,   // Type assertion (OK because it's not null)
  supabaseServiceRoleKey!   // Type assertion (OK because it's not null)
);
