import { describe, expect, it } from 'vitest'
import { formatDate, formatDateHeure, formatMontant, formatPoints } from './format'

describe('formats d\'affichage', () => {
  it('affiche les dates au format 30/11/2026', () => {
    expect(formatDate('2026-11-30')).toBe('30/11/2026')
    expect(formatDate('2026-11-30T18:30')).toBe('30/11/2026')
    expect(formatDateHeure('2026-11-30T18:30')).toBe('30/11/2026 à 18 h 30')
  })

  it('affiche les montants au format 1 490 €', () => {
    expect(formatMontant(1490)).toBe('1 490 €')
    expect(formatMontant(1162.5)).toBe('1 162,50 €')
    expect(formatMontant(29)).toBe('29 €')
  })

  it('affiche les points avec une virgule', () => {
    expect(formatPoints(7.5)).toBe('7,5')
    expect(formatPoints(15)).toBe('15')
  })
})
