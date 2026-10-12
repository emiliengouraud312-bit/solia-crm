// Membre de l'équipe correspondant au compte connecté (mode Supabase).
import type { MembreEquipe } from './types'

/**
 * Par l'e-mail du compte (jezabel@solia.demo) ; à défaut par le prénom avant l'arobase ou après un « + »
 * (emilien.gouraud+jezabel@gmail.com donne Jezabel), si l'équipe utilise d'autres adresses.
 */
export function membreDuCompte(email: string | null | undefined, equipe: MembreEquipe[]): MembreEquipe | null {
  if (!email) return null
  const adresse = email.trim().toLowerCase()
  const exact = equipe.find((m) => m.email.toLowerCase() === adresse)
  if (exact) return exact
  const local = adresse.split('@')[0]
  const candidat = local.includes('+') ? local.split('+').pop() : local
  return equipe.find((m) => m.id === candidat) ?? null
}
