import { describe, expect, it } from 'vitest'
import { age, ajouterJours, ecartJours, estPasse, jourSemaine } from './dates'

describe('dates', () => {
  it('ajoute des jours en changeant de mois et d\'année', () => {
    expect(ajouterJours('2026-11-30', 1)).toBe('2026-12-01')
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01')
    expect(ajouterJours('2026-11-30', -30)).toBe('2026-10-31')
  })

  it('calcule un écart en jours entre deux dates ou horodatages', () => {
    expect(ecartJours('2026-11-20', '2027-01-04')).toBe(45)
    expect(ecartJours('2026-11-30T18:30', '2026-12-01')).toBe(1)
  })

  it('un événement du jour même compte comme passé', () => {
    expect(estPasse('2026-11-30T17:45', '2026-11-30')).toBe(true)
    expect(estPasse('2026-12-01T08:00', '2026-11-30')).toBe(false)
  })

  it('donne le jour de la semaine (0 dimanche)', () => {
    expect(jourSemaine('2026-11-30')).toBe(1) // lundi
    expect(jourSemaine('2026-11-29')).toBe(0) // dimanche
  })

  it('calcule un âge en années révolues', () => {
    expect(age('1958-12-01', '2026-11-30')).toBe(67)
    expect(age('1958-11-30', '2026-11-30')).toBe(68)
  })
})
