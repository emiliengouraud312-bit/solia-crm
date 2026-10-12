// Base vide contenant seulement les référentiels de data/ (équipe, offres, planning).
import { ACTIVITES, DATE_DEMO, DEPARTS, EQUIPE, OFFRES } from '../domain/referentiel'
import type { Base } from '../domain/types'

export function baseReferentiel(): Base {
  return {
    version_seed: 'referentiel',
    equipe: structuredClone(EQUIPE),
    offres: structuredClone(OFFRES),
    departs: structuredClone(DEPARTS),
    activites: structuredClone(ACTIVITES),
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
