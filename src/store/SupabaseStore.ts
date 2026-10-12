// Données partagées dans Supabase (Postgres). Utilisé quand VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
// sont définies. Toutes les tables sont lues au chargement ; chaque action enregistre ses changements.
// Si la base est vide (première ouverture), le jeu de démo y est installé, identique au mode local.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Base, NomTable } from '../domain/types'
import type { Changement, DataStore } from './DataStore'
import { NOMS_TABLES, SCHEMA } from './schema'
import { colonnesDe } from './sql'

const TAILLE_PAGE = 1000
const TAILLE_LOT = 500
/** Ces tables ont une clé d'unicité du moteur : deux navigateurs ne créent jamais deux fois la même ligne. */
const CLE_MOTEUR: Partial<Record<NomTable, string>> = { taches: 'cle_unicite', messages_envoyes: 'cle_unicite' }

type Ligne = Record<string, unknown>

/** Ligne lue dans Supabase, remise au format du CRM (horodatage « 2026-11-30T10:00 », nombres). */
export function versLigneBase(table: NomTable, ligne: Ligne): Ligne {
  const resultat: Ligne = { ...ligne }
  for (const [colonne, type] of Object.entries(SCHEMA[table].colonnes)) {
    const valeur = resultat[colonne]
    if (typeof valeur !== 'string' && type !== 'json') continue
    if (type === 'horodatage') resultat[colonne] = (valeur as string).replace(' ', 'T').slice(0, 16)
    else if (type === 'date') resultat[colonne] = (valeur as string).slice(0, 10)
    else if (type === 'nombre' || type === 'entier') resultat[colonne] = Number(valeur)
    else if (type === 'json' && valeur === null) resultat[colonne] = {}
  }
  return resultat
}

/** Ligne écrite dans Supabase : seulement les colonnes connues du schéma. */
export function versLigneSupabase(table: NomTable, ligne: Ligne): Ligne {
  const colonnes = new Set(colonnesDe(table))
  return Object.fromEntries(Object.entries(ligne).filter(([cle]) => colonnes.has(cle)))
}

export interface PlanEcriture {
  suppressions: Map<NomTable, string[]>
  insertions: Map<NomTable, Ligne[]>
  modifications: { table: NomTable; id: string; valeurs: Ligne }[]
}

/**
 * Regroupe les changements par table : une ligne insérée puis modifiée dans le même lot est insérée
 * directement dans son état final, une ligne insérée puis supprimée n'est pas envoyée.
 */
export function planifierEcritures(changements: Changement[]): PlanEcriture {
  const insertions = new Map<NomTable, Map<string, Ligne>>()
  const modifications = new Map<string, { table: NomTable; id: string; valeurs: Ligne }>()
  const suppressions = new Map<NomTable, Set<string>>()
  for (const c of changements) {
    if (c.op === 'inserer') {
      if (!insertions.has(c.table)) insertions.set(c.table, new Map())
      insertions.get(c.table)!.set(c.ligne.id, { ...c.ligne })
      suppressions.get(c.table)?.delete(c.ligne.id)
    } else if (c.op === 'modifier') {
      const inseree = insertions.get(c.table)?.get(c.id)
      if (inseree) Object.assign(inseree, c.valeurs)
      else {
        const cle = `${c.table}:${c.id}`
        const actuelle = modifications.get(cle)
        modifications.set(cle, { table: c.table, id: c.id, valeurs: { ...actuelle?.valeurs, ...c.valeurs } })
      }
    } else {
      if (insertions.get(c.table)?.delete(c.id)) continue
      modifications.delete(`${c.table}:${c.id}`)
      if (!suppressions.has(c.table)) suppressions.set(c.table, new Set())
      suppressions.get(c.table)!.add(c.id)
    }
  }
  return {
    suppressions: new Map([...suppressions].filter(([, ids]) => ids.size > 0).map(([t, ids]) => [t, [...ids]])),
    insertions: new Map([...insertions].filter(([, lignes]) => lignes.size > 0).map(([t, lignes]) => [t, [...lignes.values()]])),
    modifications: [...modifications.values()],
  }
}

export class SupabaseStore implements DataStore {
  readonly mode = 'supabase' as const
  /** Les écritures partent dans l'ordre des actions, l'une après l'autre. */
  private file: Promise<void> = Promise.resolve()

  constructor(
    private readonly client: SupabaseClient,
    private readonly chargerSeed: () => Promise<Base>,
  ) {}

  async charger(): Promise<Base> {
    const tables = await Promise.all(NOMS_TABLES.map((table) => this.lireTable(table)))
    const base = Object.fromEntries(NOMS_TABLES.map((table, i) => [table, tables[i]])) as unknown as Base
    // Première ouverture : la base est vide, on installe le jeu de démo.
    if (base.parametres.length === 0) return this.reinitialiser()
    base.evenements.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    base.version_seed = base.parametres[0].version_seed ?? 'supabase'
    return base
  }

  enregistrer(changements: Changement[]): Promise<void> {
    const suite = this.file.then(() => this.ecrire(planifierEcritures(changements)))
    // Une erreur est remontée à l'appelant, sans bloquer les enregistrements suivants.
    this.file = suite.catch(() => undefined)
    return suite
  }

  async reinitialiser(): Promise<Base> {
    const seed = structuredClone(await this.chargerSeed())
    // parametres d'abord : tant qu'il manque, la base est considérée comme vide et sera réinstallée.
    for (const table of ['parametres', ...NOMS_TABLES.filter((t) => t !== 'parametres')] as NomTable[]) {
      const { error } = await this.client.from(table).delete().neq('id', '')
      if (error) throw new Error(`Réinitialisation de ${table} : ${error.message}`)
    }
    for (const table of NOMS_TABLES) {
      await this.inserer(table, seed[table] as unknown as Ligne[], false)
    }
    return seed
  }

  private async lireTable(table: NomTable): Promise<Ligne[]> {
    const lignes: Ligne[] = []
    let total = Infinity
    while (lignes.length < total) {
      const debut = lignes.length
      const { data, error, count } = await this.client
        .from(table)
        .select('*', { count: debut === 0 ? 'exact' : undefined })
        .order('id')
        .range(debut, debut + TAILLE_PAGE - 1)
      if (error) throw new Error(`Lecture de ${table} : ${error.message}`)
      if (debut === 0) total = count ?? 0
      if (!data || data.length === 0) break
      lignes.push(...data.map((ligne) => versLigneBase(table, ligne as Ligne)))
    }
    return lignes
  }

  private async inserer(table: NomTable, lignes: Ligne[], ignorerDoublons: boolean): Promise<void> {
    for (let i = 0; i < lignes.length; i += TAILLE_LOT) {
      const lot = lignes.slice(i, i + TAILLE_LOT).map((l) => versLigneSupabase(table, l))
      const cle = CLE_MOTEUR[table]
      const { error } =
        ignorerDoublons && cle
          ? await this.client.from(table).upsert(lot, { onConflict: cle, ignoreDuplicates: true })
          : await this.client.from(table).insert(lot)
      if (error) throw new Error(`Enregistrement dans ${table} : ${error.message}`)
    }
  }

  private async ecrire(plan: PlanEcriture): Promise<void> {
    for (const [table, ids] of plan.suppressions) {
      const { error } = await this.client.from(table).delete().in('id', ids)
      if (error) throw new Error(`Suppression dans ${table} : ${error.message}`)
    }
    for (const [table, lignes] of plan.insertions) await this.inserer(table, lignes, true)
    const maintenant = new Date().toISOString()
    // Les modifications partent par petits groupes en parallèle.
    for (let i = 0; i < plan.modifications.length; i += 8) {
      const resultats = await Promise.all(
        plan.modifications.slice(i, i + 8).map(({ table, id, valeurs }) =>
          this.client
            .from(table)
            .update({ ...versLigneSupabase(table, valeurs), updated_at: maintenant })
            .eq('id', id),
        ),
      )
      const echec = resultats.find((r) => r.error)
      if (echec?.error) throw new Error(`Modification : ${echec.error.message}`)
    }
  }
}
