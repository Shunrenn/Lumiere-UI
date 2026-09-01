import { createClient } from '@supabase/supabase-js'

// These are injected at build time by vite.config.ts (see `define`).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[v0] Supabase env vars missing. VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY were not injected.',
  )
}

// Singleton browser client. Falls back to harmless placeholders so the module
// never throws at import time (which would blank the whole app).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
