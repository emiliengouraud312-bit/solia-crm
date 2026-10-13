// Membre de l'équipe correspondant au compte connecté (mode Supabase).
import type { MembreEquipe } from './types'

/**
 * D'abord le membre choisi par la personne à sa première connexion (« Qui êtes-vous ? », gardé dans son
 * compte Supabase) ; sinon l'e-mail de démo (jezabel@solia.demo) ; sinon le prénom avant l'arobase ou
 * après un « + » (adresse+jezabel@gmail.com donne Jezabel).
 */
export function membreDuCompte(email: string | null | undefined, equipe: MembreEquipe[], membreChoisi?: string | null): MembreEquipe | null {
  const choisi = membreChoisi ? equipe.find((m) => m.id === membreChoisi) : undefined
  if (choisi) return choisi
  if (!email) return null
  const adresse = email.trim().toLowerCase()
  const exact = equipe.find((m) => m.email.toLowerCase() === adresse)
  if (exact) return exact
  const local = adresse.split('@')[0]
  const candidat = local.includes('+') ? local.split('+').pop() : local
  return equipe.find((m) => m.id === candidat) ?? null
}
