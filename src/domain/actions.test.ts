// Actions rapides et transitions de statut, rejouées sur le jeu de démonstration.
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed.generated.json'
import { appliquerChangements } from '../store/DataStore'
import { action, actionsDisponibles, executerAction, valeursParDefaut, type ContexteAction, type Valeurs } from './actions'
import { indexerBase, planningDe } from './donneesContact'
import { calculerParcours } from './parcours'
import { computeConversion, computeEngagement, scorePrincipal } from './scoring'
import { actionDeTransition, champsManquants, raisonTransitionImpossible } from './statuts'
import type { Base } from './types'

const REF = '2026-11-30'
const seed = seedJson as unknown as Base

function contexte(base: Base, prenomNom: string, date = REF): ContexteAction {
  const contact = base.contacts.find((c) => `${c.prenom} ${c.nom}` === prenomNom)
  if (!contact) throw new Error(prenomNom)
  let compteur = 0
  return {
    base,
    donnees: indexerBase(base)(contact.id),
    dateReference: date,
    maintenant: `${date}T11:00`,
    auteur: 'solveig',
    nouvelId: () => `test-${++compteur}`,
  }
}

/** Exécute une action et renvoie la nouvelle base (ou lève une erreur si la saisie est refusée). */
function jouer(base: Base, prenomNom: string, idAction: string, valeurs: Valeurs = {}, date = REF): Base {
  const ctx = contexte(base, prenomNom, date)
  const definition = action(idAction)
  const resultat = executerAction(definition, { ...valeursParDefaut(definition.champs(ctx)), ...valeurs }, ctx)
  if (resultat.erreurs.length > 0) throw new Error(resultat.erreurs.join(' '))
  return appliquerChangements(base, resultat.changements)
}

const fiche = (base: Base, prenomNom: string) => contexte(base, prenomNom).donnees

describe('scénario de recette : Monique réserve (cahier des charges, section 10)', () => {
  const apres = jouer(seed, 'Monique Bernard', 'reservation', { depart_id: 'malte-2027-01', moyen_paiement: 'cheques_vacances' })
  const monique = fiche(apres, 'Monique Bernard')
  const planning = planningDe(apres)

  it('passe en Réservé, avec la totalité exigible (départ à moins de 60 jours)', () => {
    expect(monique.contact.statut).toBe('reserve')
    const resa = monique.reservations[0]
    expect(resa.depart_id).toBe('malte-2027-01')
    expect(resa.acompte_montant).toBe(447)
    expect(resa.solde_montant).toBe(1043)
    expect(resa.solde_echeance).toBe(REF)
    expect(monique.devis.every((d) => d.statut === 'accepte')).toBe(true)
  })

  it('fige son score de conversion à 77 (score à la réservation) et passe au score d\'engagement', () => {
    const conversion = computeConversion(monique, planning, '2027-02-01')
    expect(conversion.score).toBe(77)
    expect(conversion.fige?.raison).toBe('Score à la réservation')
    expect(scorePrincipal(monique, planning, REF).type).toBe('engagement')
  })

  it('fait avancer le PIN de Considération à Achat', () => {
    expect(calculerParcours(fiche(seed, 'Monique Bernard'), planningDe(seed), REF).actuel?.phase).toBe('consideration')
    expect(calculerParcours(monique, planning, REF).actuel?.phase).toBe('achat')
  })

  it('le solde encaissé ensuite la fait passer en Soldé, et le PIN en Avant', () => {
    const soldee = jouer(apres, 'Monique Bernard', 'solde', { moyen_paiement: 'cheques_vacances' })
    const d = fiche(soldee, 'Monique Bernard')
    expect(d.contact.statut).toBe('solde')
    expect(calculerParcours(d, planningDe(soldee), REF).actuel?.code).toBe('solde')
    expect(computeEngagement(d, planningDe(soldee), REF).lignes.find((l) => l.code === 'E3')?.etat).toBe('obtenu')
  })

  it('la fiche de passation devient obligatoire, puis complète une fois remplie', () => {
    expect(champsManquants(monique, REF)).toContain('Fiche de passation')
    const remplie = jouer(apres, 'Monique Bernard', 'fiche_passation', {
      attentes: 'Découvrir Malte en douceur',
      craintes: 'Ne connaître personne',
      contraintes: 'Aucune',
    })
    expect(champsManquants(fiche(remplie, 'Monique Bernard'), REF)).toEqual([])
  })
})

describe('actions rapides et scores', () => {
  it('un appel entrant fait passer Marc en Prospect et lui rapporte 15 points (C10)', () => {
    const apres = jouer(seed, 'Marc Leroy', 'appel_entrant', { depart_id: 'barcelone-2027-03' })
    const marc = fiche(apres, 'Marc Leroy')
    expect(marc.contact.statut).toBe('prospect')
    expect(marc.contact.envie_depart_id).toBe('barcelone-2027-03')
    // 22 + 15 (C10) + 5 (P5 : l'envie est maintenant reliée à un départ)
    expect(computeConversion(marc, planningDe(apres), REF).score).toBe(42)
  })

  it('la découverte réalisée enregistre dates, budget et accord pour un devis', () => {
    const avant = computeConversion(fiche(seed, 'Sarah Martin'), planningDe(seed), REF).score
    const apres = jouer(seed, 'Sarah Martin', 'rdv_realise', { dispo_debut: '2027-03-01', dispo_fin: '2027-04-30', budget: 1300, accord_devis: true })
    const sarah = fiche(apres, 'Sarah Martin')
    // + C14 (12) + C15 (8) + P6 (6) + P7 (6)
    expect(computeConversion(sarah, planningDe(apres), REF).score).toBe((avant ?? 0) + 32)
    expect(sarah.contact.budget).toBe(1300)
  })

  it('un refus fait passer en Perdu avec un motif et retire 15 points (N6)', () => {
    const apres = jouer(seed, 'Sarah Martin', 'refus', { motif: 'Pas cette année' })
    const sarah = fiche(apres, 'Sarah Martin')
    expect(sarah.contact.statut).toBe('perdu')
    expect(sarah.contact.motif_perte).toBe('Refus : pas cette année')
    const conversion = computeConversion(sarah, planningDe(apres), REF)
    expect(conversion.lignes.some((l) => l.code === 'N6')).toBe(true)
    // Le comportement repart à 0 : profil 18 moins 15.
    expect(conversion.score).toBe(3)
  })

  it('une nouvelle demande fait repasser un contact Perdu en Prospect', () => {
    const perdue = jouer(seed, 'Sarah Martin', 'perdu', { motif: 'Sans réponse 14 jours après la demande' })
    expect(fiche(perdue, 'Sarah Martin').contact.statut).toBe('perdu')
    const relancee = jouer(perdue, 'Sarah Martin', 'demande_ecrite', { canal: 'whatsapp', depart_id: 'lisbonne-2027-03', question: 'Reste-t-il des places ?' })
    expect(fiche(relancee, 'Sarah Martin').contact.statut).toBe('prospect')
  })

  it('l\'envoi du devis passe en Devis envoyé avec une validité de 30 jours', () => {
    const apres = jouer(seed, 'Sarah Martin', 'devis', { depart_id: 'lisbonne-2027-03', montant: 1150 })
    const sarah = fiche(apres, 'Sarah Martin')
    expect(sarah.contact.statut).toBe('devis_envoye')
    expect(sarah.devis[0].date_fin_validite).toBe('2026-12-30')
    expect(champsManquants(sarah, REF)).toEqual([])
  })

  it('la souscription fait passer un voyageur en Abonné et lui remet un code parrain', () => {
    const voyageur = seed.contacts.find((c) => c.statut === 'voyageur' && !c.code_parrain)
    const nom = `${voyageur?.prenom} ${voyageur?.nom}`
    const apres = jouer(seed, nom, 'souscription')
    const d = fiche(apres, nom)
    expect(d.contact.statut).toBe('abonne')
    expect(d.contact.code_parrain).toMatch(/^[A-Z]+\d{2}$/)
  })

  it('la résiliation fait passer en Ancien abonné, avec un motif obligatoire', () => {
    const ctx = contexte(seed, 'Jacqueline Morel')
    expect(executerAction(action('resiliation'), { motif: '' }, ctx).erreurs).toHaveLength(1)
    const apres = jouer(seed, 'Jacqueline Morel', 'resiliation', { motif: 'Déménagement' })
    expect(fiche(apres, 'Jacqueline Morel').contact.statut).toBe('ancien_abonne')
  })
})

describe('contrôle des champs obligatoires', () => {
  it('refuse un devis sans départ', () => {
    const ctx = contexte(seed, 'Sarah Martin')
    const { erreurs } = executerAction(action('devis'), { depart_id: '', montant: 1150 }, ctx)
    expect(erreurs[0]).toContain('Offre et départ')
  })

  it('refuse une réservation sur un départ complet', () => {
    const contact = seed.contacts.find((c) => c.statut === 'prospect' && c.cible === 'parent_solo' && c.prenom !== 'Sarah')
    const ctx = contexte(seed, `${contact?.prenom} ${contact?.nom}`)
    const { erreurs } = executerAction(action('reservation'), { depart_id: 'paris-2026-12', moyen_paiement: 'carte' }, ctx)
    expect(erreurs.length).toBeGreaterThan(0)
  })

  it('exige une précision pour un motif de perte « Autre »', () => {
    const ctx = contexte(seed, 'Marc Leroy')
    expect(executerAction(action('perdu'), { motif: 'Autre', precision: '' }, ctx).erreurs).toEqual(['Précisez le motif de perte.'])
  })

  it('refuse le passage en Voyageur avant le retour du voyage', () => {
    const resa = seed.reservations.find((r) => r.depart_id === 'malte-2026-12' && r.statut !== 'annulee')
    const contact = seed.contacts.find((c) => c.id === resa?.contact_id)
    const ctx = contexte(seed, `${contact?.prenom} ${contact?.nom}`)
    expect(action('passage_voyageur').disponible(ctx)).toBe(false)
  })

  it('ne propose que les actions possibles pour le statut du contact', () => {
    const ids = (nom: string) => actionsDisponibles(contexte(seed, nom)).map((a) => a.id)
    expect(ids('Marc Leroy')).not.toContain('solde')
    expect(ids('Marc Leroy')).toContain('appel_entrant')
    expect(ids('Jacqueline Morel')).toContain('resiliation')
    expect(ids('Jacqueline Morel')).not.toContain('souscription')
  })
})

describe('transitions de statut (pipeline)', () => {
  it('chaque transition autorisée a son action', () => {
    expect(actionDeTransition('contact', 'prospect')).toBe('demande')
    expect(actionDeTransition('prospect', 'devis_envoye')).toBe('devis')
    expect(actionDeTransition('devis_envoye', 'reserve')).toBe('reservation')
    expect(actionDeTransition('reserve', 'solde')).toBe('solde')
    expect(actionDeTransition('voyageur', 'abonne')).toBe('souscription')
    expect(actionDeTransition('abonne', 'ancien_abonne')).toBe('resiliation')
    expect(actionDeTransition('perdu', 'prospect')).toBe('demande')
  })

  it('refuse les transitions impossibles, avec une explication', () => {
    expect(actionDeTransition('contact', 'solde')).toBeNull()
    expect(raisonTransitionImpossible('contact', 'solde')).toContain('Depuis Contact')
    expect(actionDeTransition('reserve', 'perdu')).toBeNull()
    expect(raisonTransitionImpossible('reserve', 'perdu')).toContain('process 18')
  })

  it('la transition Contact vers Prospect depuis le pipeline crée la demande', () => {
    const apres = jouer(seed, 'Marc Leroy', 'demande', { type: 'visite_agence', depart_id: 'hossegor-2027-04' })
    const marc = fiche(apres, 'Marc Leroy')
    expect(marc.contact.statut).toBe('prospect')
    expect(marc.evenements.some((e) => e.type === 'visite_agence' && e.code_critere === 'C11')).toBe(true)
  })
})
