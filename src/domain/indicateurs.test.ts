// Indicateurs du tableau de bord (cahier des charges, section 9).
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed.generated.json'
import { baseReferentiel } from '../seed/baseReferentiel'
import { indexerBase, planningDe } from './donneesContact'
import { calculerIndicateurs, chiffresCles, heuresOuvrees, mediane, pourcentage, repartitionPaliers } from './indicateurs'
import { scorePrincipal } from './scoring'
import type { Base } from './types'
import { vueALaDate } from './vueALaDate'

const REF = '2026-11-30'
const seed = vueALaDate(seedJson as unknown as Base, REF)

describe('outils de calcul', () => {
  it('heures ouvrées : le week-end ne compte pas', () => {
    // Vendredi 27/11 à 16 h, lundi 30/11 à 10 h : 8 h le vendredi et 10 h le lundi.
    expect(heuresOuvrees('2026-11-27T16:00', '2026-11-30T10:00')).toBe(18)
    expect(heuresOuvrees('2026-11-24T09:00', '2026-11-24T11:30')).toBe(2.5)
  })

  it('pourcentage arrondi, et « Pas de donnée » sans effectif', () => {
    expect(pourcentage(2, 3)).toBe('67 %')
    expect(pourcentage(0, 0)).toBe('Pas de donnée')
    expect(mediane([80, 62, 70])).toBe(70)
    expect(mediane([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('indicateurs des process sur le jeu de démo au 30/11/2026', () => {
  const indicateurs = calculerIndicateurs(seed, REF)
  const valeur = (id: string) => indicateurs.find((i) => i.id === id)!

  it('les 21 indicateurs de la section 9, chacun avec sa définition et son process', () => {
    expect(indicateurs).toHaveLength(21)
    for (const i of indicateurs) {
      expect(i.definition.length, i.id).toBeGreaterThan(20)
      expect(i.process, i.id).not.toBe('')
      expect(i.valeur, i.id).not.toBe('Pas de donnée')
    }
    expect(indicateurs.filter((i) => i.cle).map((i) => i.id)).toEqual(['conversion_abonnes'])
  })

  it('le délai de première réponse respecte les 24 h ouvrées du process 02', () => {
    expect(parseFloat(valeur('delai_reponse').valeur.replace(',', '.'))).toBeLessThan(24)
  })

  it('les taux sont des pourcentages entre 0 et 100', () => {
    for (const i of indicateurs.filter((x) => x.valeur.endsWith(' %'))) {
      const n = Number(i.valeur.replace(' %', ''))
      expect(n, i.id).toBeGreaterThanOrEqual(0)
      expect(n, i.id).toBeLessThanOrEqual(100)
    }
  })
})

describe('NPS et conversion en abonnés sur un cas construit', () => {
  it('NPS = part des 9 et 10 moins part des 0 à 6', () => {
    const base = baseReferentiel()
    const notes = [10, 9, 9, 8, 7, 6, 3, 10, 9, 5]
    notes.forEach((nps, i) =>
      base.enquetes.push({ id: `e${i}`, contact_id: `c${i}`, reservation_id: null, type: 'voyage', nps, notes_par_temps: {}, commentaire: null, date: '2026-11-20', avis_google_publie: false }),
    )
    // 5 promoteurs, 3 détracteurs sur 10 réponses : +20.
    expect(calculerIndicateurs(base, REF).find((i) => i.id === 'nps')?.valeur).toBe('+20')
  })
})

describe('chiffres clés et paliers', () => {
  const donnees = indexerBase(seed)
  const planning = planningDe(seed)
  const scores = new Map(seed.contacts.map((c) => [c.id, scorePrincipal(donnees(c.id), planning, REF)]))

  it('les chiffres clés sont cohérents avec la démo', () => {
    const chiffres = chiffresCles(seed, REF, scores)
    expect(chiffres.tachesEnRetard).toBe(7)
    expect(chiffres.abonnesActifs).toBeGreaterThanOrEqual(seed.contacts.filter((c) => c.statut === 'abonne').length)
    expect(chiffres.remplissageProchains.places).toBe(54)
    // Monique (77, Prêt à réserver) est comptée parmi les prospects chauds.
    expect(chiffres.prospectsChauds).toBeGreaterThan(0)
  })

  it('chaque contact sans réservation a un palier de conversion, chaque client un palier d\'engagement', () => {
    const { conversion, engagement } = repartitionPaliers(seed, REF, scores)
    const avantAchat = seed.contacts.filter((c) => ['contact', 'prospect', 'devis_envoye'].includes(c.statut)).length
    expect(conversion.reduce((s, [, n]) => s + n, 0)).toBe(avantAchat)
    expect(engagement.reduce((s, [, n]) => s + n, 0)).toBeGreaterThan(100)
  })
})
