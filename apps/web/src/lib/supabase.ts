import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client — Realtime subscriptions only.
// Never put the service role key here; only the anon key.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
