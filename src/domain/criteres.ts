// Correspondance entre les actions du CRM (types d'événements) et les critères de scoring.
// Source : docs/02-scoring.md, tableau « Correspondance entre actions et critères ».
import { REGLES_SCORING } from './referentiel'
import type { Evenement, Origine, TypeEvenement } from './types'

export const CRITERE_PAR_TYPE: Partial<Record<TypeEvenement, string>> = {
  clic_bienvenue: 'C4',
  clic_newsletter: 'C5',
  interaction_sociale: 'C7',
  telechargement_programme: 'C8',
  demande_ecrite: 'C9',
  appel_entrant: 'C10',
  visite_agence: 'C11',
  reponse_relance: 'C12',
  rdv_accepte: 'C13',
  rdv_realise: 'C14',
  accord_devis: 'C15',
  relance_devis_aboutie: 'C16',
  question_modalites: 'C17',
  liste_attente: 'C20',
  coordonnee_invalide: 'N3',
  rdv_non_honore: 'N4',
  devis_expire: 'N5',
  refus: 'N6',
}

/** Critère d'origine : un parrainage ne compte que si le parrain est enregistré (code valide). */
export function critereOrigine(origine: Origine, parrainEnregistre: boolean): 'C1' | 'C2' | 'C3' | null {
  if (origine === 'parrainage') return parrainEnregistre ? 'C1' : null
  if (origine === 'stand' || origine === 'agence' || origine === 'partenaire') return 'C2'
  if (origine === 'flyer_qr' || origine === 'site') return 'C3'
  return null // réseau social, appel entrant : pas de point d'origine
}

/** Code du critère porté par un événement du journal (null si l'événement ne rapporte rien). */
export function critereDeLEvenement(evenement: Pick<Evenement, 'type' | 'details'>): string | null {
  if (evenement.type === 'origine') {
    return critereOrigine(evenement.details.origine as Origine, Boolean(evenement.details.parrain_id))
  }
  return CRITERE_PAR_TYPE[evenement.type] ?? null
}

/** Une « nouvelle demande » lève N5 (devis expiré) et N6 (refus). */
export const TYPES_NOUVELLE_DEMANDE: TypeEvenement[] = ['demande_ecrite', 'appel_entrant', 'visite_agence']

/** Points d'un critère (P1 à P7, C1 à C20, N1 à N6, E1 à E15, M1 à M5), lus dans data/scoring-rules.json. */
export function pointsDuCritere(code: string): number | null {
  const r = REGLES_SCORING
  const tous: { code: string; points: number }[] = [
    ...r.conversion.profil,
    ...r.conversion.comportement,
    ...r.conversion.negatifs,
    ...r.engagement.criteres,
    ...r.engagement.negatifs,
  ]
  return tous.find((c) => c.code === code)?.points ?? null
}
