// La frise du parcours client (cahier des charges, section 4) : 7 phases, 24 jalons,
// et le PIN Solia posé sur le jalon le plus avancé atteint à la date de référence.
// Fonction pure : elle lit les données datées, elle ne modifie rien.
import { ajouterJours, ecartJours, estPasse, horodatage, jour } from './dates'
import type { DonneesContact, LigneDetail, Planning, ScoreResult } from './scoring'
import type { DateISO, Depart, Evenement, Horodatage, Reservation, TypeEvenement } from './types'

export type CodePhase = 'curiosite' | 'consideration' | 'achat' | 'avant' | 'pendant' | 'apres' | 'loyaute'

export const PHASES: { code: CodePhase; libelle: string; points: string; process: string; jalons: [string, string][] }[] = [
  { code: 'curiosite', libelle: 'Curiosité', points: '1 à 14', process: '01', jalons: [['capte', 'Contact capté'], ['bienvenue', 'Bienvenue envoyée']] },
  {
    code: 'consideration',
    libelle: 'Considération',
    points: '15 à 29',
    process: '02, 03, 04',
    jalons: [['demande', 'Demande'], ['reponse', 'Réponse personnelle'], ['decouverte', 'Découverte'], ['devis', 'Devis envoyé'], ['relance_devis', 'Relance du devis']],
  },
  { code: 'achat', libelle: 'Achat', points: '30 à 32', process: '04, 05', jalons: [['reserve', 'Réservé'], ['confirmation', 'Confirmation'], ['appel_bienvenue', 'Appel de bienvenue']] },
  { code: 'avant', libelle: 'Avant', points: '33 à 38', process: '06, 07', jalons: [['groupe', 'Groupe WhatsApp'], ['solde', 'Solde réglé'], ['brise_glace', 'Soli\'apéro brise-glace']] },
  { code: 'pendant', libelle: 'Pendant', points: '39 à 45', process: '08', jalons: [['depart', 'Départ'], ['mi_sejour', 'Point mi-séjour'], ['satisfaction', 'Satisfaction à chaud']] },
  {
    code: 'apres',
    libelle: 'Après',
    points: '46 à 55',
    process: '09 à 12',
    jalons: [['retour', 'Retour'], ['soliapero_retour', 'Soli\'apéro retour'], ['enquete', 'Enquête'], ['avis', 'Avis']],
  },
  {
    code: 'loyaute',
    libelle: 'Loyauté',
    points: '56 à 70',
    process: '13 à 15',
    jalons: [['abonne', 'Abonné'], ['activites', 'Activités'], ['parrainage', 'Parrainage'], ['nouveau_voyage', 'Nouveau voyage']],
  },
]

export interface Jalon {
  code: string
  libelle: string
  phase: CodePhase
  /** Rang du jalon sur la frise (0 à 23). */
  indice: number
  atteint: boolean
  date: Horodatage | null
  detail: string | null
}

export interface Parcours {
  phases: (Omit<(typeof PHASES)[number], 'jalons'> & { jalons: Jalon[] })[]
  jalons: Jalon[]
  /** Jalon sur lequel se pose le PIN (le plus avancé atteint), ou null si la fiche n'existe pas encore. */
  actuel: Jalon | null
  /** PIN grisé : contact Perdu ou Ancien abonné. */
  grise: boolean
  mention: string | null
  /** Voyage affiché sur la frise, et tous les voyages du contact (le plus récent d'abord). */
  reservation: Reservation | null
  depart: Depart | null
  voyages: Reservation[]
  /** Événements du journal qui appartiennent au voyage affiché. */
  evenements: Evenement[]
}

const TYPES_DEMANDE: TypeEvenement[] = ['demande_ecrite', 'appel_entrant', 'visite_agence']

function premier<T extends { date: string }>(elements: T[]): T | undefined {
  return [...elements].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0]
}

function dernier<T extends { date: string }>(elements: T[]): T | undefined {
  return [...elements].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0]
}

/** Badge Ambassadeur : au moins un filleul dont l'acompte est encaissé (process 15). */
export function estAmbassadeur(donnees: DonneesContact, dateReference: DateISO): boolean {
  return donnees.filleuls.some((f) => f.acompte_date && estPasse(f.acompte_date, dateReference))
}

export function calculerParcours(
  donnees: DonneesContact,
  planning: Planning,
  dateReference: DateISO,
  reservationId?: string | null,
): Parcours {
  const { contact } = donnees
  const passe = (date: string | null | undefined): date is string => Boolean(date) && estPasse(date as string, dateReference)
  const evenements = donnees.evenements.filter((e) => passe(e.date))

  // Voyages du contact, du plus récent au plus ancien.
  const voyages = donnees.reservations
    .filter((r) => passe(r.date_reservation))
    .sort((a, b) => (a.date_reservation < b.date_reservation ? 1 : -1))
  const reservation = (reservationId ? voyages.find((r) => r.id === reservationId) : voyages[0]) ?? null
  const depart = reservation ? (planning.departs.find((d) => d.id === reservation.depart_id) ?? null) : null

  // Fenêtre du voyage affiché : un voyage suivant commence avec sa propre demande ou son devis.
  const chronologiques = [...voyages].reverse()
  const debutVoyage = (r: Reservation): string | null => {
    const rang = chronologiques.indexOf(r)
    if (rang <= 0) return null
    const precedent = chronologiques[rang - 1]
    const departs = [r.depart_id, r.depart_initial_id].filter(Boolean)
    const lie = premier(
      evenements.filter((e) => e.date > horodatage(precedent.date_reservation, '23:59') && departs.includes(e.details.depart_id as string)),
    )
    return lie?.date ?? horodatage(r.date_reservation, '00:00')
  }
  const debut = reservation ? debutVoyage(reservation) : null
  const suivant = reservation ? chronologiques[chronologiques.indexOf(reservation) + 1] : undefined
  const fin = suivant ? debutVoyage(suivant) : null
  const dansFenetre = (date: string) => (!debut || date >= debut) && (!fin || date < fin)
  const duVoyage = evenements.filter((e) => dansFenetre(e.date))
  const de = (types: TypeEvenement[], apres?: string | null) =>
    premier(duVoyage.filter((e) => types.includes(e.type) && (!apres || e.date >= apres)))

  // Un voyage annulé s'arrête à la date d'annulation.
  const annulation = reservation?.statut === 'annulee' ? reservation.annulation_date : null
  const avantAnnulation = (date: string | null | undefined): date is string =>
    passe(date) && (!annulation || jour(date) <= annulation)

  const valeurs: Record<string, { date: string; detail?: string | null } | null> = {}
  const poser = (code: string, date: string | null | undefined, detail: string | null = null) => {
    valeurs[code] = date ? { date, detail } : null
  }

  // Curiosité (process 01) : la bienvenue part automatiquement à J+2 (règle R01).
  poser('capte', passe(contact.date_creation) ? contact.date_creation : null)
  const messageBienvenue = dernier(donnees.messages.filter((m) => m.message_code === 'M01' && passe(m.date)))
  const clicBienvenue = premier(evenements.filter((e) => e.type === 'clic_bienvenue'))
  const bienvenueAuto = ajouterJours(contact.date_creation, 2)
  if (messageBienvenue) poser('bienvenue', messageBienvenue.date, 'Message M01')
  else if (clicBienvenue) poser('bienvenue', clicBienvenue.date, 'Lien de bienvenue cliqué')
  else poser('bienvenue', passe(bienvenueAuto) ? horodatage(bienvenueAuto, '09:00') : null, 'Envoi automatique à J+2 (R01)')

  // Considération (process 02 à 04).
  const demande = de(TYPES_DEMANDE)
  poser('demande', demande?.date)
  if (demande && demande.type !== 'demande_ecrite') {
    poser('reponse', demande.date, demande.type === 'appel_entrant' ? 'Réponse en direct au téléphone' : 'Réponse en direct à l\'agence')
  } else {
    poser('reponse', de(['reponse_personnelle', 'rdv_accepte', 'appel_sortant'], demande?.date)?.date)
  }
  poser('decouverte', de(['rdv_realise'])?.date)
  const departsVoyage = reservation ? [reservation.depart_id, reservation.depart_initial_id] : []
  const devis = reservation
    ? premier(duVoyage.filter((e) => e.type === 'devis_envoye' && departsVoyage.includes(e.details.depart_id as string)))
    : dernier(duVoyage.filter((e) => e.type === 'devis_envoye'))
  poser('devis', devis?.date)
  const messageRelance = devis && premier(donnees.messages.filter((m) => m.message_code === 'M07' && m.date >= devis.date && passe(m.date)))
  poser('relance_devis', devis ? (de(['relance_devis_aboutie'], devis.date)?.date ?? messageRelance?.date) : null)

  if (reservation && depart) {
    // Achat (process 04 et 05) : la confirmation part automatiquement le jour même (règle R15).
    const evenementReservation = premier(duVoyage.filter((e) => e.type === 'reservation'))
    poser('reserve', evenementReservation?.date ?? horodatage(reservation.date_reservation, '12:00'))
    const confirmation = premier(donnees.messages.filter((m) => m.message_code === 'M10' && m.date >= reservation.date_reservation && passe(m.date)))
    poser('confirmation', confirmation?.date ?? horodatage(reservation.date_reservation, '18:00'), confirmation ? 'Message M10' : 'Envoi automatique le jour même (R15)')
    poser('appel_bienvenue', avantAnnulation(reservation.appel_bienvenue_date) ? reservation.appel_bienvenue_date : null)

    // Avant (process 06 et 07).
    poser('groupe', avantAnnulation(reservation.ajout_groupe_date) ? reservation.ajout_groupe_date : null)
    poser('solde', avantAnnulation(reservation.solde_date) ? reservation.solde_date : null)
    poser(
      'brise_glace',
      avantAnnulation(depart.soliapero_brise_glace) && reservation.present_brise_glace !== null ? depart.soliapero_brise_glace : null,
      reservation.present_brise_glace ? 'Présent' : 'Absent',
    )

    // Pendant (process 08).
    const miSejour = ajouterJours(depart.date_depart, Math.floor(ecartJours(depart.date_depart, depart.date_retour) / 2))
    poser('depart', avantAnnulation(depart.date_depart) ? depart.date_depart : null)
    poser('mi_sejour', avantAnnulation(miSejour) ? miSejour : null)
    poser(
      'satisfaction',
      avantAnnulation(depart.date_retour) && reservation.note_chaud !== null ? horodatage(depart.date_retour, '20:00') : null,
      `Note à chaud : ${reservation.note_chaud}/10`,
    )

    // Après (process 09 à 12).
    poser('retour', avantAnnulation(depart.date_retour) ? horodatage(depart.date_retour, '21:00') : null)
    poser(
      'soliapero_retour',
      avantAnnulation(depart.soliapero_retour) && reservation.present_retour !== null ? depart.soliapero_retour : null,
      reservation.present_retour ? 'Présent' : 'Absent',
    )
    const enquete = premier(donnees.enquetes.filter((e) => e.reservation_id === reservation.id && passe(e.date)))
    poser('enquete', enquete?.date, enquete ? `Recommandation : ${enquete.nps}/10` : null)
    const avis = premier(
      donnees.avis.filter((a) => a.plateforme === 'google' && a.date >= reservation.date_reservation && passe(a.date) && dansFenetre(a.date)),
    )
    poser('avis', avis?.date ?? (enquete?.avis_google_publie ? enquete.date : null), avis ? `${avis.note} étoiles` : null)

    // Loyauté (process 13 à 15).
    const abonnement = premier(
      donnees.abonnements
        .filter((a) => a.decision === 'abonne' && a.date_debut && a.date_debut >= reservation.date_reservation && passe(a.date_debut) && dansFenetre(a.date_debut))
        .map((a) => ({ ...a, date: a.date_debut as string })),
    )
    poser('abonne', abonnement?.date)
    const presences = donnees.participations
      .filter((p) => p.present === true)
      .flatMap((p) => {
        const activite = planning.activites.find((a) => a.id === p.activite_id)
        return activite && activite.date >= depart.date_retour && passe(activite.date) && dansFenetre(activite.date)
          ? [{ date: activite.date, titre: activite.titre }]
          : []
      })
    const premiereActivite = premier(presences)
    poser('activites', premiereActivite?.date, premiereActivite ? `${presences.length} présence(s)` : null)
    const filleul = premier(donnees.filleuls.filter((f) => passe(f.date) && dansFenetre(f.date)))
    poser('parrainage', filleul?.date, filleul ? `Filleul : ${filleul.nom}` : null)
    const nouveau = donnees.reservations.find((r) => r.date_reservation > reservation.date_reservation && passe(r.date_reservation))
    poser('nouveau_voyage', nouveau?.date_reservation)
  }

  let indice = 0
  const phases = PHASES.map((phase) => ({
    ...phase,
    jalons: phase.jalons.map(([code, libelle]) => {
      const valeur = valeurs[code] ?? null
      return { code, libelle, phase: phase.code, indice: indice++, atteint: valeur !== null, date: valeur?.date ?? null, detail: valeur?.detail ?? null }
    }),
  }))
  const jalons = phases.flatMap((p) => p.jalons)
  const atteints = jalons.filter((j) => j.atteint)
  const actuel = atteints[atteints.length - 1] ?? null

  // PIN grisé pour un contact Perdu (sur la dernière étape atteinte) ou un Ancien abonné (sur Loyauté).
  let mention: string | null = null
  if (contact.statut === 'perdu') {
    const perte = dernier(evenements.filter((e) => e.type === 'statut' && e.details.vers === 'perdu'))
    mention = `Perdu${perte ? ` le ${jour(perte.date).split('-').reverse().join('/')}` : ''}${contact.motif_perte ? ` : ${contact.motif_perte}` : ''}`
  } else if (contact.statut === 'ancien_abonne') {
    const resiliation = donnees.abonnements.find((a) => a.date_fin && a.motif_resiliation)
    mention = `Ancien abonné${resiliation?.date_fin ? ` depuis le ${resiliation.date_fin.split('-').reverse().join('/')}` : ''}${resiliation?.motif_resiliation ? ` : ${resiliation.motif_resiliation}` : ''}`
  }

  return {
    phases,
    jalons,
    actuel,
    grise: contact.statut === 'perdu' || contact.statut === 'ancien_abonne',
    mention,
    reservation,
    depart,
    voyages,
    evenements: duVoyage,
  }
}

// ---------------------------------------------------------------------------
// Pastilles sous la frise : chaque événement du journal, rangé dans sa phase, avec ses points
// ---------------------------------------------------------------------------

const PHASE_PAR_TYPE: Partial<Record<TypeEvenement, CodePhase>> = {
  origine: 'curiosite',
  demande_ecrite: 'consideration',
  appel_entrant: 'consideration',
  visite_agence: 'consideration',
  reponse_personnelle: 'consideration',
  reponse_relance: 'consideration',
  rdv_accepte: 'consideration',
  rdv_realise: 'consideration',
  rdv_non_honore: 'consideration',
  dates_confirmees: 'consideration',
  budget_confirme: 'consideration',
  accord_devis: 'consideration',
  devis_envoye: 'consideration',
  relance_devis_aboutie: 'consideration',
  question_modalites: 'consideration',
  liste_attente: 'consideration',
  devis_expire: 'consideration',
  refus: 'consideration',
  reservation: 'achat',
  fiche_passation: 'achat',
  appel_bienvenue: 'achat',
  ajout_groupe: 'avant',
  solde: 'avant',
  mise_en_demeure: 'avant',
  report: 'avant',
  annulation: 'avant',
  satisfaction_chaud: 'pendant',
  enquete: 'apres',
  avis: 'apres',
  souscription: 'loyaute',
  resiliation: 'loyaute',
  parrainage: 'loyaute',
}

/**
 * Phase dans laquelle ranger un élément du journal (null pour les simples changements de statut et la création).
 * Accepte un événement, ou un élément du journal unifié (consentement, présence à une activité, message).
 */
export function phaseDeLEvenement(
  evenement: { type: string; date: string; details?: unknown; details_bruts?: Record<string, unknown> },
  parcours: Parcours,
): CodePhase | null {
  if (evenement.type === 'statut' || evenement.type === 'creation') return null
  const details = (evenement.details_bruts ?? evenement.details ?? {}) as Record<string, unknown>
  if (evenement.type === 'presence_soliapero') return details.moment === 'retour' ? 'apres' : 'avant'
  const parType = PHASE_PAR_TYPE[evenement.type as TypeEvenement]
  if (parType) return parType
  // Les autres événements (clics, notes, appels sortants, messages, réclamations) se rangent selon leur date.
  const date = (code: string) => parcours.jalons.find((j) => j.code === code)?.date ?? null
  const d = evenement.date
  const demande = date('demande')
  const reserve = date('reserve')
  if (!demande || d < demande) return reserve && d >= reserve ? 'avant' : 'curiosite'
  if (!reserve || d < reserve) return 'consideration'
  const depart = parcours.depart
  if (!depart || jour(d) < depart.date_depart) return jour(d) <= jour(date('appel_bienvenue') ?? reserve) ? 'achat' : 'avant'
  if (jour(d) <= depart.date_retour) return 'pendant'
  const abonne = date('abonne')
  return abonne && d >= abonne ? 'loyaute' : 'apres'
}

/** Critères d'engagement prouvés par un type d'événement du journal. */
const ENGAGEMENT_PAR_TYPE: Partial<Record<TypeEvenement, string>> = {
  appel_bienvenue: 'E1',
  solde: 'E3',
  satisfaction_chaud: 'E5',
  enquete: 'E9',
  avis: 'E10',
  souscription: 'E11',
  parrainage: 'E14',
}

export interface PointsEvenement {
  code: string
  points: number
  score: 'conversion' | 'engagement'
}

/**
 * Points gagnés ou perdus par chaque événement : lignes du score de conversion dont il est la preuve,
 * et critères d'engagement obtenus qu'il illustre, sur le voyage qui sert au score d'engagement.
 */
export function pointsParEvenement(
  evenements: Evenement[],
  conversion: ScoreResult,
  engagement: ScoreResult | null,
  reservation: Reservation | null,
  reservations: Reservation[] = [],
): Map<string, PointsEvenement[]> {
  const resultat = new Map<string, PointsEvenement[]>()
  const ajouter = (id: string, point: PointsEvenement) => resultat.set(id, [...(resultat.get(id) ?? []), point])
  for (const ligne of conversion.lignes) {
    if (ligne.preuve_id) ajouter(ligne.preuve_id, { code: ligne.code, points: ligne.points, score: 'conversion' })
  }
  if (engagement && reservation) {
    const obtenus = new Map<string, LigneDetail>(engagement.lignes.filter((l) => l.etat === 'obtenu').map((l) => [l.code, l]))
    const dejaAttribue = new Set<string>()
    const suivante = reservations
      .map((r) => r.date_reservation)
      .filter((d) => d > reservation.date_reservation)
      .sort()[0]
    for (const e of [...evenements].sort((a, b) => (a.date < b.date ? -1 : 1))) {
      if (e.date < reservation.date_reservation || (suivante && e.date >= suivante)) continue
      let code = ENGAGEMENT_PAR_TYPE[e.type]
      if (e.type === 'presence_soliapero' && e.details.present) code = e.details.moment === 'retour' ? 'E8' : 'E4'
      const ligne = code ? obtenus.get(code) : undefined
      if (code && ligne && !dejaAttribue.has(code)) {
        dejaAttribue.add(code)
        ajouter(e.id, { code, points: ligne.points, score: 'engagement' })
      }
    }
    // Critères prouvés par une autre donnée que la réservation (présence à une activité, points négatifs).
    for (const ligne of engagement.lignes) {
      const autrePreuve = ligne.preuve_id && ligne.preuve_id !== reservation.id
      if (autrePreuve && !dejaAttribue.has(ligne.code) && (ligne.etat === 'obtenu' || ligne.bloc === 'negatif')) {
        dejaAttribue.add(ligne.code)
        ajouter(ligne.preuve_id as string, { code: ligne.code, points: ligne.points, score: 'engagement' })
      }
    }
  }
  return resultat
}
