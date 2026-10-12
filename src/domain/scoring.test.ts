// Tests du scoring : les 8 cas de recette de data/scoring-rules.json (obligatoires)
// et les tests de limites demandés dans docs/02-scoring.md.
import { describe, expect, it } from 'vitest'
import { critereDeLEvenement } from './criteres'
import { ajouterJours } from './dates'
import { ACTIVITES, DEPARTS, REGLES_SCORING } from './referentiel'
import {
  coefficientDegressivite,
  computeConversion,
  computeEngagement,
  type DonneesContact,
  type Planning,
} from './scoring'
import type {
  Abonnement,
  Cible,
  Consentement,
  Contact,
  Enquete,
  Evenement,
  Participation,
  Reservation,
  TypeEvenement,
} from './types'

// ---------------------------------------------------------------------------
// Outils pour construire les scénarios
// ---------------------------------------------------------------------------

let compteur = 0
const nouvelId = () => `id-${++compteur}`

function contact(valeurs: Partial<Contact> & { cible: Cible; date_creation: string }): Contact {
  return {
    id: 'contact-test',
    prenom: 'Test',
    nom: 'Test',
    email: null,
    telephone: null,
    date_naissance: null,
    ville: null,
    origine: 'site',
    origine_detail: null,
    parrain_id: null,
    code_parrain: null,
    canal_prefere: 'email',
    statut: 'contact',
    referente_id: 'solveig',
    envie_depart_id: null,
    dispo_debut: null,
    dispo_fin: null,
    budget: null,
    compte_social: null,
    craintes: null,
    contraintes: null,
    notes: null,
    motif_perte: null,
    ambassadeur: false,
    ...valeurs,
  }
}

function ev(type: TypeEvenement, date: string, details: Record<string, unknown> = {}): Evenement {
  const evenement: Evenement = {
    id: nouvelId(),
    contact_id: 'contact-test',
    date: date.length === 10 ? `${date}T10:00` : date,
    type,
    code_critere: null,
    canal: null,
    process: null,
    auteur_id: null,
    details,
    simule: false,
  }
  return { ...evenement, code_critere: critereDeLEvenement(evenement) }
}

function consentement(type: Consentement['type'], valeur: boolean, date: string): Consentement {
  return { id: nouvelId(), contact_id: 'contact-test', type, valeur, date: `${date}T10:00` }
}

function donnees(
  c: Contact,
  evenements: Evenement[],
  autres: Partial<Omit<DonneesContact, 'contact' | 'evenements'>> = {},
): DonneesContact {
  return {
    contact: c,
    evenements,
    consentements: [],
    participations: [],
    reservations: [],
    enquetes: [],
    abonnements: [],
    reclamations: [],
    avis: [],
    filleuls: [],
    devis: [],
    fiches: [],
    messages: [],
    taches: [],
    listeAttente: [],
    ...autres,
  }
}

const planning: Planning = { departs: DEPARTS, activites: ACTIVITES, reservations: [] }

function attendu(nom: string) {
  const cas = REGLES_SCORING.cas_de_recette.find((c) => c.nom === nom)
  if (!cas) throw new Error(`Cas de recette introuvable : ${nom}`)
  return cas
}

// ---------------------------------------------------------------------------
// Scénarios des cas de recette
// ---------------------------------------------------------------------------

function marc() {
  const c = contact({ cible: 'celibataire', origine: 'flyer_qr', date_creation: '2026-11-12T10:00' })
  return donnees(
    c,
    [
      ev('origine', '2026-11-12', { origine: 'flyer_qr' }),
      ev('coordonnee_verifiee', '2026-11-12'),
      ev('clic_newsletter', '2026-11-16'),
      ev('clic_newsletter', '2026-11-27'),
    ],
    {
      consentements: [consentement('newsletter', true, '2026-11-12'), consentement('whatsapp', true, '2026-11-12')],
    },
  )
}

function monique(jourDuParcours: 0 | 5 | 8) {
  const c = contact({
    cible: 'senior',
    origine: 'appel_entrant',
    date_creation: '2026-11-22T10:00',
    envie_depart_id: 'malte-2027-01',
  })
  const evenements = [
    ev('origine', '2026-11-22', { origine: 'appel_entrant' }),
    ev('appel_entrant', '2026-11-22'),
    ev('coordonnee_verifiee', '2026-11-22'),
  ]
  if (jourDuParcours >= 5) {
    evenements.push(
      ev('rdv_accepte', '2026-11-25'),
      ev('rdv_realise', '2026-11-27'),
      ev('dates_confirmees', '2026-11-27'),
      ev('budget_confirme', '2026-11-27', { budget: 1600 }),
      ev('accord_devis', '2026-11-27'),
    )
  }
  if (jourDuParcours >= 8) {
    evenements.push(ev('relance_devis_aboutie', '2026-11-30'), ev('question_modalites', '2026-11-30'))
  }
  return donnees(c, evenements, {
    consentements: [consentement('newsletter', false, '2026-11-22'), consentement('whatsapp', false, '2026-11-22')],
  })
}

function sarah() {
  const c = contact({
    cible: 'parent_solo',
    origine: 'parrainage',
    parrain_id: 'julie',
    date_creation: '2026-11-20T10:00',
    envie_depart_id: 'lisbonne-2027-03',
  })
  return donnees(
    c,
    [
      ev('origine', '2026-11-20', { origine: 'parrainage', parrain_id: 'julie' }),
      ev('coordonnee_verifiee', '2026-11-20'),
      ev('demande_ecrite', '2026-11-20T14:00'),
    ],
    {
      consentements: [consentement('newsletter', true, '2026-11-20'), consentement('whatsapp', true, '2026-11-20')],
    },
  )
}

/** Jacqueline : voyage Légendes d'Irlande de septembre 2026, abonnée et active. */
function jacqueline(derniereActivite: string) {
  const c = contact({ cible: 'senior', statut: 'abonne', date_creation: '2026-04-10T10:00' })
  const reservation: Reservation = {
    id: 'resa-jacqueline',
    contact_id: c.id,
    depart_id: 'irlande-2026-09',
    date_reservation: '2026-05-04',
    acompte_montant: 507,
    acompte_date: '2026-05-04',
    moyen_paiement: 'cheque',
    solde_montant: 1183,
    solde_echeance: '2026-07-16',
    solde_date: '2026-07-10',
    mise_en_demeure_date: null,
    rappel_solde_auto: true,
    appel_bienvenue_date: '2026-05-05',
    tentatives_appel: 1,
    ajout_groupe_date: '2026-05-06',
    message_groupe_poste: false,
    hesite_dates: false,
    brise_glace_confirme_le: null,
    present_brise_glace: true,
    binome: null,
    opposition_image: false,
    note_chaud: 9,
    incident_non_resolu: false,
    partage_groupe: true,
    retour_confirme_le: null,
    present_retour: true,
    album_remis: true,
    statut: 'voyagee',
    report_utilise: false,
    depart_initial_id: null,
    date_report: null,
    annulation_date: null,
    annulation_motif: null,
    montant_retenu: null,
    montant_rembourse: null,
  }
  const enquete: Enquete = {
    id: 'enquete-jacqueline',
    contact_id: c.id,
    reservation_id: reservation.id,
    type: 'voyage',
    nps: 10,
    notes_par_temps: {},
    commentaire: null,
    date: '2026-10-03',
    avis_google_publie: true,
  }
  const abonnement: Abonnement = {
    id: 'abo-jacqueline',
    contact_id: c.id,
    formule: '29 € par mois',
    decision: 'abonne',
    date_decision: '2026-09-30',
    date_debut: '2026-09-30',
    date_fin: null,
    motif_resiliation: null,
    motif_refus: null,
  }
  const activite = ACTIVITES.find((a) => a.date === derniereActivite)
  if (!activite) throw new Error(`Pas d'activité le ${derniereActivite}`)
  const participation: Participation = {
    id: 'participation-jacqueline',
    activite_id: activite.id,
    contact_id: c.id,
    inscrit: true,
    present: true,
  }
  return donnees(c, [], {
    reservations: [reservation],
    enquetes: [enquete],
    abonnements: [abonnement],
    participations: [participation],
  })
}

// ---------------------------------------------------------------------------
// Les 8 cas de recette
// ---------------------------------------------------------------------------

describe('cas de recette (data/scoring-rules.json)', () => {
  it('a bien 8 cas de recette', () => {
    expect(REGLES_SCORING.cas_de_recette).toHaveLength(8)
  })

  it('Marc, célibataire, flyer', () => {
    const cas = attendu('Marc, célibataire, flyer')
    const resultat = computeConversion(marc(), planning, '2026-11-30')
    expect(resultat.score).toBe(cas.attendu_conversion)
    expect(resultat.palier).toBe(cas.palier)
  })

  it('Monique, senior, jour 0', () => {
    const cas = attendu('Monique, senior, jour 0')
    const resultat = computeConversion(monique(0), planning, '2026-11-22')
    expect(resultat.score).toBe(cas.attendu_conversion)
    expect(resultat.palier).toBe(cas.palier)
  })

  it('Monique, jour 5', () => {
    const cas = attendu('Monique, jour 5')
    const resultat = computeConversion(monique(5), planning, '2026-11-27')
    expect(resultat.score).toBe(cas.attendu_conversion)
    expect(resultat.palier).toBe(cas.palier)
  })

  it('Monique, jour 8', () => {
    const cas = attendu('Monique, jour 8')
    const resultat = computeConversion(monique(8), planning, '2026-11-30')
    expect(resultat.score).toBe(cas.attendu_conversion)
    expect(resultat.palier).toBe(cas.palier)
  })

  it('Sarah, parent solo, parrainée', () => {
    const cas = attendu('Sarah, parent solo, parrainée')
    const resultat = computeConversion(sarah(), planning, '2026-11-30')
    expect(resultat.score).toBe(cas.attendu_conversion)
    expect(resultat.palier).toBe(cas.palier)
  })

  it('Sarah, 45 jours sans action', () => {
    const cas = attendu('Sarah, 45 jours sans action')
    const resultat = computeConversion(sarah(), planning, ajouterJours('2026-11-20', 45))
    expect(resultat.score).toBe(cas.attendu_conversion)
    expect(resultat.palier).toBe(cas.palier)
  })

  it('Jacqueline, senior, abonnée active (tout atteignable)', () => {
    const cas = attendu('Jacqueline, senior, abonnée active')
    // Le 29/12/2026, tous les critères sont atteignables (E13 l'est 90 jours après le Soli'apéro retour du 30/09).
    const resultat = computeEngagement(jacqueline('2026-12-22'), planning, '2026-12-29')
    expect(resultat.lignes.every((l) => l.etat !== 'non_atteignable' || l.bloc === 'negatif')).toBe(true)
    expect(resultat.score).toBe(cas.attendu_engagement)
    expect(resultat.palier).toBe(cas.palier)
  })

  it('Jacqueline, 60 jours sans activité', () => {
    const cas = attendu('Jacqueline, 60 jours sans activité')
    const resultat = computeEngagement(jacqueline('2026-12-22'), planning, ajouterJours('2026-12-22', 60))
    expect(resultat.lignes.find((l) => l.code === 'E12')?.etat).toBe('non_obtenu')
    expect(resultat.lignes.some((l) => l.code === 'M4')).toBe(true)
    expect(resultat.score).toBe(cas.attendu_engagement)
    expect(resultat.palier).toBe(cas.palier)
  })
})

// ---------------------------------------------------------------------------
// Tests de limites
// ---------------------------------------------------------------------------

describe('limites du score de conversion', () => {
  const base = () => contact({ cible: 'celibataire', origine: 'reseau_social', date_creation: '2026-11-01T10:00' })

  it('plafonne le bloc digital à 12', () => {
    const resultat = computeConversion(
      donnees(base(), [
        ev('clic_bienvenue', '2026-11-20'),
        ev('clic_newsletter', '2026-11-21'),
        ev('clic_newsletter', '2026-11-22'),
        ev('clic_newsletter', '2026-11-23'),
        ev('interaction_sociale', '2026-11-24'),
        ev('interaction_sociale', '2026-11-25'),
        ev('telechargement_programme', '2026-11-26'),
      ]),
      planning,
      '2026-11-30',
    )
    const digital = resultat.plafonds.find((p) => p.bloc === 'digital')
    expect(digital?.brut).toBe(4 + 9 + 6 + 4)
    expect(digital?.retenu).toBe(12)
    expect(resultat.score).toBe(5 + 12) // P1 + digital plafonné
  })

  it('plafonne le comportement à 70', () => {
    const c = contact({ cible: 'senior', origine: 'parrainage', parrain_id: 'p1', date_creation: '2026-11-01T10:00' })
    const resultat = computeConversion(
      donnees(c, [
        ev('origine', '2026-11-01', { origine: 'parrainage', parrain_id: 'p1' }),
        ev('appel_entrant', '2026-11-20'),
        ev('visite_agence', '2026-11-21'),
        ev('demande_ecrite', '2026-11-21'),
        ev('rdv_accepte', '2026-11-22'),
        ev('rdv_realise', '2026-11-24'),
        ev('accord_devis', '2026-11-24'),
        ev('relance_devis_aboutie', '2026-11-27'),
        ev('question_modalites', '2026-11-28'),
      ]),
      planning,
      '2026-11-30',
    )
    const comportement = resultat.plafonds.find((p) => p.bloc === 'comportement')
    expect(comportement?.brut).toBe(11 + 15 + 15 + 10 + 6 + 12 + 8 + 5 + 6)
    expect(comportement?.retenu).toBe(70)
    expect(resultat.score).toBe(5 + 70)
  })

  it('ne descend jamais sous 0', () => {
    const resultat = computeConversion(
      donnees(base(), [ev('rdv_non_honore', '2026-11-20'), ev('refus', '2026-11-25')]),
      planning,
      '2026-11-30',
    )
    expect(resultat.score).toBe(0)
    expect(resultat.palier).toBe('Froid')
  })

  it('ne retient qu\'un seul critère d\'origine, le plus fort', () => {
    const c = contact({ cible: 'parent_solo', origine: 'parrainage', parrain_id: 'p1', date_creation: '2026-11-01T10:00' })
    const resultat = computeConversion(
      donnees(c, [
        ev('origine', '2026-11-01', { origine: 'stand' }),
        ev('origine', '2026-11-01', { origine: 'parrainage', parrain_id: 'p1' }),
        ev('origine', '2026-11-01', { origine: 'site' }),
      ]),
      planning,
      '2026-11-30',
    )
    const origines = resultat.lignes.filter((l) => l.bloc === 'origine')
    expect(origines).toHaveLength(1)
    expect(origines[0].code).toBe('C1')
    expect(resultat.score).toBe(5 + 11)
  })

  it('l\'origine ne perd pas de valeur avec le temps', () => {
    const c = contact({ cible: 'senior', origine: 'stand', date_creation: '2026-01-10T10:00' })
    const resultat = computeConversion(donnees(c, [ev('origine', '2026-01-10', { origine: 'stand' })]), planning, '2026-11-30')
    expect(resultat.score).toBe(5 + 4)
  })

  it('applique la dégressivité aux bornes 30, 31, 60, 61, 90 et 91 jours', () => {
    const coefficients = [0, 30, 31, 60, 61, 90, 91, 200].map((age) => coefficientDegressivite(age))
    expect(coefficients).toEqual([1, 1, 0.5, 0.5, 0.25, 0.25, 0, 0])

    const scoreAgeDe = (age: number) =>
      computeConversion(
        donnees(contact({ cible: 'senior', origine: 'reseau_social', date_creation: '2026-01-01T10:00' }), [
          ev('appel_entrant', ajouterJours('2026-11-30', -age)),
        ]),
        planning,
        '2026-11-30',
      ).lignes.find((l) => l.code === 'C10')?.points
    expect([30, 31, 60, 61, 90, 91].map(scoreAgeDe)).toEqual([15, 7.5, 7.5, 3.75, 3.75, 0])
  })

  it('compte au plus le nombre maximum d\'occurrences, les plus récentes', () => {
    const resultat = computeConversion(
      donnees(base(), [
        ev('clic_newsletter', '2026-08-01'),
        ev('clic_newsletter', '2026-11-10'),
        ev('clic_newsletter', '2026-11-15'),
        ev('clic_newsletter', '2026-11-20'),
      ]),
      planning,
      '2026-11-30',
    )
    const clics = resultat.lignes.filter((l) => l.code === 'C5')
    expect(clics).toHaveLength(3)
    expect(clics.every((l) => l.coefficient === 1)).toBe(true)
  })

  it('ignore les événements postérieurs à la date de référence', () => {
    const resultat = computeConversion(marc(), planning, '2026-11-20')
    expect(resultat.lignes.filter((l) => l.code === 'C5')).toHaveLength(1)
  })

  it('Perdu : le comportement repart à 0, le profil reste', () => {
    const d = marc()
    d.evenements.push(ev('statut', '2026-11-28', { vers: 'perdu' }))
    const resultat = computeConversion(d, planning, '2026-11-30')
    expect(resultat.plafonds.find((p) => p.bloc === 'comportement')?.retenu).toBe(0)
    expect(resultat.score).toBe(13)
  })

  it('N3 retire aussi P2, et une nouvelle vérification lève N3', () => {
    const d = marc()
    d.evenements.push(ev('coordonnee_invalide', '2026-11-28'))
    expect(computeConversion(d, planning, '2026-11-30').score).toBe(22 - 3 - 5)
    d.evenements.push(ev('coordonnee_verifiee', '2026-11-29'))
    expect(computeConversion(d, planning, '2026-11-30').score).toBe(22)
  })

  it('N1 : une désinscription retire P3 et 5 points ; la réinscription les rend', () => {
    const d = marc()
    d.consentements.push(consentement('newsletter', false, '2026-11-28'))
    expect(computeConversion(d, planning, '2026-11-30').score).toBe(22 - 2 - 5)
    d.consentements.push(consentement('newsletter', true, '2026-11-29'))
    expect(computeConversion(d, planning, '2026-11-30').score).toBe(22)
  })

  it('une nouvelle demande lève N5 (devis expiré)', () => {
    const d = monique(5)
    d.evenements.push(ev('devis_expire', '2026-11-28'))
    expect(computeConversion(d, planning, '2026-11-28').lignes.some((l) => l.code === 'N5')).toBe(true)
    d.evenements.push(ev('appel_entrant', '2026-11-29'))
    expect(computeConversion(d, planning, '2026-11-30').lignes.some((l) => l.code === 'N5')).toBe(false)
  })

  it('fige le score à la date de la réservation', () => {
    const d = monique(8)
    const reservation = { ...jacqueline('2026-12-22').reservations[0], contact_id: d.contact.id, depart_id: 'malte-2027-01', date_reservation: '2026-11-30' }
    d.reservations.push(reservation)
    const resultat = computeConversion(d, planning, '2027-03-01')
    expect(resultat.fige?.date).toBe('2026-11-30')
    expect(resultat.score).toBe(77)
  })
})

describe('limites du score d\'engagement', () => {
  it('affiche « En attente » quand rien n\'est encore atteignable', () => {
    const d = jacqueline('2026-12-22')
    const resultat = computeEngagement(d, planning, '2026-05-05')
    expect(resultat.score).toBeNull()
    expect(resultat.palier).toBe('En attente')
  })

  it('se calcule au prorata des points atteignables', () => {
    // Le 07/05, seul E1 (appel sous 48 h) est atteignable : 4 sur 4.
    const resultat = computeEngagement(jacqueline('2026-12-22'), planning, '2026-05-07')
    expect(resultat.score).toBe(100)
    // Le 13/05, E2 devient atteignable (ajout au groupe le 06/05 + 7 jours) sans message posté : 4 sur 8.
    expect(computeEngagement(jacqueline('2026-12-22'), planning, '2026-05-13').score).toBe(50)
  })

  it('le persona Jacqueline est Fidèle à 81 le 30/11/2026', () => {
    const resultat = computeEngagement(jacqueline('2026-11-10'), planning, '2026-11-30')
    expect(resultat.score).toBe(81)
    expect(resultat.palier).toBe('Fidèle')
  })
})
