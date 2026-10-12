// Le schéma SQL, le jeu de démo SQL et SupabaseStore suivent la même description des tables (schema.ts).
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed.generated.json'
import type { Base, NomTable } from '../domain/types'
import { inserer, modifier, supprimer } from './DataStore'
import { NOMS_TABLES, SCHEMA } from './schema'
import { schemaSql, seedSql, valeurSql } from './sql'
import { planifierEcritures, versLigneBase, versLigneSupabase } from './SupabaseStore'

const seed = seedJson as unknown as Base

describe('description des tables', () => {
  it('couvre toutes les tables de la base', () => {
    expect([...NOMS_TABLES].sort()).toEqual(Object.keys(seed).filter((k) => k !== 'version_seed').sort())
  })

  it('chaque champ du jeu de démo a sa colonne, au bon format', () => {
    for (const table of NOMS_TABLES) {
      const colonnes = SCHEMA[table].colonnes
      for (const ligne of seed[table] as unknown as Record<string, unknown>[]) {
        for (const [champ, valeur] of Object.entries(ligne)) {
          if (champ === 'id') continue
          expect(colonnes[champ], `${table}.${champ}`).toBeDefined()
          if (valeur === null) continue
          if (colonnes[champ] === 'date') expect(valeur, `${table}.${champ}`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
          if (colonnes[champ] === 'horodatage') expect(valeur, `${table}.${champ}`).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
          if (colonnes[champ] === 'entier') expect(Number.isInteger(valeur), `${table}.${champ}`).toBe(true)
          if (colonnes[champ] === 'booleen') expect(typeof valeur, `${table}.${champ}`).toBe('boolean')
        }
      }
    }
  })
})

describe('fichiers SQL', () => {
  it('le schéma est rejouable et protège chaque table (RLS : utilisateur connecté)', () => {
    const sql = schemaSql()
    for (const table of NOMS_TABLES) {
      expect(sql).toContain(`create table if not exists public.${table} (id text primary key);`)
      expect(sql).toContain(`alter table public.${table} enable row level security;`)
      expect(sql).toContain(`on public.${table} for all to authenticated using (auth.role() = 'authenticated')`)
    }
    expect(sql).not.toMatch(/\bcreate table public\./)
  })

  it('le jeu de démo SQL vide les tables puis insère toutes les lignes, apostrophes doublées', () => {
    expect(valeurSql("Compte de l'évaluation")).toBe("'Compte de l''évaluation'")
    expect(valeurSql({ note: 8 })).toBe('\'{"note":8}\'')
    expect(valeurSql(null)).toBe('null')
    const sql = seedSql(seed)
    expect(sql.startsWith('-- ')).toBe(true)
    expect(sql).toContain('truncate table public.equipe')
    const lignesInserees = (sql.match(/^\('/gm) ?? []).length
    const total = NOMS_TABLES.reduce((s, t) => s + (seed[t] as unknown[]).length, 0)
    expect(lignesInserees).toBe(total)
  })
})

describe('SupabaseStore : conversions et écritures', () => {
  it('remet les horodatages et les nombres au format du CRM', () => {
    const ligne = versLigneBase('taches', { id: 't1', echeance: '2026-11-30T10:00:00', fait_le: '2026-11-30 11:15:00', titre: 'x' })
    expect(ligne).toMatchObject({ echeance: '2026-11-30T10:00', fait_le: '2026-11-30T11:15' })
    expect(versLigneBase('devis', { id: 'd1', montant: '1490.50', date_envoi: '2026-11-02' })).toMatchObject({ montant: 1490.5, date_envoi: '2026-11-02' })
  })

  it('n\'envoie que les colonnes connues', () => {
    expect(versLigneSupabase('equipe', { id: 'x', prenom: 'Lilou', inconnu: 1, created_at: 'a' })).toEqual({ id: 'x', prenom: 'Lilou' })
  })

  it('regroupe les changements : insertion puis modification fusionnées, insertion puis suppression annulées', () => {
    const tache = seed.taches[0]
    const plan = planifierEcritures([
      inserer('taches', { ...tache, id: 'n1' }),
      modifier('taches', 'n1', { statut: 'fait' }),
      inserer('taches', { ...tache, id: 'n2' }),
      supprimer('taches', 'n2'),
      modifier('contacts', 'c1', { statut: 'perdu' }),
      modifier('contacts', 'c1', { motif_perte: 'Sans réponse' }),
      supprimer('evenements', 'e1'),
    ])
    expect(plan.insertions.get('taches' as NomTable)).toMatchObject([{ id: 'n1', statut: 'fait' }])
    expect(plan.modifications).toEqual([{ table: 'contacts', id: 'c1', valeurs: { statut: 'perdu', motif_perte: 'Sans réponse' } }])
    expect(plan.suppressions.get('evenements')).toEqual(['e1'])
  })
})
