// La frise du parcours et la position du PIN, sur le jeu de démonstration au 30/11/2026.
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed.generated.json'
import { indexerBase, planningDe } from './donneesContact'
import { calculerParcours, estAmbassadeur, phaseDeLEvenement, PHASES } from './parcours'
import type { Base } from './types'

const base = seedJson as unknown as Base
const REF = '2026-11-30'
const donnees = indexerBase(base)
const planning = planningDe(base)

const contact = (prenomNom: string) => {
  const c = base.contacts.find((x) => `${x.prenom} ${x.nom}` === prenomNom)
  if (!c) throw new Error(prenomNom)
  return c
}
const parcoursDe = (prenomNom: string, date = REF) => calculerParcours(donnees(contact(prenomNom).id), planning, date)

describe('frise du parcours', () => {
  it('compte 7 phases et 24 jalons, dans l\'ordre du cahier des charges', () => {
    expect(PHASES.map((p) => p.libelle)).toEqual(['Curiosité', 'Considération', 'Achat', 'Avant', 'Pendant', 'Après', 'Loyauté'])
    expect(PHASES.flatMap((p) => p.jalons)).toHaveLength(24)
  })

  it('Marc est en Curiosité : bienvenue envoyée automatiquement à J+2', () => {
    const p = parcoursDe('Marc Leroy')
    expect(p.actuel?.phase).toBe('curiosite')
    expect(p.actuel?.code).toBe('bienvenue')
    expect(p.actuel?.date?.startsWith('2026-11-14')).toBe(true)
    expect(p.grise).toBe(false)
  })

  it('Monique est en Considération, sur la relance du devis du 30/11', () => {
    const p = parcoursDe('Monique Bernard')
    expect(p.actuel?.phase).toBe('consideration')
    expect(p.actuel?.code).toBe('relance_devis')
    expect(p.jalons.filter((j) => j.phase === 'consideration').every((j) => j.atteint)).toBe(true)
    // Le 22/11, elle vient d'appeler : la réponse est donnée en direct.
    expect(parcoursDe('Monique Bernard', '2026-11-22').actuel?.code).toBe('reponse')
  })

  it('Sarah a reçu une réponse personnelle sous 24 h ouvrées', () => {
    const p = parcoursDe('Sarah Martin')
    expect(p.actuel?.code).toBe('reponse')
    expect(p.actuel?.date?.startsWith('2026-11-23')).toBe(true)
  })

  it('Jacqueline est en Loyauté : abonnée et venue aux activités', () => {
    const p = parcoursDe('Jacqueline Morel')
    expect(p.actuel?.phase).toBe('loyaute')
    expect(p.jalons.find((j) => j.code === 'abonne')?.atteint).toBe(true)
    expect(p.jalons.find((j) => j.code === 'activites')?.atteint).toBe(true)
    expect(p.jalons.find((j) => j.code === 'nouveau_voyage')?.atteint).toBe(false)
  })

  it('les voyageurs de Barcelone rentrés le 29/11 sont en Après, sur le retour', () => {
    const resa = base.reservations.find((r) => r.depart_id === 'barcelone-2026-11')
    const p = calculerParcours(donnees(resa?.contact_id ?? ''), planning, REF)
    expect(p.actuel?.code).toBe('retour')
  })

  it('un contact Perdu a un PIN grisé sur sa dernière étape, avec le motif', () => {
    const perdu = base.contacts.find((c) => c.statut === 'perdu' && c.motif_perte?.startsWith('Refus'))
    const p = calculerParcours(donnees(perdu?.id ?? ''), planning, REF)
    expect(p.grise).toBe(true)
    expect(p.mention).toContain('Refus')
    expect(p.actuel).not.toBeNull()
  })

  it('un ancien abonné a un PIN grisé sur Loyauté', () => {
    const ancien = base.contacts.find((c) => c.statut === 'ancien_abonne')
    const p = calculerParcours(donnees(ancien?.id ?? ''), planning, REF)
    expect(p.grise).toBe(true)
    expect(p.actuel?.phase).toBe('loyaute')
    expect(p.mention).toContain('Ancien abonné')
  })

  it('un voyage annulé s\'arrête à la date d\'annulation', () => {
    const annulee = base.reservations.find((r) => r.statut === 'annulee' && r.depart_id === 'barcelone-2026-12')
    const p = calculerParcours(donnees(annulee?.contact_id ?? ''), planning, REF)
    expect(p.grise).toBe(true)
    expect(p.jalons.find((j) => j.code === 'brise_glace')?.atteint).toBe(false)
    expect(p.jalons.find((j) => j.code === 'depart')?.atteint).toBe(false)
  })

  it('un client qui repart : la frise montre le voyage en cours, et l\'ancien voyage reste consultable', () => {
    const voyageursMultiples = base.contacts.filter((c) => base.reservations.filter((r) => r.contact_id === c.id).length > 1)
    expect(voyageursMultiples.length).toBeGreaterThanOrEqual(3)
    const d = donnees(voyageursMultiples[0].id)
    const enCours = calculerParcours(d, planning, REF)
    expect(enCours.voyages).toHaveLength(2)
    expect(['achat', 'avant']).toContain(enCours.actuel?.phase)
    const ancien = calculerParcours(d, planning, REF, enCours.voyages[1].id)
    expect(ancien.jalons.find((j) => j.code === 'nouveau_voyage')?.atteint).toBe(true)
    expect(ancien.actuel?.code).toBe('nouveau_voyage')
  })

  it('avant la création de la fiche, aucun jalon n\'est atteint', () => {
    expect(parcoursDe('Monique Bernard', '2026-11-01').actuel).toBeNull()
  })

  it('range chaque événement du journal dans une phase', () => {
    const p = parcoursDe('Jacqueline Morel')
    const phases = new Set(p.evenements.map((e) => phaseDeLEvenement(e, p)).filter(Boolean))
    expect([...phases]).toEqual(expect.arrayContaining(['curiosite', 'consideration', 'achat', 'avant', 'pendant', 'apres', 'loyaute']))
  })

  it('le badge Ambassadeur suit l\'acompte du filleul', () => {
    expect(estAmbassadeur(donnees(contact('Thomas Garnier').id), REF)).toBe(true)
    expect(estAmbassadeur(donnees(contact('Julie Petit').id), REF)).toBe(false)
    expect(estAmbassadeur(donnees(contact('Thomas Garnier').id), '2026-11-01')).toBe(false)
  })
})

describe('points des pastilles', () => {
  it('chaque critère obtenu apparaît sur l\'événement qui le prouve', async () => {
    const { computeConversion, computeEngagement } = await import('./scoring')
    const { pointsParEvenement } = await import('./parcours')
    const d = donnees(contact('Jacqueline Morel').id)
    const parcours = calculerParcours(d, planning, REF)
    const engagement = computeEngagement(d, planning, REF)
    const points = pointsParEvenement(d.evenements, computeConversion(d, planning, REF), engagement, parcours.reservation)
    const codes = [...points.values()].flat().filter((p) => p.score === 'engagement').map((p) => p.code).sort()
    // E1, E3, E4, E5, E8, E9, E10, E11 sur des événements du journal ; E12 sur la présence à l'activité du 10/11.
    expect(codes).toEqual(['E1', 'E10', 'E11', 'E12', 'E3', 'E4', 'E5', 'E8', 'E9'])
  })
})
