import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * The project URL and anon key are public by design: they ship to every browser,
 * and row-level security on the database decides what each user can touch.
 * Set them here or with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 * With neither, the app runs without accounts and keeps progress in the browser.
 */
const URL = import.meta.env.VITE_SUPABASE_URL ?? ""
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } }) : null
