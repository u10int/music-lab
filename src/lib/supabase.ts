import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * The project URL and anon key are public by design: they ship to every browser,
 * and row-level security on the database decides what each user can touch.
 * Override them with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY; set both to
 * empty strings to run without accounts.
 */
const URL = import.meta.env.VITE_SUPABASE_URL ?? "https://ngmtjzxfvwiixvlvtqhp.supabase.co"
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_bKTR6UfoSF3jTLIbj-1MOg_VcOXdQEv"

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } }) : null
