// Chargement des fichiers de data/ : équipe, offres, planning, modèles de messages, règles de scoring.
// Ces fichiers sont la source unique : le seed, LocalStore et (plus tard) Supabase en dérivent.
import equipeJson from '../../data/equipe.json'
import offresJson from '../../data/offres.json'
import departsJson from '../../data/planning-departs.json'
import activitesJson from '../../data/planning-activites.json'
import messagesJson from '../../data/messages.json'
import scoringJson from '../../data/scoring-rules.json'
import type { Activite, Cible, Depart, MembreEquipe, ModeleMessage, Offre } from './types'

/** Date de démonstration devant le jury (paramètre date_reference par défaut). */
export const DATE_DEMO = '2026-11-30'

export const EQUIPE: MembreEquipe[] = equipeJson.map((membre) => ({
  id: membre.id,
  prenom: membre.prenom,
  fonction: membre.fonction,
  cible_referente: membre.cible_referente as Cible | null,
  email: membre.email_demo,
}))

export const OFFRES: Offre[] = offresJson.map((offre) => ({
  id: offre.id,
  nom: offre.nom,
  cible: offre.cible as Cible,
  destination: offre.destination,
  pays: offre.pays,
  jours: offre.jours,
  nuits: offre.nuits,
  prix_ttc: offre.prix_ttc,
  places_max: offre.places_max,
  transport: offre.transport,
  hebergement: offre.hebergement,
  ...('a_verifier' in offre && offre.a_verifier ? { a_verifier: offre.a_verifier } : {}),
}))

export const DEPARTS: Depart[] = departsJson.map((depart) => ({ ...depart, cible: depart.cible as Cible }))

export const ACTIVITES: Activite[] = activitesJson.map((activite) => ({ ...activite, cible: activite.cible as Cible }))

export const MESSAGES: ModeleMessage[] = messagesJson

export const REGLES_SCORING = scoringJson
export type ReglesScoring = typeof scoringJson

/** La référente est attribuée automatiquement selon la cible (process 01). */
export function referentePourCible(cible: Cible): string {
  const membre = EQUIPE.find((m) => m.cible_referente === cible)
  if (!membre) throw new Error(`Aucune référente pour la cible ${cible}`)
  return membre.id
}
