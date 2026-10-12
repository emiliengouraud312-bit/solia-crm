// Les deux scores de Solia, calculés à partir des données datées (docs/02-scoring.md).
// Fonctions pures : mêmes données et même date de référence donnent toujours le même résultat.
// Les poids, plafonds, paliers et la dégressivité sont lus dans data/scoring-rules.json.
import { critereDeLEvenement, TYPES_NOUVELLE_DEMANDE } from './criteres'
import { ajouterJours, ecartJours, estPasse, jour, numeroJour } from './dates'
import { formatDate, formatMontant } from '../lib/format'
import { LIBELLES_CANAL, STATUTS_CONVERSION } from './libelles'
import { departOuvert, reservationActive } from './planning'
import { REGLES_SCORING, type ReglesScoring } from './referentiel'
import type {
  Abonnement,
  Activite,
  Avis,
  Consentement,
  Contact,
  DateISO,
  Depart,
  Enquete,
  Evenement,
  Horodatage,
  Participation,
  Reclamation,
  Reservation,
  TypeConsentement,
} from './types'

// ---------------------------------------------------------------------------
// Types du résultat
// ---------------------------------------------------------------------------

export interface LigneDetail {
  code: string
  libelle: string
  bloc: string
  /** Points du critère avant dégressivité. */
  points_bruts: number
  /** Coefficient de dégressivité (1 si le critère n'est pas dégressif). */
  coefficient: number
  /** Points retenus pour cette ligne, avant les plafonds de bloc. */
  points: number
  date: Horodatage | null
  age_jours: number | null
  /** Ce qui prouve le critère, en clair. */
  preuve: string
  /** Identifiant de la donnée qui prouve le critère (événement, réservation, participation...). */
  preuve_id: string | null
  /** Engagement : critère obtenu, atteignable mais pas obtenu, ou pas encore atteignable. */
  etat: 'obtenu' | 'non_obtenu' | 'non_atteignable'
  /** Engagement : date à partir de laquelle le critère est atteignable. */
  atteignable_des?: DateISO | null
}

export interface PlafondBloc {
  bloc: string
  plafond: number | null
  brut: number
  retenu: number
  /** Engagement : points atteignables du bloc, avant et après plafond. */
  atteignable_brut?: number
  atteignable_retenu?: number
}

export interface ScoreResult {
  type: 'conversion' | 'engagement'
  /** Score de 0 à 100, ou null quand rien n'est encore atteignable (« En attente »). */
  score: number | null
  palier: string
  lignes: LigneDetail[]
  plafonds: PlafondBloc[]
  /** Date à laquelle le score a été calculé (date de référence, ou date de clôture si figé). */
  date_calcul: DateISO
  fige: { date: DateISO; raison: string } | null
}

/** Tout ce qu'il faut savoir d'un contact pour calculer ses scores. */
export interface DonneesContact {
  contact: Contact
  evenements: Evenement[]
  consentements: Consentement[]
  participations: Participation[]
  reservations: Reservation[]
  enquetes: Enquete[]
  abonnements: Abonnement[]
  reclamations: Reclamation[]
  avis: Avis[]
  /** Filleuls du contact, avec la date d'encaissement de leur acompte (null si pas encore). */
  filleuls: { filleul_id: string; acompte_date: DateISO | null }[]
}

/** Le planning interne, source de vérité des départs, activités et places restantes. */
export interface Planning {
  departs: Depart[]
  activites: Activite[]
  /** Toutes les réservations (de tous les contacts), pour compter les places restantes. */
  reservations: Reservation[]
}

// ---------------------------------------------------------------------------
// Outils communs
// ---------------------------------------------------------------------------

export function coefficientDegressivite(ageJours: number, regles: ReglesScoring = REGLES_SCORING): number {
  for (const tranche of regles.conversion.degressivite) {
    if (ageJours >= tranche.de && (tranche.a === null || ageJours <= tranche.a)) return tranche.coef
  }
  return 0
}

export function palierPour(score: number | null, paliers: { des: number; libelle: string }[]): string {
  if (score === null) return 'En attente'
  let libelle = paliers[0].libelle
  for (const palier of paliers) if (score >= palier.des) libelle = palier.libelle
  return libelle
}

function borner(valeur: number): number {
  return Math.min(100, Math.max(0, Math.round(valeur)))
}

function somme(valeurs: number[]): number {
  return valeurs.reduce((total, v) => total + v, 0)
}

/** Le plus récent d'une liste d'éléments datés. */
function plusRecent<T extends { date: string }>(elements: T[]): T | undefined {
  return [...elements].sort((a, b) => (a.date < b.date ? 1 : -1))[0]
}

/** État d'un consentement à une date : valeur actuelle et retrait éventuel (N1, N2, M5). */
function etatConsentement(consentements: Consentement[], type: TypeConsentement, dateReference: DateISO) {
  const historique = consentements
    .filter((c) => c.type === type && estPasse(c.date, dateReference))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const dernier = historique[historique.length - 1]
  const dejaDonne = historique.some((c) => c.valeur)
  return {
    accorde: dernier?.valeur === true ? dernier : null,
    retire: dernier && !dernier.valeur && dejaDonne ? dernier : null,
  }
}

// ---------------------------------------------------------------------------
// Score de conversion
// ---------------------------------------------------------------------------

export function computeConversion(
  donnees: DonneesContact,
  planning: Planning,
  dateReference: DateISO,
  regles: ReglesScoring = REGLES_SCORING,
): ScoreResult {
  const { contact } = donnees
  const conversion = regles.conversion

  // Clôture « Réservé » : le score est calculé une dernière fois à la date de la (première) réservation.
  const premiereReservation = donnees.reservations
    .filter((r) => estPasse(r.date_reservation, dateReference))
    .sort((a, b) => (a.date_reservation < b.date_reservation ? -1 : 1))[0]
  const dateCalcul = premiereReservation ? premiereReservation.date_reservation : dateReference
  const fige = premiereReservation ? { date: dateCalcul, raison: 'Score à la réservation' } : null

  const lignes: LigneDetail[] = []
  const resultat = (score: number, plafonds: PlafondBloc[]): ScoreResult => ({
    type: 'conversion',
    score,
    palier: palierPour(score, conversion.paliers),
    lignes,
    plafonds,
    date_calcul: dateCalcul,
    fige,
  })

  // Fiche pas encore créée à cette date.
  if (!estPasse(contact.date_creation, dateCalcul)) return resultat(0, [])

  const evenements = donnees.evenements.filter((e) => estPasse(e.date, dateCalcul))
  const derniers = (type: Evenement['type']) => plusRecent(evenements.filter((e) => e.type === type))
  const aPres = (type: Evenement['type'] | Evenement['type'][], date: string) => {
    const types = Array.isArray(type) ? type : [type]
    return evenements.some((e) => types.includes(e.type) && e.date > date)
  }

  // --- Profil (P1 à P7), plafonné à 30 ---------------------------------------
  const profil = (code: string, date: string | null, preuve: string | null, preuveId: string | null) => {
    const critere = conversion.profil.find((p) => p.code === code)
    if (!critere) return
    lignes.push({
      code,
      libelle: critere.critere,
      bloc: 'profil',
      points_bruts: critere.points,
      coefficient: 1,
      points: critere.points,
      date,
      age_jours: null,
      preuve: preuve ?? critere.preuve,
      preuve_id: preuveId,
      etat: 'obtenu',
    })
  }

  profil('P1', contact.date_creation, null, contact.id)

  // N3 : une coordonnée invalide reste active tant qu'aucune nouvelle vérification ne l'a levée.
  const coordonneesInvalides = evenements.filter(
    (e) => e.type === 'coordonnee_invalide' && !aPres('coordonnee_verifiee', e.date),
  )
  const verification = derniers('coordonnee_verifiee')
  if (verification && coordonneesInvalides.length === 0) {
    profil('P2', verification.date, null, verification.id)
  }

  const newsletter = etatConsentement(donnees.consentements, 'newsletter', dateCalcul)
  const whatsapp = etatConsentement(donnees.consentements, 'whatsapp', dateCalcul)
  if (newsletter.accorde) profil('P3', newsletter.accorde.date, null, newsletter.accorde.id)
  if (whatsapp.accorde) profil('P4', whatsapp.accorde.date, null, whatsapp.accorde.id)

  const departVise = planning.departs.find((d) => d.id === contact.envie_depart_id)
  if (departVise) profil('P5', contact.date_creation, `Envie reliée au départ ${departVise.offre} du ${formatDate(departVise.date_depart)}`, departVise.id)

  const datesConfirmees = derniers('dates_confirmees')
  if (datesConfirmees) {
    const ouvert = (depart: Depart) => departOuvert(depart, planning.reservations, dateCalcul, contact.id)
    const autreDepartCompatible =
      contact.dispo_debut && contact.dispo_fin
        ? planning.departs.find(
            (d) =>
              d.cible === contact.cible &&
              d.id !== departVise?.id &&
              numeroJour(d.date_depart) >= numeroJour(contact.dispo_debut as string) &&
              numeroJour(d.date_depart) <= numeroJour(contact.dispo_fin as string) &&
              ouvert(d),
          )
        : undefined
    if (departVise && ouvert(departVise)) {
      profil('P6', datesConfirmees.date, `Dates confirmées, départ visé ouvert`, datesConfirmees.id)
    } else if (autreDepartCompatible) {
      profil('P6', datesConfirmees.date, `Dates confirmées, autre départ compatible : ${autreDepartCompatible.offre} du ${formatDate(autreDepartCompatible.date_depart)}`, datesConfirmees.id)
    }
  }

  const budgetConfirme = derniers('budget_confirme')
  if (budgetConfirme && departVise) {
    const montant = Number(budgetConfirme.details.budget ?? contact.budget ?? 0)
    if (montant >= departVise.prix_ttc) {
      profil('P7', budgetConfirme.date, `Budget de ${formatMontant(montant)} pour un départ à ${formatMontant(departVise.prix_ttc)}`, budgetConfirme.id)
    }
  }

  const profilBrut = somme(lignes.filter((l) => l.bloc === 'profil').map((l) => l.points))
  const profilRetenu = Math.min(profilBrut, conversion.plafonds.profil)

  // --- Comportement : origine + digital (plafond 12) + intention, plafonné à 70 ---
  // Clôture « Perdu » : seuls les événements postérieurs à la dernière perte comptent.
  const perte = plusRecent(evenements.filter((e) => e.type === 'statut' && e.details.vers === 'perdu'))
  const apresPerte = (date: string) => !perte || date > perte.date
  const evenementsComportement = evenements.filter((e) => apresPerte(e.date))

  // Origine : un seul critère, le plus fort, sans dégressivité.
  const origines = evenementsComportement
    .filter((e) => e.type === 'origine')
    .map((e) => ({ evenement: e, critere: conversion.comportement.find((c) => c.code === critereDeLEvenement(e)) }))
    .filter((o) => o.critere)
    .sort((a, b) => (b.critere?.points ?? 0) - (a.critere?.points ?? 0))
  const origine = origines[0]
  if (origine?.critere) {
    lignes.push({
      code: origine.critere.code,
      libelle: origine.critere.critere,
      bloc: 'origine',
      points_bruts: origine.critere.points,
      coefficient: 1,
      points: origine.critere.points,
      date: origine.evenement.date,
      age_jours: ecartJours(origine.evenement.date, dateCalcul),
      preuve: 'Origine saisie à la création de la fiche',
      preuve_id: origine.evenement.id,
      etat: 'obtenu',
    })
  }

  // Présences aux événements ouverts à tous (C19).
  const presencesOuvertes = donnees.participations.flatMap((p) => {
    const activite = planning.activites.find((a) => a.id === p.activite_id)
    if (!activite || !activite.ouverte_a_tous || p.present !== true) return []
    const date = `${activite.date}T${activite.heure}`
    if (!estPasse(date, dateCalcul) || !apresPerte(date)) return []
    return [{ id: p.id, date, preuve: `Présent à « ${activite.titre} » (ouvert à tous)` }]
  })

  for (const critere of conversion.comportement) {
    if (critere.bloc === 'origine') continue
    const occurrences =
      critere.code === 'C19'
        ? presencesOuvertes
        : evenementsComportement
            .filter((e) => critereDeLEvenement(e) === critere.code)
            .map((e) => ({ id: e.id, date: e.date, preuve: preuveEvenement(e) }))
    // Au-delà du maximum, on retient les occurrences les plus récentes.
    const retenues = [...occurrences].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, critere.max)
    for (const occurrence of retenues) {
      const ageJours = ecartJours(occurrence.date, dateCalcul)
      const coefficient = critere.degressif ? coefficientDegressivite(ageJours, regles) : 1
      lignes.push({
        code: critere.code,
        libelle: critere.critere,
        bloc: critere.bloc,
        points_bruts: critere.points,
        coefficient,
        points: critere.points * coefficient,
        date: occurrence.date,
        age_jours: ageJours,
        preuve: occurrence.preuve,
        preuve_id: occurrence.id,
        etat: 'obtenu',
      })
    }
  }

  const sommeBloc = (bloc: string) => somme(lignes.filter((l) => l.bloc === bloc).map((l) => l.points))
  const origineBrut = sommeBloc('origine')
  const digitalBrut = sommeBloc('digital')
  const digitalRetenu = Math.min(digitalBrut, conversion.plafonds.digital)
  const intentionBrut = sommeBloc('intention')
  const comportementBrut = origineBrut + digitalRetenu + intentionBrut
  const comportementRetenu = Math.min(comportementBrut, conversion.plafonds.comportement)

  // --- Points négatifs actifs (N1 à N6) ---------------------------------------
  const negatif = (code: string, date: string, preuve: string, preuveId: string | null) => {
    const critere = conversion.negatifs.find((n) => n.code === code)
    if (!critere) return
    lignes.push({
      code,
      libelle: critere.evenement,
      bloc: 'negatif',
      points_bruts: critere.points,
      coefficient: 1,
      points: critere.points,
      date,
      age_jours: ecartJours(date, dateCalcul),
      preuve,
      preuve_id: preuveId,
      etat: 'obtenu',
    })
  }
  if (newsletter.retire) negatif('N1', newsletter.retire.date, 'Désinscription de la newsletter', newsletter.retire.id)
  if (whatsapp.retire) negatif('N2', whatsapp.retire.date, 'Retrait du consentement WhatsApp', whatsapp.retire.id)
  for (const e of coordonneesInvalides) negatif('N3', e.date, preuveEvenement(e), e.id)
  for (const e of evenements.filter((e) => e.type === 'rdv_non_honore' && !aPres('rdv_realise', e.date))) {
    negatif('N4', e.date, preuveEvenement(e), e.id)
  }
  for (const e of evenements.filter((e) => e.type === 'devis_expire' && !aPres(TYPES_NOUVELLE_DEMANDE, e.date))) {
    negatif('N5', e.date, preuveEvenement(e), e.id)
  }
  for (const e of evenements.filter((e) => e.type === 'refus' && !aPres(TYPES_NOUVELLE_DEMANDE, e.date))) {
    negatif('N6', e.date, preuveEvenement(e), e.id)
  }
  const negatifs = sommeBloc('negatif')

  return resultat(borner(profilRetenu + comportementRetenu + negatifs), [
    { bloc: 'profil', plafond: conversion.plafonds.profil, brut: profilBrut, retenu: profilRetenu },
    { bloc: 'origine', plafond: null, brut: origineBrut, retenu: origineBrut },
    { bloc: 'digital', plafond: conversion.plafonds.digital, brut: digitalBrut, retenu: digitalRetenu },
    { bloc: 'intention', plafond: null, brut: intentionBrut, retenu: intentionBrut },
    { bloc: 'comportement', plafond: conversion.plafonds.comportement, brut: comportementBrut, retenu: comportementRetenu },
    { bloc: 'negatif', plafond: null, brut: negatifs, retenu: negatifs },
  ])
}

function preuveEvenement(evenement: Evenement): string {
  return `Événement du journal${evenement.canal ? ` (${LIBELLES_CANAL[evenement.canal]})` : ''}`
}

// ---------------------------------------------------------------------------
// Score d'engagement
// ---------------------------------------------------------------------------

/**
 * Réservation sur laquelle porte l'engagement : la dernière dont le voyage est terminé,
 * sinon la dernière réservation faite (en cours, ou annulée).
 */
export function reservationDeReference(
  reservations: Reservation[],
  departs: Depart[],
  dateReference: DateISO,
): Reservation | null {
  const faites = reservations.filter((r) => estPasse(r.date_reservation, dateReference))
  const retourDe = (r: Reservation) => departs.find((d) => d.id === r.depart_id)?.date_retour ?? '9999-12-31'
  const terminees = faites
    .filter((r) => reservationActive(r, dateReference) && estPasse(retourDe(r), dateReference))
    .sort((a, b) => (retourDe(a) < retourDe(b) ? 1 : -1))
  if (terminees.length > 0) return terminees[0]
  return [...faites].sort((a, b) => (a.date_reservation < b.date_reservation ? 1 : -1))[0] ?? null
}

interface Obtention {
  /** Part des points du critère obtenue : 1 = tous les points, 0,5 = la moitié. */
  part: number
  date: string | null
  preuve: string
  preuve_id: string | null
}

export function computeEngagement(
  donnees: DonneesContact,
  planning: Planning,
  dateReference: DateISO,
  regles: ReglesScoring = REGLES_SCORING,
): ScoreResult {
  const engagement = regles.engagement
  const reservation = reservationDeReference(donnees.reservations, planning.departs, dateReference)
  const depart = reservation && planning.departs.find((d) => d.id === reservation.depart_id)
  if (!reservation || !depart) {
    return { type: 'engagement', score: null, palier: 'En attente', lignes: [], plafonds: [], date_calcul: dateReference, fige: null }
  }

  // Clôtures : annulation ou résiliation, le score est figé à leur date.
  let dateCalcul = dateReference
  let fige: ScoreResult['fige'] = null
  if (reservation.statut === 'annulee' && reservation.annulation_date && estPasse(reservation.annulation_date, dateReference)) {
    dateCalcul = reservation.annulation_date
    fige = { date: dateCalcul, raison: 'Voyage annulé' }
  }
  const resiliation = donnees.abonnements.find(
    (a) =>
      a.date_fin &&
      a.motif_resiliation &&
      estPasse(a.date_fin, dateCalcul) &&
      numeroJour(a.date_fin) >= numeroJour(reservation.date_reservation),
  )
  if (resiliation?.date_fin) {
    dateCalcul = resiliation.date_fin
    fige = { date: dateCalcul, raison: 'Abonnement résilié' }
  }

  const briseGlace = jour(depart.soliapero_brise_glace)
  const soliaperoRetour = jour(depart.soliapero_retour)
  const atteignableDes: Record<string, DateISO | null> = {
    E1: ajouterJours(reservation.date_reservation, 2),
    E2: reservation.ajout_groupe_date ? ajouterJours(reservation.ajout_groupe_date, 7) : null,
    E3: reservation.solde_echeance,
    E4: briseGlace,
    E5: depart.date_retour,
    E6: depart.date_retour,
    E7: depart.date_retour,
    E8: soliaperoRetour,
    E9: ajouterJours(soliaperoRetour, 9),
    E10: ajouterJours(soliaperoRetour, 9),
    E11: ajouterJours(soliaperoRetour, 15),
    E12: ajouterJours(soliaperoRetour, 15),
    E13: ajouterJours(soliaperoRetour, 90),
    E14: ajouterJours(soliaperoRetour, 15),
    E15: ajouterJours(soliaperoRetour, 15),
  }

  // Présences aux activités jusqu'à la date de calcul.
  const presences = donnees.participations
    .filter((p) => p.present === true)
    .flatMap((p) => {
      const activite = planning.activites.find((a) => a.id === p.activite_id)
      return activite && estPasse(activite.date, dateCalcul) ? [{ participation: p, activite }] : []
    })
    .sort((a, b) => (a.activite.date < b.activite.date ? 1 : -1))
  const presencesDepuis = (jours: number) =>
    presences.filter((p) => ecartJours(p.activite.date, dateCalcul) <= jours)

  const abonnementActif = donnees.abonnements.find(
    (a) =>
      a.decision === 'abonne' &&
      a.date_debut !== null &&
      estPasse(a.date_debut, dateCalcul) &&
      (!a.date_fin || !estPasse(a.date_fin, dateCalcul)),
  )
  const enquete = plusRecent(
    donnees.enquetes.filter((e) => e.type === 'voyage' && e.reservation_id === reservation.id && estPasse(e.date, dateCalcul)),
  )
  const depuisReservation = (date: string) =>
    numeroJour(date) >= numeroJour(reservation.date_reservation) && estPasse(date, dateCalcul)

  // E5 et E9 : 9 ou 10, points pleins ; 7 ou 8, moitié ; 6 ou moins, rien.
  const partSelonNote = (note: number | null | undefined): number => {
    if (note === null || note === undefined) return 0
    if (note >= 9) return 1
    if (note >= 7) return 0.5
    return 0
  }

  const obtentions: Record<string, () => Obtention | null> = {
    E1: () =>
      reservation.appel_bienvenue_date &&
      estPasse(reservation.appel_bienvenue_date, dateCalcul) &&
      ecartJours(reservation.date_reservation, reservation.appel_bienvenue_date) <= 2
        ? { part: 1, date: reservation.appel_bienvenue_date, preuve: 'Date de l\'appel de bienvenue', preuve_id: reservation.id }
        : null,
    E2: () =>
      reservation.message_groupe_poste
        ? { part: 1, date: reservation.ajout_groupe_date, preuve: 'Case « message posté dans le groupe » cochée', preuve_id: reservation.id }
        : null,
    E3: () =>
      reservation.solde_date &&
      estPasse(reservation.solde_date, dateCalcul) &&
      numeroJour(reservation.solde_date) <= numeroJour(reservation.solde_echeance)
        ? { part: 1, date: reservation.solde_date, preuve: 'Date et montant du solde', preuve_id: reservation.id }
        : null,
    E4: () =>
      reservation.present_brise_glace === true
        ? { part: 1, date: depart.soliapero_brise_glace, preuve: 'Présence cochée au Soli\'apéro brise-glace', preuve_id: reservation.id }
        : null,
    E5: () => {
      const part = partSelonNote(reservation.note_chaud)
      return part > 0
        ? { part, date: depart.date_retour, preuve: `Note à chaud : ${reservation.note_chaud}/10`, preuve_id: reservation.id }
        : null
    },
    E6: () =>
      !reservation.incident_non_resolu
        ? { part: 1, date: depart.date_retour, preuve: 'Aucun incident resté sans solution', preuve_id: reservation.id }
        : null,
    E7: () =>
      reservation.partage_groupe
        ? { part: 1, date: depart.date_retour, preuve: 'Case « photos ou messages partagés » cochée', preuve_id: reservation.id }
        : null,
    E8: () =>
      reservation.present_retour === true
        ? { part: 1, date: depart.soliapero_retour, preuve: 'Présence cochée au Soli\'apéro retour', preuve_id: reservation.id }
        : null,
    E9: () => {
      const part = partSelonNote(enquete?.nps)
      return enquete && part > 0
        ? { part, date: enquete.date, preuve: `Note de recommandation : ${enquete.nps}/10`, preuve_id: enquete.id }
        : null
    },
    E10: () => {
      if (enquete?.avis_google_publie) {
        return { part: 1, date: enquete.date, preuve: 'Case « avis Google publié » de l\'enquête', preuve_id: enquete.id }
      }
      const avis = donnees.avis.find((a) => a.plateforme === 'google' && depuisReservation(a.date))
      return avis ? { part: 1, date: avis.date, preuve: `Avis Google de ${avis.note} étoiles`, preuve_id: avis.id } : null
    },
    E11: () =>
      abonnementActif
        ? { part: 1, date: abonnementActif.date_debut, preuve: `Abonné depuis le ${formatDate(abonnementActif.date_debut)}`, preuve_id: abonnementActif.id }
        : null,
    E12: () => {
      const recente = presencesDepuis(30)[0]
      return recente
        ? { part: 1, date: recente.activite.date, preuve: `Présent à « ${recente.activite.titre} »`, preuve_id: recente.participation.id }
        : null
    },
    E13: () => {
      const sur90 = presencesDepuis(90)
      return sur90.length >= 3
        ? { part: 1, date: sur90[0].activite.date, preuve: `${sur90.length} participations sur 90 jours`, preuve_id: sur90[0].participation.id }
        : null
    },
    E14: () => {
      // La moitié des points par filleul dont l'acompte est encaissé, 2 filleuls au maximum.
      const encaisses = donnees.filleuls.filter((f) => f.acompte_date && estPasse(f.acompte_date, dateCalcul))
      return encaisses.length > 0
        ? {
            part: Math.min(encaisses.length * 0.5, 1),
            date: encaisses.map((f) => f.acompte_date as string).sort().reverse()[0],
            preuve: `${encaisses.length} filleul(s) avec acompte encaissé`,
            preuve_id: encaisses[0].filleul_id,
          }
        : null
    },
    E15: () => {
      const nouvelle = donnees.reservations.find(
        (r) =>
          r.id !== reservation.id &&
          reservationActive(r, dateCalcul) &&
          numeroJour(r.date_reservation) > numeroJour(depart.date_retour) &&
          ecartJours(depart.date_retour, r.date_reservation) <= 365,
      )
      return nouvelle
        ? { part: 1, date: nouvelle.date_reservation, preuve: 'Nouveau voyage réservé', preuve_id: nouvelle.id }
        : null
    },
  }

  const lignes: LigneDetail[] = []
  for (const critere of engagement.criteres) {
    const des = atteignableDes[critere.code] ?? null
    const atteignable = des !== null && estPasse(des, dateCalcul)
    // Un critère n'est obtenu que s'il est déjà atteignable (sinon le prorata dépasserait 100 %).
    const obtention = atteignable ? obtentions[critere.code]?.() ?? null : null
    lignes.push({
      code: critere.code,
      libelle: critere.critere,
      bloc: critere.bloc,
      points_bruts: critere.points,
      coefficient: 1,
      points: obtention ? obtention.part * critere.points : 0,
      date: obtention?.date ?? null,
      age_jours: null,
      preuve: obtention?.preuve ?? (atteignable ? 'Pas de donnée qui le prouve' : 'Pas encore atteignable'),
      preuve_id: obtention?.preuve_id ?? null,
      etat: obtention ? 'obtenu' : atteignable ? 'non_obtenu' : 'non_atteignable',
      atteignable_des: des,
    })
  }

  // Points négatifs actifs (M1 à M5).
  const negatif = (code: string, date: string, preuve: string, preuveId: string | null) => {
    const critere = engagement.negatifs.find((n) => n.code === code)
    if (!critere) return
    lignes.push({
      code,
      libelle: critere.evenement,
      bloc: 'negatif',
      points_bruts: critere.points,
      coefficient: 1,
      points: critere.points,
      date,
      age_jours: ecartJours(date, dateCalcul),
      preuve,
      preuve_id: preuveId,
      etat: 'obtenu',
    })
  }
  for (const r of donnees.reclamations.filter((r) => depuisReservation(r.date_ouverture))) {
    const levee = r.date_resolution && estPasse(ajouterJours(r.date_resolution, 7), dateCalcul)
    if (!levee) negatif('M1', r.date_ouverture, 'Réclamation ouverte', r.id)
  }
  for (const a of donnees.avis.filter((a) => a.note <= 3 && depuisReservation(a.date))) {
    const reclamation = donnees.reclamations.find((r) => r.id === a.reclamation_id)
    const levee = reclamation?.date_resolution && estPasse(reclamation.date_resolution, dateCalcul)
    if (!levee) negatif('M2', a.date, `Avis public de ${a.note} étoiles`, a.id)
  }
  if (
    reservation.mise_en_demeure_date &&
    estPasse(reservation.mise_en_demeure_date, dateCalcul) &&
    !(reservation.solde_date && estPasse(reservation.solde_date, dateCalcul))
  ) {
    negatif('M3', reservation.mise_en_demeure_date, 'Mise en demeure pour le solde', reservation.id)
  }
  if (abonnementActif?.date_debut) {
    const derniere = presences[0]?.activite.date
    const reperes = [abonnementActif.date_debut, ...(derniere ? [derniere] : [])].sort()
    const depuis = reperes[reperes.length - 1]
    if (ecartJours(depuis, dateCalcul) >= 60) {
      negatif('M4', ajouterJours(depuis, 60), `Aucune activité depuis le ${formatDate(depuis)}`, abonnementActif.id)
    }
  }
  const newsletter = etatConsentement(donnees.consentements, 'newsletter', dateCalcul)
  if (newsletter.retire && depuisReservation(newsletter.retire.date)) {
    negatif('M5', newsletter.retire.date, 'Désinscription de la newsletter', newsletter.retire.id)
  }

  // Plafonds par bloc, sur les points obtenus et sur les points atteignables.
  const plafonds: PlafondBloc[] = Object.entries(engagement.blocs).map(([bloc, plafond]) => {
    const duBloc = lignes.filter((l) => l.bloc === bloc)
    const brut = somme(duBloc.map((l) => l.points))
    const atteignableBrut = somme(duBloc.filter((l) => l.etat !== 'non_atteignable').map((l) => l.points_bruts))
    return {
      bloc,
      plafond,
      brut,
      retenu: Math.min(brut, plafond),
      atteignable_brut: atteignableBrut,
      atteignable_retenu: Math.min(atteignableBrut, plafond),
    }
  })
  const negatifs = somme(lignes.filter((l) => l.bloc === 'negatif').map((l) => l.points))
  plafonds.push({ bloc: 'negatif', plafond: null, brut: negatifs, retenu: negatifs })

  const obtenus = somme(plafonds.filter((p) => p.bloc !== 'negatif').map((p) => p.retenu))
  const atteignables = somme(plafonds.map((p) => p.atteignable_retenu ?? 0))
  const score = atteignables === 0 ? null : borner(((obtenus + negatifs) / atteignables) * 100)

  return {
    type: 'engagement',
    score,
    palier: palierPour(score, engagement.paliers),
    lignes,
    plafonds,
    date_calcul: dateCalcul,
    fige,
  }
}

// ---------------------------------------------------------------------------
// Score affiché selon le statut
// ---------------------------------------------------------------------------

/**
 * Score principal d'un contact : conversion tant qu'il n'a pas réservé
 * (Contact, Prospect, Devis envoyé, Perdu), engagement ensuite.
 * Un client Perdu après une annulation garde son score d'engagement, figé à l'annulation.
 */
export function scorePrincipal(donnees: DonneesContact, planning: Planning, dateReference: DateISO): ScoreResult {
  const aReserve = donnees.reservations.some((r) => estPasse(r.date_reservation, dateReference))
  return STATUTS_CONVERSION.includes(donnees.contact.statut) && !aReserve
    ? computeConversion(donnees, planning, dateReference)
    : computeEngagement(donnees, planning, dateReference)
}
