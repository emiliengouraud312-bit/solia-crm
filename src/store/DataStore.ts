// Accès aux données. Le reste de l'application ne connaît que cette interface :
// LocalStore (données de démo dans le navigateur) et SupabaseStore (phase 4) l'implémentent.
import type { Base, NomTable } from '../domain/types'

type LigneDe<T extends NomTable> = Base[T][number]

export type Changement =
  | { op: 'inserer'; table: NomTable; ligne: { id: string } }
  | { op: 'modifier'; table: NomTable; id: string; valeurs: Record<string, unknown> }
  | { op: 'supprimer'; table: NomTable; id: string }

export interface DataStore {
  readonly mode: 'local' | 'supabase'
  /** Charge toutes les tables. */
  charger(): Promise<Base>
  /** Enregistre une liste de changements (insertions, modifications, suppressions). */
  enregistrer(changements: Changement[]): Promise<void>
  /** Remet les données de démonstration d'origine. */
  reinitialiser(): Promise<Base>
}

export function inserer<T extends NomTable>(table: T, ligne: LigneDe<T>): Changement {
  return { op: 'inserer', table, ligne }
}

export function modifier<T extends NomTable>(table: T, id: string, valeurs: Partial<LigneDe<T>>): Changement {
  return { op: 'modifier', table, id, valeurs: valeurs as Record<string, unknown> }
}

export function supprimer(table: NomTable, id: string): Changement {
  return { op: 'supprimer', table, id }
}

/**
 * Applique des changements à une base, sans la modifier (renvoie une nouvelle base).
 * `horodater` ajoute created_at et updated_at (désactivé par le seed, qui doit rester déterministe).
 */
export function appliquerChangements(base: Base, changements: Changement[], horodater = true): Base {
  const resultat: Base = { ...base }
  const maintenant = new Date().toISOString()
  const dates = horodater ? { created_at: maintenant, updated_at: maintenant } : {}
  // Une copie et un index par table touchée : appliquer des milliers de changements reste rapide.
  const tables = new Map<NomTable, { lignes: ({ id: string } | null)[]; index: Map<string, number> }>()
  const table = (nom: NomTable) => {
    let t = tables.get(nom)
    if (!t) {
      const lignes = [...(base[nom] as { id: string }[])]
      t = { lignes, index: new Map(lignes.map((l, i) => [l.id, i])) }
      tables.set(nom, t)
    }
    return t
  }
  for (const changement of changements) {
    const t = table(changement.table)
    if (changement.op === 'inserer') {
      t.index.set(changement.ligne.id, t.lignes.length)
      t.lignes.push({ ...dates, ...changement.ligne })
    } else {
      const position = t.index.get(changement.id)
      if (position === undefined || !t.lignes[position]) continue
      if (changement.op === 'modifier') {
        t.lignes[position] = { ...t.lignes[position], ...changement.valeurs, ...(horodater ? { updated_at: maintenant } : {}) } as { id: string }
      } else {
        t.lignes[position] = null
        t.index.delete(changement.id)
      }
    }
  }
  for (const [nom, t] of tables) {
    ;(resultat[nom] as { id: string }[]) = t.lignes.filter((l): l is { id: string } => l !== null)
  }
  return resultat
}
