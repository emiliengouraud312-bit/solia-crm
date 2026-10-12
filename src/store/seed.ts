// Jeu de données de départ de LocalStore.
import { ACTIVITES, DATE_DEMO, DEPARTS, EQUIPE, OFFRES } from '../domain/referentiel'
import type { Base } from '../domain/types'

/** Base contenant seulement les référentiels de data/ (équipe, offres, planning). */
export function baseReferentiel(): Base {
  return {
    version_seed: 'referentiel',
    equipe: EQUIPE,
    offres: OFFRES,
    departs: DEPARTS,
    activites: ACTIVITES,
    contacts: [],
    consentements: [],
    evenements: [],
    taches: [],
    messages_envoyes: [],
    devis: [],
    reservations: [],
    fiches_passation: [],
    liste_attente: [],
    abonnements: [],
    participations: [],
    enquetes: [],
    parrainages: [],
    reclamations: [],
    avis: [],
    parametres: [{ id: 'parametres', date_reference: DATE_DEMO }],
  }
}

export async function chargerSeed(): Promise<Base> {
  return baseReferentiel()
}
