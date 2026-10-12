// Client Supabase, créé seulement si les deux variables d'environnement sont définies (voir .env.example).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function supabaseConfigure(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function clientSupabase(): SupabaseClient {
  if (!client) client = createClient(import.meta.env.VITE_SUPABASE_URL ?? '', import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')
  return client
}
