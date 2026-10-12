// Moteur d'automatismes (cahier des charges, section 7) : chaque règle sur un cas construit à la main,
// puis l'idempotence sur le jeu de démonstration.
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed.generated.json'
import { baseReferentiel } from '../seed/baseReferentiel'
import { appliquerChangements } from '../store/DataStore'
import { runAutomations } from './automations'
import { nouvelEvenement } from './evenements'
import { terminerTache } from './taches'
import type { Base, Contact, Reservation, Statut, TypeEvenement } from './types'
import { vueALaDate } from './vueALaDate'

const seed = seedJson as unknown as Base

let compteur = 0
const nouvelId = () => `id-${++compteur}`

/** Fait tourner le moteur et applique ses changements. */
function tourner(base: Base, date: string): Base {
  return appliquerChangements(base, runAutomations(base, date, { nouvelId, tirage: () => 0.5 }), false)
}

function contact(base: Base, valeurs: Partial<Contact> & { id: string }): Contact {
  const c: Contact = {
    prenom: 'Claire',
    nom: 'Test',
    email: 'claire@exemple.test',
    telephone: null,
    date_naissance: null,
    ville: null,
    cible: 'senior',
    origine: 'stand',
    origine_detail: null,
    parrain_id: null,
    code_parrain: null,
    canal_prefere: 'email',
    statut: 'contact',
    referente_id: 'jezabel',
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
    date_creation: '2026-10-01T10:00',
    ...valeurs,
  }
  base.contacts.push(c)
  return c
}

function ev(base: Base, c: Contact, date: string, type: TypeEvenement, details: Record<string, unknown> = {}) {
  base.evenements.push(nouvelEvenement(c.id, date, type, { id: nouvelId(), auteur: 'solveig', details }))
}

function statut(base: Base, c: Contact, date: string, vers: Statut) {
  ev(base, c, date, 'statut', { vers })
  c.statut = vers
}

function reservation(base: Base, valeurs: Partial<Reservation> & { contact_id: string; depart_id: string; date_reservation: string }): Reservation {
  const depart = base.departs.find((d) => d.id === valeurs.depart_id)!
  const r: Reservation = {
    id: nouvelId(),
    acompte_montant: 300,
    acompte_date: valeurs.date_reservation,
    moyen_paiement: 'carte',
    solde_montant: 700,
    solde_echeance: depart.echeance_solde,
    solde_date: null,
    mise_en_demeure_date: null,
    rappel_solde_auto: true,
    appel_bienvenue_date: null,
    tentatives_appel: 0,
    ajout_groupe_date: null,
    message_groupe_poste: false,
    hesite_dates: false,
    brise_glace_confirme_le: null,
    present_brise_glace: null,
    binome: null,
    opposition_image: false,
    note_chaud: null,
    incident_non_resolu: false,
    partage_groupe: false,
    retour_confirme_le: null,
    present_retour: null,
    album_remis: null,
    statut: 'reservee',
    report_utilise: false,
    depart_initial_id: null,
    date_report: null,
    annulation_date: null,
    annulation_motif: null,
    montant_retenu: null,
    montant_rembourse: null,
    ...valeurs,
  }
  base.reservations.push(r)
  return r
}

const taches = (base: Base, regle: string) => base.taches.filter((t) => t.regle_id === regle)
const messages = (base: Base, code: string) => base.messages_envoyes.filter((m) => m.message_code === code)

describe('jeu de démonstration', () => {
  it('le seed a déjà été traité par le moteur au 30/11/2026 : relancer ne change rien', () => {
    expect(runAutomations(seed, '2026-11-30', { nouvelId })).toEqual([])
  })

  it('idempotent : à +7 jours, un second passage ne crée plus rien', () => {
    const apres = tourner(seed, '2026-12-07')
    expect(apres.taches.length).toBeGreaterThan(seed.taches.length)
    expect(runAutomations(apres, '2026-12-07', { nouvelId })).toEqual([])
  })

  it('revenir au 30/11/2026 retrouve exactement la démo (lecture à la date)', () => {
    const apres = tourner(seed, '2026-12-07')
    const vue = vueALaDate(apres, '2026-11-30')
    const origine = vueALaDate(seed, '2026-11-30')
    expect(vue.taches.map((t) => [t.id, t.statut])).toEqual(origine.taches.map((t) => [t.id, t.statut]))
    expect(vue.messages_envoyes.length).toBe(origine.messages_envoyes.length)
    expect(vue.contacts.map((c) => c.statut)).toEqual(origine.contacts.map((c) => c.statut))
    expect(vue.devis.map((d) => d.statut)).toEqual(origine.devis.map((d) => d.statut))
    expect(vue.reservations.map((r) => r.statut)).toEqual(origine.reservations.map((r) => r.statut))
  })

  it('plusieurs membres de l\'équipe ont des tâches en retard au 30/11/2026', () => {
    const enRetard = seed.taches.filter((t) => t.statut === 'a_faire' && t.echeance.slice(0, 10) < '2026-11-30')
    expect(new Set(enRetard.map((t) => t.responsable_id)).size).toBeGreaterThanOrEqual(3)
  })

  it('aucun message n\'est réellement envoyé : tous sont marqués simulés', () => {
    expect(seed.messages_envoyes.length).toBeGreaterThan(0)
    expect(seed.messages_envoyes.every((m) => m.simule === true)).toBe(true)
  })
})

describe('process 01 et 02 : captation et demandes entrantes', () => {
  it('R01 : message de bienvenue à J+2, rien avant, une seule fois', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', date_creation: '2026-11-27T15:00' })
    expect(messages(tourner(base, '2026-11-28'), 'M01')).toHaveLength(0)
    const apres = tourner(base, '2026-11-29')
    expect(messages(apres, 'M01')).toMatchObject([{ contact_id: c.id, date: '2026-11-29T09:00', regle_id: 'R01', simule: true }])
    expect(messages(tourner(apres, '2026-11-30'), 'M01')).toHaveLength(1)
  })

  it('le moteur ne rattrape pas l\'historique d\'avant sa mise en service (23/11/2026)', () => {
    const base = baseReferentiel()
    contact(base, { id: 'c1', date_creation: '2026-11-01T15:00' })
    expect(messages(tourner(base, '2026-11-30'), 'M01')).toHaveLength(0)
  })

  it('R02 : inscription à la newsletter tracée dans le journal à J+2 du consentement', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', date_creation: '2026-11-25T10:00' })
    base.consentements.push({ id: 'k1', contact_id: c.id, type: 'newsletter', valeur: true, date: '2026-11-25T10:00' })
    const apres = tourner(base, '2026-11-30')
    expect(apres.evenements.filter((e) => e.type === 'inscription_newsletter')).toMatchObject([{ contact_id: c.id, date: '2026-11-27T09:05' }])
  })

  it('R04 et R05 : accusé de réception immédiat, réponse sous 24 h ouvrées (le week-end ne compte pas)', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', date_creation: '2026-11-27T14:00' })
    ev(base, c, '2026-11-27T14:00', 'demande_ecrite')
    base.evenements.at(-1)!.canal = 'site'
    statut(base, c, '2026-11-27T14:01', 'prospect')
    const apres = tourner(base, '2026-11-28')
    expect(messages(apres, 'M03')).toMatchObject([{ date: '2026-11-27T14:01' }])
    // Vendredi 27/11 à 14 h : réponse attendue lundi 30/11 à 14 h.
    expect(taches(apres, 'R05')).toMatchObject([{ echeance: '2026-11-30T14:00', responsable_id: 'solveig', statut: 'a_faire', action_id: 'reponse_personnelle' }])
    ev(apres, c, '2026-11-30T10:00', 'reponse_personnelle')
    expect(taches(tourner(apres, '2026-11-30'), 'R05')).toMatchObject([{ statut: 'fait', fait_le: '2026-11-30T10:00', fait_par: 'solveig' }])
  })

  it('R06, R07, R08 : relances à J+3 et J+7, puis Perdu à J+14 sans retour du prospect', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', date_creation: '2026-11-23T10:00' })
    ev(base, c, '2026-11-23T10:00', 'demande_ecrite')
    statut(base, c, '2026-11-23T10:01', 'prospect')
    ev(base, c, '2026-11-23T15:00', 'reponse_personnelle')
    const au30 = tourner(base, '2026-11-30')
    expect(taches(au30, 'R06')).toMatchObject([{ echeance: '2026-11-26T10:00', message_code: 'M04', statut: 'a_faire' }])
    expect(taches(au30, 'R07')).toMatchObject([{ echeance: '2026-11-30T10:00', message_code: 'M05' }])
    expect(au30.contacts[0].statut).toBe('prospect')
    const au07 = tourner(au30, '2026-12-07')
    expect(au07.contacts[0]).toMatchObject({ statut: 'perdu', motif_perte: 'Sans réponse 14 jours après la demande' })
    expect(au07.evenements.filter((e) => e.type === 'statut').at(-1)).toMatchObject({ date: '2026-12-07T07:00', auteur_id: null })
  })

  it('R06, R07, R08 : le prospect qui répond annule les relances et le passage en Perdu', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', date_creation: '2026-11-23T10:00' })
    ev(base, c, '2026-11-23T10:00', 'demande_ecrite')
    statut(base, c, '2026-11-23T10:01', 'prospect')
    ev(base, c, '2026-11-23T15:00', 'reponse_personnelle')
    ev(base, c, '2026-11-25T18:00', 'reponse_relance')
    const apres = tourner(base, '2026-12-08')
    for (const regle of ['R06', 'R07']) {
      expect(taches(apres, regle)).toMatchObject([{ statut: 'annulee', annulee_le: '2026-11-25T18:00', motif_annulation: 'Le prospect a répondu' }])
    }
    expect(apres.contacts[0].statut).toBe('prospect')
  })
})

describe('process 03 et 04 : devis', () => {
  function avecDevis(depart: string, envoi: string) {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', date_creation: '2026-10-20T10:00', envie_depart_id: depart })
    statut(base, c, '2026-10-20T10:01', 'prospect')
    ev(base, c, `${envoi}T10:00`, 'devis_envoye', { depart_id: depart })
    statut(base, c, `${envoi}T10:00`, 'devis_envoye')
    base.devis.push({ id: 'd1', contact_id: c.id, depart_id: depart, montant: 1690, date_envoi: envoi, date_fin_validite: '2026-12-31', statut: 'envoye' })
    return { base, c }
  }

  it('R11 : appel à J+3 après le devis ; R12 : pas de relance « places restantes » s\'il reste plus de 5 places', () => {
    const { base } = avecDevis('malte-2027-02', '2026-11-24')
    const apres = tourner(base, '2026-12-01')
    expect(taches(apres, 'R11')).toMatchObject([{ echeance: '2026-11-27T10:00', action_id: 'relance_devis_aboutie' }])
    expect(messages(apres, 'M07')).toHaveLength(0)
  })

  it('R12 : relance automatique à J+7 quand il reste 5 places ou moins', () => {
    const { base } = avecDevis('malte-2027-02', '2026-11-24')
    for (let i = 0; i < 15; i++) {
      const autre = contact(base, { id: `v${i}`, statut: 'reserve' })
      reservation(base, { contact_id: autre.id, depart_id: 'malte-2027-02', date_reservation: '2026-10-01' })
    }
    expect(messages(tourner(base, '2026-12-01'), 'M07')).toMatchObject([{ date: '2026-12-01T09:00', regle_id: 'R12' }])
  })

  it('R13 : à J+30 sans réservation, devis expiré (N5), dernier message M08 et passage en Perdu', () => {
    const { base, c } = avecDevis('malte-2027-02', '2026-11-01')
    const veille = tourner(base, '2026-11-30')
    expect(veille.devis[0].statut).toBe('envoye')
    const apres = tourner(veille, '2026-12-01')
    expect(apres.devis[0].statut).toBe('expire')
    expect(apres.evenements.filter((e) => e.type === 'devis_expire')).toMatchObject([{ contact_id: c.id, code_critere: 'N5', date: '2026-12-01T07:00' }])
    expect(messages(apres, 'M08')).toHaveLength(1)
    expect(apres.contacts[0]).toMatchObject({ statut: 'perdu', motif_perte: 'Devis expiré sans réponse' })
    // Lu au 30/11, le devis est encore valable.
    expect(vueALaDate(apres, '2026-11-30').devis[0].statut).toBe('envoye')
  })
})

describe('process 05 à 07 : réservation, solde, Soli\'apéro', () => {
  it('R15, R16 : confirmation automatique et fiche de passation le jour même', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', statut: 'reserve' })
    ev(base, c, '2026-11-26T11:00', 'reservation')
    reservation(base, { contact_id: c.id, depart_id: 'malte-2027-02', date_reservation: '2026-11-26' })
    const apres = tourner(base, '2026-11-30')
    expect(messages(apres, 'M10')).toMatchObject([{ date: '2026-11-26T11:05' }])
    expect(taches(apres, 'R16')).toMatchObject([{ echeance: '2026-11-26T18:00', responsable_id: 'solveig', action_id: 'fiche_passation' }])
  })

  it('R17 et R61 : appel de bienvenue sous 48 h après la fiche, avec mention du parrain', () => {
    const base = baseReferentiel()
    const parrain = contact(base, { id: 'p1', prenom: 'Monique', statut: 'abonne' })
    const c = contact(base, { id: 'c1', statut: 'reserve', parrain_id: parrain.id, origine: 'parrainage' })
    const r = reservation(base, { contact_id: c.id, depart_id: 'malte-2027-02', date_reservation: '2026-11-25' })
    base.fiches_passation.push({ id: 'f1', reservation_id: r.id, attentes: null, craintes: null, contraintes: null, details_personnels: null, remplie_le: '2026-11-25' })
    const [tache] = taches(tourner(base, '2026-11-30'), 'R17')
    expect(tache).toMatchObject({ echeance: '2026-11-27T18:00', responsable_id: 'jezabel', statut: 'a_faire' })
    expect(tache.titre).toContain('Monique m\'a beaucoup parlé de vous')
  })

  it('R21, R22 : solde à l\'échéance, puis mise en demeure (M14) s\'il n\'est pas réglé', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', statut: 'reserve', cible: 'celibataire', referente_id: 'lilou' })
    // Départ du 27/01/2027 : solde exigible le 28/11/2026.
    reservation(base, { contact_id: c.id, depart_id: 'barcelone-2027-01', date_reservation: '2026-10-01' })
    const apres = tourner(base, '2026-11-30')
    expect(taches(apres, 'R21')).toMatchObject([{ echeance: '2026-11-28T09:00', responsable_id: 'emilien', statut: 'a_faire' }])
    expect(taches(apres, 'R22')).toMatchObject([{ date_declenchement: '2026-11-29T08:00', echeance: '2026-12-01T09:00', message_code: 'M14', action_id: 'mise_en_demeure' }])
    // Le solde arrive le 30/11 : la mise en demeure n'a plus lieu d'être.
    apres.reservations[0].solde_date = '2026-11-30'
    ev(apres, c, '2026-11-30T10:00', 'solde')
    const solde = tourner(apres, '2026-11-30')
    expect(taches(solde, 'R21')[0]).toMatchObject({ statut: 'fait', fait_le: '2026-11-30T10:00' })
    expect(taches(solde, 'R22')[0]).toMatchObject({ statut: 'annulee', motif_annulation: 'Solde encaissé' })
  })

  it('R25 et R26 : invitation à J-21, relance à J-18 seulement sans confirmation de présence', () => {
    const base = baseReferentiel()
    const sans = contact(base, { id: 'c1', statut: 'solde' })
    const avec = contact(base, { id: 'c2', statut: 'solde' })
    // Départ du 14/12/2026 : J-21 le 23/11, J-18 le 26/11.
    reservation(base, { contact_id: sans.id, depart_id: 'malte-2026-12', date_reservation: '2026-09-01' })
    reservation(base, { contact_id: avec.id, depart_id: 'malte-2026-12', date_reservation: '2026-09-01', brise_glace_confirme_le: '2026-11-24' })
    const apres = tourner(base, '2026-11-30')
    expect(messages(apres, 'M15')).toHaveLength(2)
    expect(taches(apres, 'R26')).toMatchObject([{ contact_id: sans.id, echeance: '2026-11-26T17:00', message_code: 'M16' }])
    // Tâches du départ : préparer (R27) puis animer (R28) le Soli'apéro.
    expect(taches(apres, 'R27')).toMatchObject([{ depart_id: 'malte-2026-12', contact_id: null, responsable_id: 'jezabel' }])
    expect(taches(apres, 'R28')).toMatchObject([{ echeance: '2026-11-29T18:30' }])
  })
})

describe('process 09 à 15 : retour, fidélité, parrainage', () => {
  it('R35 : passage automatique en Voyageur le jour du retour (Abonné s\'il l\'était déjà)', () => {
    const base = baseReferentiel()
    const voyageur = contact(base, { id: 'c1', cible: 'celibataire', referente_id: 'lilou' })
    statut(base, voyageur, '2026-09-01T10:00', 'solde')
    const abonne = contact(base, { id: 'c2', cible: 'celibataire', referente_id: 'lilou' })
    statut(base, abonne, '2026-09-01T10:00', 'solde')
    base.abonnements.push({ id: 'a1', contact_id: abonne.id, formule: '29 € par mois', decision: 'abonne', date_decision: '2026-06-01', date_debut: '2026-06-01', date_fin: null, motif_resiliation: null, motif_refus: null })
    for (const c of [voyageur, abonne]) reservation(base, { contact_id: c.id, depart_id: 'barcelone-2026-11', date_reservation: '2026-08-01', solde_date: '2026-09-01', statut: 'soldee' })
    const avant = tourner(base, '2026-11-28')
    expect(avant.contacts.map((c) => c.statut)).toEqual(['solde', 'solde'])
    const apres = tourner(avant, '2026-11-29')
    expect(apres.contacts.map((c) => c.statut)).toEqual(['voyageur', 'abonne'])
    expect(apres.reservations.map((r) => r.statut)).toEqual(['voyagee', 'voyagee'])
    expect(vueALaDate(apres, '2026-11-28').contacts.map((c) => c.statut)).toEqual(['solde', 'solde'])
    expect(vueALaDate(apres, '2026-11-28').reservations.map((r) => r.statut)).toEqual(['soldee', 'soldee'])
  })

  it('R53 : newsletter le 1er du mois aux seuls contacts qui y consentent', () => {
    const base = baseReferentiel()
    const oui = contact(base, { id: 'c1' })
    contact(base, { id: 'c2' })
    base.consentements.push({ id: 'k1', contact_id: oui.id, type: 'newsletter', valeur: true, date: '2026-10-01T10:00' })
    expect(messages(tourner(base, '2026-11-30'), 'M32')).toHaveLength(0)
    expect(messages(tourner(base, '2026-12-01'), 'M32')).toMatchObject([{ contact_id: oui.id, date: '2026-12-01T10:00' }])
  })

  it('R54 : abonné sans activité depuis 30 jours, alerte annulée par une nouvelle participation', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', statut: 'abonne' })
    base.abonnements.push({ id: 'a1', contact_id: c.id, formule: '29 € par mois', decision: 'abonne', date_decision: '2026-10-26', date_debut: '2026-10-26', date_fin: null, motif_resiliation: null, motif_refus: null })
    const apres = tourner(base, '2026-11-30')
    expect(taches(apres, 'R54')).toMatchObject([{ echeance: '2026-11-25T17:00', responsable_id: 'jezabel', statut: 'a_faire' }])
    expect(taches(apres, 'R55')).toHaveLength(0)
    apres.participations.push({ id: 'p1', activite_id: 'act-2026-12-01', contact_id: c.id, inscrit: true, present: true })
    expect(taches(tourner(apres, '2026-12-01'), 'R54')[0]).toMatchObject({ statut: 'annulee', motif_annulation: 'Nouvelle participation' })
  })

  it('R59 : une note de 9 ou 10 donne un code parrain', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', prenom: 'Hélène', statut: 'voyageur' })
    base.enquetes.push({ id: 'e1', contact_id: c.id, reservation_id: null, type: 'voyage', nps: 9, notes_par_temps: {}, commentaire: null, date: '2026-11-28', avis_google_publie: false })
    expect(tourner(base, '2026-11-30').contacts[0].code_parrain).toBe('HELENE55')
  })

  it('R60 : l\'acompte d\'un filleul crée la tâche de remerciement du parrain (M35)', () => {
    const base = baseReferentiel()
    const parrain = contact(base, { id: 'p1', statut: 'abonne' })
    const filleul = contact(base, { id: 'f1', prenom: 'Léa', statut: 'reserve', parrain_id: parrain.id })
    base.parrainages.push({ id: 'pa1', parrain_id: parrain.id, filleul_id: filleul.id, recompense: null, date_recompense: null })
    reservation(base, { contact_id: filleul.id, depart_id: 'malte-2027-02', date_reservation: '2026-11-27' })
    const [tache] = taches(tourner(base, '2026-11-30'), 'R60')
    expect(tache).toMatchObject({ contact_id: parrain.id, message_code: 'M35', responsable_id: 'jezabel' })
    expect(tache.titre).toContain('Léa Test a réservé')
  })
})

describe('tâche faite : message rendu et envoi simulé', () => {
  it('« Fait » trace le message du modèle pour le contact, avec le lien vers la tâche', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1', prenom: 'Josette', date_creation: '2026-11-23T10:00' })
    ev(base, c, '2026-11-23T10:00', 'demande_ecrite')
    statut(base, c, '2026-11-23T10:01', 'prospect')
    ev(base, c, '2026-11-23T15:00', 'reponse_personnelle')
    const apres = tourner(base, '2026-11-26')
    const [relance] = taches(apres, 'R06')
    const fini = appliquerChangements(apres, terminerTache(apres, relance, { date: '2026-11-26T09:30', auteur: 'solveig', nouvelId }), false)
    expect(taches(fini, 'R06')[0]).toMatchObject({ statut: 'fait', fait_le: '2026-11-26T09:30', fait_par: 'solveig' })
    const [message] = messages(fini, 'M04')
    expect(message).toMatchObject({ contact_id: c.id, tache_id: relance.id, regle_id: 'R06', simule: true })
    expect(message.corps_rendu).toContain('Josette')
    expect(message.corps_rendu).not.toContain('{{')
  })

  it('une tâche de départ envoie le message à chaque voyageur du groupe (R29, photo de groupe)', () => {
    const base = baseReferentiel()
    for (const id of ['c1', 'c2', 'c3']) {
      const c = contact(base, { id, statut: 'solde' })
      reservation(base, { contact_id: c.id, depart_id: 'malte-2026-12', date_reservation: '2026-09-01', present_brise_glace: true })
    }
    const apres = tourner(base, '2026-11-30')
    const [photo] = taches(apres, 'R29')
    expect(photo).toMatchObject({ depart_id: 'malte-2026-12', message_code: 'M17', echeance: '2026-11-30T12:00' })
    const fini = appliquerChangements(apres, terminerTache(apres, photo, { date: '2026-11-30T11:00', auteur: 'jezabel', nouvelId }), false)
    expect(messages(fini, 'M17').map((m) => m.contact_id)).toEqual(['c1', 'c2', 'c3'])
  })
})

describe('lecture du statut à la date', () => {
  it('deux changements de statut à la même minute donnent le même statut, quel que soit l\'ordre de lecture', () => {
    const base = baseReferentiel()
    const c = contact(base, { id: 'c1' })
    ev(base, c, '2026-11-20T10:00', 'statut', { de: 'contact', vers: 'devis_envoye' })
    ev(base, c, '2026-11-25T12:45', 'statut', { de: 'devis_envoye', vers: 'reserve' })
    ev(base, c, '2026-11-25T12:45', 'statut', { de: 'reserve', vers: 'solde' })
    expect(vueALaDate(base, '2026-11-30').contacts[0].statut).toBe('solde')
    base.evenements.reverse()
    expect(vueALaDate(base, '2026-11-30').contacts[0].statut).toBe('solde')
  })
})
