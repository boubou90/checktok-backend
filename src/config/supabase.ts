import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Client Supabase avec service role key pour les opérations backend
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
