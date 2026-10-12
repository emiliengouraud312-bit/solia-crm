// Choix de l'adaptateur de données : Supabase si les variables d'environnement sont définies,
// sinon les données de démo locales (dans le navigateur).
import type { DataStore } from './DataStore'
import { LocalStore } from './LocalStore'
import { chargerSeed } from './seed'
import { clientSupabase, supabaseConfigure } from './supabase'
import { SupabaseStore } from './SupabaseStore'

export { supabaseConfigure }

export function creerStore(): DataStore {
  return supabaseConfigure() ? new SupabaseStore(clientSupabase(), chargerSeed) : new LocalStore(chargerSeed)
}
