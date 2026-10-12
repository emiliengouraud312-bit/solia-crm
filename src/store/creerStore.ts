// Choix de l'adaptateur de données : Supabase si les variables d'environnement sont définies,
// sinon les données de démo locales.
import type { DataStore } from './DataStore'
import { LocalStore } from './LocalStore'
import { chargerSeed } from './seed'

export function supabaseConfigure(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function creerStore(): DataStore {
  // SupabaseStore arrive en phase 4 : en attendant, LocalStore sert dans tous les cas.
  return new LocalStore(chargerSeed)
}
