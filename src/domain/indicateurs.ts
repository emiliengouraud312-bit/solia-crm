// Tableau de bord (cahier des charges, sections 3.1 et 9) : chiffres clés, répartition par palier
// et indicateurs des process. Fonctions pures, calculées à la date de référence ; les indicateurs
// portent sur les 90 jours qui précèdent, sauf mention contraire dans leur définition.
import { formatPoints } from '../lib/format'
import { ajouterJours, ecartJours, estPasse, jour, jourSemaine, numeroJour } from './dates'
import { indexerBase, planningDe } from './donneesContact'
import { LIBELLES_CIBLE, LIBELLES_ORIGINE } from './libelles'
import { placesRestantes, reservationActive } from './planning'
import { computeConversion, type ScoreResult } from './scoring'
import { champsManquants } from './statuts'
import { etatTache } from './taches'
import type { Base, Cible, Contact, DateISO, Horodatage, Reservation } from './types'

export const PERIODE_JOURS = 90

export interface Indicateur {
  id: string
  nom: string
  definition: string
  process: string
  /** Valeur affichée (« 62 % », « 8,1 / 10 », « Pas de donnée »). */
  valeur: string
  /** Précision : effectifs, détail par catégorie. */
  detail: string
  /** Indicateur clé du parcours (mis en avant). */
  cle?: boolean
  /** Alerte à signaler (équité du scoring). */
  alerte?: string | null
}

const SANS_DONNEE = 'Pas de donnée'

export function pourcentage(numerateur: number, denominateur: number): string {
  return denominateur === 0 ? SANS_DONNEE : `${Math.round((numerateur / denominateur) * 100)} %`
}

const moyenne = (valeurs: number[]) => (valeurs.length === 0 ? null : valeurs.reduce((s, v) => s + v, 0) / valeurs.length)

export function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null
  const triees = [...valeurs].sort((a, b) => a - b)
  const milieu = Math.floor(triees.length / 2)
  return triees.length % 2 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2
}

/** Heures ouvrées entre deux horodatages : les heures du samedi et du dimanche ne comptent pas. */
export function heuresOuvrees(debut: Horodatage, fin: Horodatage): number {
  const minutes = (h: Horodatage) => (h.length > 10 ? Number(h.slice(11, 13)) * 60 + Number(h.slice(14, 16)) : 0)
  let total = 0
  for (let j = jour(debut); numeroJour(j) <= numeroJour(fin); j = ajouterJours(j, 1)) {
    if (jourSemaine(j) === 0 || jourSemaine(j) === 6) continue
    const de = j === jour(debut) ? minutes(debut) : 0
    const a = j === jour(fin) ? minutes(fin) : 24 * 60
    total += Math.max(0, a - de)
  }
  return total / 60
}

const nombre = (n: number, unite: string, pluriel = `${unite}s`) => `${n} ${n > 1 ? pluriel : unite}`

// ---------------------------------------------------------------------------
// Chiffres clés et répartition par palier
// ---------------------------------------------------------------------------

export interface ChiffresCles {
  contactsActifs: number
  prospectsChauds: number
  reservationsDuMois: number
  remplissageProchains: { reservees: number; places: number }
  abonnesActifs: number
  tachesEnRetard: number
}

const STATUTS_AVANT_ACHAT = new Set(['contact', 'prospect', 'devis_envoye'])

export function abonneActif(base: Base, contactId: string, date: DateISO): boolean {
  return base.abonnements.some(
    (a) => a.contact_id === contactId && a.decision === 'abonne' && a.date_debut && estPasse(a.date_debut, date) && !(a.date_fin && estPasse(a.date_fin, date)),
  )
}

/** Les prochains départs (à partir du lendemain de la date de référence). */
export function prochainsDeparts(base: Base, date: DateISO, nombreDeparts = 3) {
  return base.departs.filter((d) => numeroJour(d.date_depart) > numeroJour(date)).slice(0, nombreDeparts)
}

export function chiffresCles(base: Base, date: DateISO, scores: Map<string, ScoreResult>): ChiffresCles {
  const crees = base.contacts.filter((c) => estPasse(c.date_creation, date))
  const prochains = prochainsDeparts(base, date)
  const places = prochains.reduce((s, d) => s + d.places_max, 0)
  return {
    contactsActifs: crees.filter((c) => c.statut !== 'perdu' && c.statut !== 'ancien_abonne').length,
    prospectsChauds: crees.filter((c) => STATUTS_AVANT_ACHAT.has(c.statut) && ['Chaud', 'Prêt à réserver'].includes(scores.get(c.id)?.palier ?? '')).length,
    reservationsDuMois: base.reservations.filter((r) => r.date_reservation.slice(0, 7) === date.slice(0, 7) && estPasse(r.date_reservation, date)).length,
    remplissageProchains: { reservees: prochains.reduce((s, d) => s + d.places_max - placesRestantes(d, base.reservations, date), 0), places },
    abonnesActifs: new Set(base.abonnements.filter((a) => abonneActif(base, a.contact_id, date)).map((a) => a.contact_id)).size,
    tachesEnRetard: base.taches.filter((t) => etatTache(t, date) === 'en_retard').length,
  }
}

export const PALIERS_CONVERSION = ['Froid', 'Tiède', 'Chaud', 'Prêt à réserver']
export const PALIERS_ENGAGEMENT = ['Distant', 'Engagé', 'Fidèle', 'Ambassadeur']

/** Contacts sans réservation par palier de conversion, clients par palier d'engagement. */
export function repartitionPaliers(base: Base, date: DateISO, scores: Map<string, ScoreResult>) {
  const conversion = new Map(PALIERS_CONVERSION.map((p) => [p, 0]))
  const engagement = new Map(PALIERS_ENGAGEMENT.map((p) => [p, 0]))
  for (const c of base.contacts) {
    if (!estPasse(c.date_creation, date)) continue
    const s = scores.get(c.id)
    if (!s) continue
    if (STATUTS_AVANT_ACHAT.has(c.statut) && s.type === 'conversion') conversion.set(s.palier, (conversion.get(s.palier) ?? 0) + 1)
    else if (s.type === 'engagement' && engagement.has(s.palier)) engagement.set(s.palier, (engagement.get(s.palier) ?? 0) + 1)
  }
  return { conversion: [...conversion], engagement: [...engagement] }
}

// ---------------------------------------------------------------------------
// Indicateurs des process (section 9)
// ---------------------------------------------------------------------------

export function calculerIndicateurs(base: Base, date: DateISO): Indicateur[] {
  const debut = ajouterJours(date, -PERIODE_JOURS)
  const dansPeriode = (d: string | null | undefined): d is string => Boolean(d) && numeroJour(d as string) > numeroJour(debut) && estPasse(d as string, date)
  const passe = (d: string | null | undefined): d is string => Boolean(d) && estPasse(d as string, date)
  const contacts = new Map(base.contacts.map((c) => [c.id, c]))
  const departs = new Map(base.departs.map((d) => [d.id, d]))
  const evenements = base.evenements.filter((e) => passe(e.date))
  const parContact = new Map<string, typeof evenements>()
  for (const e of evenements) parContact.set(e.contact_id, [...(parContact.get(e.contact_id) ?? []), e])
  const premierApres = (contactId: string, types: string[], apres: string) => (parContact.get(contactId) ?? []).find((e) => types.includes(e.type) && e.date >= apres)
  const reservationsFaites = base.reservations.filter((r) => passe(r.date_reservation))
  const resultat: Indicateur[] = []
  const ajouter = (i: Indicateur) => resultat.push(i)

  // 01 : nouvelles fiches par origine.
  const nouvelles = base.contacts.filter((c) => dansPeriode(c.date_creation))
  const parOrigine = new Map<Contact['origine'], number>()
  for (const c of nouvelles) parOrigine.set(c.origine, (parOrigine.get(c.origine) ?? 0) + 1)
  ajouter({
    id: 'origines',
    nom: 'Contacts qualifiés par origine',
    definition: 'Nouvelles fiches créées sur la période, par origine.',
    process: '01',
    valeur: nombre(nouvelles.length, 'fiche'),
    detail: [...parOrigine].sort((a, b) => b[1] - a[1]).map(([o, n]) => `${LIBELLES_ORIGINE[o]} ${n}`).join(', '),
  })

  // 02 : délai de première réponse aux demandes écrites (un appel ou une visite reçoit une réponse en direct).
  const demandesEcrites = evenements.filter((e) => e.type === 'demande_ecrite' && dansPeriode(e.date))
  const delais = demandesEcrites.flatMap((d) => {
    const reponse = premierApres(d.contact_id, ['reponse_personnelle'], d.date)
    return reponse ? [heuresOuvrees(d.date, reponse.date)] : []
  })
  const delaiMoyen = moyenne(delais)
  ajouter({
    id: 'delai_reponse',
    nom: 'Délai moyen de première réponse',
    definition: 'Temps entre une demande écrite et la première réponse personnelle, en heures ouvrées (sans le samedi ni le dimanche). Objectif : moins de 24 h.',
    process: '02',
    valeur: delaiMoyen === null ? SANS_DONNEE : `${formatPoints(Math.round(delaiMoyen * 10) / 10)} h`,
    detail: `${nombre(delais.length, 'demande écrite', 'demandes écrites')} avec réponse${demandesEcrites.length > delais.length ? `, ${demandesEcrites.length - delais.length} sans réponse` : ''}`,
  })

  // 02 : demandes suivies d'un rendez-vous accepté.
  const premieresDemandes = new Map<string, string>()
  for (const e of evenements) {
    if (['demande_ecrite', 'appel_entrant', 'visite_agence'].includes(e.type) && dansPeriode(e.date) && !premieresDemandes.has(e.contact_id)) premieresDemandes.set(e.contact_id, e.date)
  }
  const avecRdv = [...premieresDemandes].filter(([id, d]) => premierApres(id, ['rdv_accepte'], d)).length
  ajouter({
    id: 'demande_rdv',
    nom: 'Taux demande vers rendez-vous',
    definition: 'Prospects ayant accepté un rendez-vous découverte ÷ prospects ayant fait une demande sur la période.',
    process: '02',
    valeur: pourcentage(avecRdv, premieresDemandes.size),
    detail: `${avecRdv} sur ${premieresDemandes.size} prospects`,
  })

  // 03 : découvertes suivies d'un devis.
  const decouvertes = new Map<string, string>()
  for (const e of evenements) if (e.type === 'rdv_realise' && dansPeriode(e.date) && !decouvertes.has(e.contact_id)) decouvertes.set(e.contact_id, e.date)
  const avecDevis = [...decouvertes].filter(([id, d]) => premierApres(id, ['devis_envoye'], d)).length
  ajouter({
    id: 'decouverte_devis',
    nom: 'Taux découverte vers devis',
    definition: 'Découvertes réalisées sur la période et suivies d\'un devis ÷ découvertes réalisées.',
    process: '03',
    valeur: pourcentage(avecDevis, decouvertes.size),
    detail: `${avecDevis} sur ${nombre(decouvertes.size, 'découverte')}`,
  })

  // 04 : devis transformés en réservation.
  const devisPeriode = base.devis.filter((d) => dansPeriode(d.date_envoi))
  const transformes = devisPeriode.filter((d) => reservationsFaites.some((r) => r.contact_id === d.contact_id && r.date_reservation >= d.date_envoi)).length
  ajouter({
    id: 'devis_reservation',
    nom: 'Taux devis vers réservation',
    definition: 'Devis envoyés sur la période et suivis d\'une réservation ÷ devis envoyés.',
    process: '04',
    valeur: pourcentage(transformes, devisPeriode.length),
    detail: `${transformes} sur ${nombre(devisPeriode.length, 'devis', 'devis')}`,
  })

  // 04 : remplissage des départs des 90 prochains jours.
  const aVenir = base.departs.filter((d) => numeroJour(d.date_depart) > numeroJour(date) && ecartJours(date, d.date_depart) <= PERIODE_JOURS)
  const reservees = aVenir.reduce((s, d) => s + d.places_max - placesRestantes(d, base.reservations, date), 0)
  ajouter({
    id: 'remplissage',
    nom: 'Remplissage des départs',
    definition: 'Places réservées ÷ places maximum, pour chaque départ des 90 prochains jours.',
    process: '04',
    valeur: pourcentage(reservees, aVenir.reduce((s, d) => s + d.places_max, 0)),
    detail: aVenir.map((d) => `${d.offre} ${d.places_max - placesRestantes(d, base.reservations, date)}/${d.places_max}`).join(', '),
  })

  // 05 : appels de bienvenue dans les 48 heures.
  const appelables = reservationsFaites.filter((r) => dansPeriode(r.date_reservation) && estPasse(ajouterJours(r.date_reservation, 2), date) && reservationActive(r, ajouterJours(r.date_reservation, 2)))
  const appeles = appelables.filter((r) => r.appel_bienvenue_date && numeroJour(r.appel_bienvenue_date) <= numeroJour(r.date_reservation) + 2).length
  ajouter({
    id: 'appels_48h',
    nom: 'Appels de bienvenue sous 48 h',
    definition: 'Réservations de la période appelées dans les 48 heures ÷ réservations de la période (48 heures écoulées).',
    process: '05',
    valeur: pourcentage(appeles, appelables.length),
    detail: `${appeles} sur ${nombre(appelables.length, 'réservation')}`,
  })

  // 06 : soldes réglés à l'échéance.
  const echus = reservationsFaites.filter((r) => dansPeriode(r.solde_echeance) && reservationActive(r, r.solde_echeance))
  const aLHeure = echus.filter((r) => r.solde_date && r.solde_date <= r.solde_echeance).length
  ajouter({
    id: 'soldes',
    nom: 'Soldes réglés à l\'échéance',
    definition: 'Soldes encaissés au plus tard à l\'échéance (J-60) ÷ soldes échus sur la période.',
    process: '06',
    valeur: pourcentage(aLHeure, echus.length),
    detail: `${aLHeure} sur ${nombre(echus.length, 'solde')} échus`,
  })

  // 07 à 10 : participation aux Soli'apéros et satisfaction à chaud.
  const voyageursDu = (departId: string, moment: string) => base.reservations.filter((r) => r.depart_id === departId && reservationActive(r, jour(moment)))
  const briseGlace = base.departs.filter((d) => dansPeriode(d.soliapero_brise_glace)).flatMap((d) => voyageursDu(d.id, d.soliapero_brise_glace))
  ajouter({
    id: 'brise_glace',
    nom: 'Participation au Soli\'apéro brise-glace',
    definition: 'Présents ÷ voyageurs des Soli\'apéros brise-glace de la période. Objectif : 100 %.',
    process: '07',
    valeur: pourcentage(briseGlace.filter((r) => r.present_brise_glace === true).length, briseGlace.length),
    detail: `${briseGlace.filter((r) => r.present_brise_glace === true).length} présents sur ${nombre(briseGlace.length, 'voyageur')}`,
  })
  const notes = base.reservations
    .filter((r) => r.note_chaud !== null && dansPeriode(departs.get(r.depart_id)?.date_retour))
    .map((r) => r.note_chaud as number)
  const noteMoyenne = moyenne(notes)
  ajouter({
    id: 'satisfaction_chaud',
    nom: 'Satisfaction à chaud',
    definition: 'Moyenne des notes à chaud (sur 10) des voyages rentrés sur la période.',
    process: '08',
    valeur: noteMoyenne === null ? SANS_DONNEE : `${formatPoints(Math.round(noteMoyenne * 10) / 10)} / 10`,
    detail: nombre(notes.length, 'note'),
  })
  const retour = base.departs.filter((d) => dansPeriode(d.soliapero_retour)).flatMap((d) => voyageursDu(d.id, d.soliapero_retour))
  ajouter({
    id: 'retour',
    nom: 'Participation au Soli\'apéro retour',
    definition: 'Présents ÷ voyageurs des Soli\'apéros retour de la période.',
    process: '09, 10',
    valeur: pourcentage(retour.filter((r) => r.present_retour === true).length, retour.length),
    detail: `${retour.filter((r) => r.present_retour === true).length} présents sur ${nombre(retour.length, 'voyageur')}`,
  })

  // 11 : indicateur clé, voyageurs devenus abonnés.
  const voyageursRentres = new Map<string, DateISO>()
  for (const r of reservationsFaites) {
    const retourLe = departs.get(r.depart_id)?.date_retour
    if (!retourLe || r.statut === 'annulee' || !dansPeriode(retourLe) || ecartJours(retourLe, date) <= 15) continue
    voyageursRentres.set(r.contact_id, retourLe)
  }
  const devenusAbonnes = [...voyageursRentres].filter(([id, retourLe]) =>
    base.abonnements.some((a) => a.contact_id === id && a.decision === 'abonne' && passe(a.date_debut) && !(a.date_fin && a.date_fin < retourLe)),
  ).length
  ajouter({
    id: 'conversion_abonnes',
    nom: 'Conversion voyageurs vers abonnés',
    definition: 'Voyageurs abonnés ÷ voyageurs revenus depuis plus de 15 jours (retours de la période). C\'est l\'indicateur clé du modèle Solia.',
    process: '11',
    valeur: pourcentage(devenusAbonnes, voyageursRentres.size),
    detail: `${devenusAbonnes} abonnés sur ${nombre(voyageursRentres.size, 'voyageur')}`,
    cle: true,
  })

  // 12 : NPS et avis Google.
  const enquetes = base.enquetes.filter((e) => e.type === 'voyage' && e.nps !== null && dansPeriode(e.date))
  const promoteurs = enquetes.filter((e) => (e.nps as number) >= 9).length
  const detracteurs = enquetes.filter((e) => (e.nps as number) <= 6).length
  const nps = enquetes.length === 0 ? null : Math.round(((promoteurs - detracteurs) / enquetes.length) * 100)
  ajouter({
    id: 'nps',
    nom: 'NPS',
    definition: 'Part des notes de 9 et 10 moins part des notes de 0 à 6, sur les enquêtes de la période.',
    process: '12',
    valeur: nps === null ? SANS_DONNEE : `${nps > 0 ? '+' : ''}${nps}`,
    detail: `${promoteurs} promoteurs, ${detracteurs} détracteurs, ${nombre(enquetes.length, 'réponse')}`,
  })
  const avis = base.avis.filter((a) => a.plateforme === 'google' && dansPeriode(a.date))
  const noteAvis = moyenne(avis.map((a) => a.note))
  ajouter({
    id: 'avis_google',
    nom: 'Avis Google',
    definition: 'Nombre d\'avis Google publiés sur la période et note moyenne (sur 5).',
    process: '12, 17',
    valeur: nombre(avis.length, 'avis', 'avis'),
    detail: noteAvis === null ? 'Aucun avis sur la période' : `Note moyenne ${formatPoints(Math.round(noteAvis * 10) / 10)} / 5`,
  })

  // 13 : vie de l'abonnement.
  const abonnes = [...new Set(base.abonnements.filter((a) => abonneActif(base, a.contact_id, date)).map((a) => a.contact_id))]
  const dateActivite = new Map(base.activites.map((a) => [a.id, a.date]))
  const actifs = abonnes.filter((id) =>
    base.participations.some((p) => {
      const d = dateActivite.get(p.activite_id)
      return p.contact_id === id && p.present === true && d && passe(d) && ecartJours(d, date) < 30
    }),
  ).length
  ajouter({
    id: 'abonnes_actifs',
    nom: 'Abonnés actifs dans le mois',
    definition: 'Abonnés venus à au moins une activité dans les 30 derniers jours ÷ abonnés.',
    process: '13',
    valeur: pourcentage(actifs, abonnes.length),
    detail: `${actifs} sur ${nombre(abonnes.length, 'abonné')}`,
  })
  const abonnesPeriode = new Set(
    base.abonnements
      .filter((a) => a.decision === 'abonne' && a.date_debut && passe(a.date_debut) && !(a.date_fin && numeroJour(a.date_fin) <= numeroJour(debut)))
      .map((a) => a.contact_id),
  )
  const resiliations = base.abonnements.filter((a) => a.decision === 'abonne' && dansPeriode(a.date_fin)).length
  ajouter({
    id: 'resiliation',
    nom: 'Taux de résiliation',
    definition: 'Résiliations de la période ÷ abonnés de la période (abonnés au début ou souscrits depuis, les premiers abonnements datant de septembre).',
    process: '13',
    valeur: pourcentage(resiliations, abonnesPeriode.size),
    detail: `${nombre(resiliations, 'résiliation')} sur ${nombre(abonnesPeriode.size, 'abonné')}`,
  })

  // 15 : recommandation.
  const parraines = nouvelles.filter((c) => c.origine === 'parrainage').length
  ajouter({
    id: 'recommandation',
    nom: 'Part des contacts venus par recommandation',
    definition: 'Nouvelles fiches d\'origine parrainage ÷ nouvelles fiches de la période.',
    process: '15',
    valeur: pourcentage(parraines, nouvelles.length),
    detail: `${parraines} sur ${nombre(nouvelles.length, 'fiche')}`,
  })

  // 16 : réclamations résolues sous 7 jours.
  const reclamations = base.reclamations.filter((r) => dansPeriode(r.date_ouverture))
  const resolues = reclamations.filter((r) => r.date_resolution && passe(r.date_resolution))
  const sous7 = resolues.filter((r) => ecartJours(r.date_ouverture, r.date_resolution as string) <= 7).length
  const delaiReclamation = moyenne(resolues.map((r) => ecartJours(r.date_ouverture, r.date_resolution as string)))
  ajouter({
    id: 'reclamations',
    nom: 'Réclamations résolues sous 7 jours',
    definition: 'Réclamations ouvertes sur la période et résolues dans les 7 jours ÷ réclamations ouvertes, avec le délai moyen de résolution.',
    process: '16',
    valeur: pourcentage(sous7, reclamations.length),
    detail: `${sous7} sur ${nombre(reclamations.length, 'réclamation')}${delaiReclamation === null ? '' : `, délai moyen ${formatPoints(Math.round(delaiReclamation * 10) / 10)} jours`}`,
  })

  // 18 : annulations.
  const reservationsPeriode = reservationsFaites.filter((r) => dansPeriode(r.date_reservation))
  const annulees = reservationsPeriode.filter((r) => r.statut === 'annulee' && passe(r.annulation_date)).length
  ajouter({
    id: 'annulation',
    nom: 'Taux d\'annulation',
    definition: 'Réservations de la période annulées depuis ÷ réservations de la période.',
    process: '18',
    valeur: pourcentage(annulees, reservationsPeriode.length),
    detail: `${annulees} sur ${nombre(reservationsPeriode.length, 'réservation')}`,
  })

  // 19 : fiches complètes, à la date de référence.
  const donnees = indexerBase(base)
  const fiches = base.contacts.filter((c) => estPasse(c.date_creation, date))
  const completes = fiches.filter((c) => champsManquants(donnees(c.id), date).length === 0).length
  ajouter({
    id: 'fiches_completes',
    nom: 'Fiches complètes',
    definition: 'Fiches dont tous les champs obligatoires du statut sont remplis ÷ toutes les fiches, à la date de référence.',
    process: '19',
    valeur: pourcentage(completes, fiches.length),
    detail: `${completes} sur ${nombre(fiches.length, 'fiche')}`,
  })

  // Lead scoring : médiane du score à la réservation par cible.
  const planning = planningDe(base)
  const premieres = new Map<string, Reservation>()
  for (const r of [...reservationsFaites].sort((a, b) => (a.date_reservation < b.date_reservation ? -1 : 1))) {
    if (!premieres.has(r.contact_id)) premieres.set(r.contact_id, r)
  }
  const parCible = new Map<Cible, number[]>()
  for (const [id, r] of premieres) {
    const contact = contacts.get(id)
    if (!contact || !dansPeriode(r.date_reservation)) continue
    const score = computeConversion(donnees(id), planning, date).score
    if (score !== null) parCible.set(contact.cible, [...(parCible.get(contact.cible) ?? []), score])
  }
  const medianes = (['senior', 'parent_solo', 'celibataire'] as Cible[]).map((c) => [c, mediane(parCible.get(c) ?? [])] as const)
  const connues = medianes.filter(([, m]) => m !== null).map(([, m]) => m as number)
  const ecart = connues.length >= 2 ? Math.max(...connues) - Math.min(...connues) : null
  ajouter({
    id: 'equite',
    nom: 'Équité du scoring',
    definition: 'Médiane du score à la réservation pour chaque cible (premières réservations de la période). Alerte si plus de 10 points d\'écart entre deux cibles.',
    process: 'Lead scoring',
    valeur: ecart === null ? SANS_DONNEE : `${formatPoints(ecart)} points d'écart`,
    detail: medianes.map(([c, m]) => `${LIBELLES_CIBLE[c]} ${m === null ? 'sans réservation' : formatPoints(m)}`).join(', '),
    alerte: ecart !== null && ecart > 10 ? 'Écart supérieur à 10 points : revoir les critères qui pénalisent une cible.' : null,
  })

  return resultat
}
