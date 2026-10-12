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

/** Applique des changements à une base, sans la modifier (renvoie une nouvelle base). */
export function appliquerChangements(base: Base, changements: Changement[]): Base {
  const resultat: Base = { ...base }
  const maintenant = new Date().toISOString()
  for (const changement of changements) {
    const lignes = resultat[changement.table] as { id: string }[]
    if (changement.op === 'inserer') {
      const ligne = { created_at: maintenant, updated_at: maintenant, ...changement.ligne }
      ;(resultat[changement.table] as { id: string }[]) = [...lignes, ligne]
    } else if (changement.op === 'modifier') {
      ;(resultat[changement.table] as { id: string }[]) = lignes.map((ligne) =>
        ligne.id === changement.id ? { ...ligne, ...changement.valeurs, updated_at: maintenant } : ligne,
      )
    } else {
      ;(resultat[changement.table] as { id: string }[]) = lignes.filter((ligne) => ligne.id !== changement.id)
    }
  }
  return resultat
}
