// Règles de la charte et d'écriture (CLAUDE.md) vérifiées automatiquement.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function fichiers(dossier: string, extensions: string[]): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) return fichiers(chemin, extensions)
    return extensions.some((ext) => nom.endsWith(ext)) ? [chemin] : []
  })
}

const SOURCES = fichiers('src', ['.ts', '.tsx', '.css', '.json']).filter((f) => !f.endsWith('charte.test.ts'))
const DONNEES = fichiers('data', ['.json', '.csv'])

describe('charte Solia', () => {
  it('aucun tiret long dans l\'interface ni dans les données', () => {
    const fautifs = [...SOURCES, DONNEES].flat().filter((f) => /[—–]/.test(readFileSync(f, 'utf8')))
    expect(fautifs).toEqual([])
  })

  it('aucune icône d\'avion, de valise ou de mappemonde', () => {
    const interdit = /\b(Plane|Airplane|Luggage|Suitcase|Briefcase|Globe|Earth|WorldMap)\b|✈|🧳|🌍|🌎|🌏|🗺/
    const fautifs = SOURCES.filter((f) => interdit.test(readFileSync(f, 'utf8')))
    expect(fautifs).toEqual([])
  })
})
