import { describe, expect, it } from 'vitest'
import { inserer, modifier } from './DataStore'
import { LocalStore, type Stockage } from './LocalStore'
import { baseReferentiel } from '../seed/baseReferentiel'

function stockageMemoire(): Stockage {
  const donnees = new Map<string, string>()
  return {
    getItem: (cle) => donnees.get(cle) ?? null,
    setItem: (cle, valeur) => void donnees.set(cle, valeur),
    removeItem: (cle) => void donnees.delete(cle),
  }
}

describe('LocalStore', () => {
  it('charge les référentiels de data/ et la date de démo', async () => {
    const store = new LocalStore(async () => baseReferentiel(), stockageMemoire())
    const base = await store.charger()
    expect(base.equipe).toHaveLength(6)
    expect(base.departs).toHaveLength(36)
    expect(base.activites).toHaveLength(52)
    expect(base.parametres[0].date_reference).toBe('2026-11-30')
  })

  it('persiste les changements et les relit au prochain chargement', async () => {
    const stockage = stockageMemoire()
    const store = new LocalStore(async () => baseReferentiel(), stockage)
    await store.charger()
    await store.enregistrer([
      modifier('parametres', 'parametres', { date_reference: '2026-12-07' }),
      inserer('liste_attente', { id: 'a1', depart_id: 'paris-2026-12', contact_id: 'c1', date: '2026-11-30' }),
    ])
    const relu = await new LocalStore(async () => baseReferentiel(), stockage).charger()
    expect(relu.parametres[0].date_reference).toBe('2026-12-07')
    expect(relu.liste_attente).toHaveLength(1)
  })

  it('réinitialise les données de démo', async () => {
    const stockage = stockageMemoire()
    const store = new LocalStore(async () => baseReferentiel(), stockage)
    await store.charger()
    await store.enregistrer([modifier('parametres', 'parametres', { date_reference: '2027-01-01' })])
    const base = await store.reinitialiser()
    expect(base.parametres[0].date_reference).toBe('2026-11-30')
    expect(stockage.getItem('solia-crm-base')).toBeNull()
  })
})
