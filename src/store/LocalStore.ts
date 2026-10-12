// Données de démonstration en mémoire, sauvegardées dans le navigateur (localStorage).
// Utilisé en développement, dans les tests et quand Supabase n'est pas configuré.
import type { Base } from '../domain/types'
import { appliquerChangements, type Changement, type DataStore } from './DataStore'

const CLE_STOCKAGE = 'solia-crm-base'

/** Stockage minimal (localStorage dans le navigateur, un objet en mémoire dans les tests). */
export interface Stockage {
  getItem(cle: string): string | null
  setItem(cle: string, valeur: string): void
  removeItem(cle: string): void
}

function stockageNavigateur(): Stockage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export class LocalStore implements DataStore {
  readonly mode = 'local' as const
  private base: Base | null = null

  constructor(
    private readonly chargerSeed: () => Promise<Base>,
    private readonly stockage: Stockage | null = stockageNavigateur(),
  ) {}

  async charger(): Promise<Base> {
    const seed = await this.chargerSeed()
    const sauvegarde = this.lire()
    // Si le jeu de démo a été régénéré, on repart du nouveau seed.
    this.base = sauvegarde && sauvegarde.version_seed === seed.version_seed ? sauvegarde : structuredClone(seed)
    return this.base
  }

  async enregistrer(changements: Changement[]): Promise<void> {
    if (!this.base) await this.charger()
    this.base = appliquerChangements(this.base as Base, changements)
    this.ecrire(this.base)
  }

  async reinitialiser(): Promise<Base> {
    try {
      this.stockage?.removeItem(CLE_STOCKAGE)
    } catch {
      // stockage indisponible : on continue en mémoire
    }
    this.base = structuredClone(await this.chargerSeed())
    return this.base
  }

  private lire(): Base | null {
    try {
      const texte = this.stockage?.getItem(CLE_STOCKAGE)
      return texte ? (JSON.parse(texte) as Base) : null
    } catch {
      return null
    }
  }

  private ecrire(base: Base): void {
    try {
      this.stockage?.setItem(CLE_STOCKAGE, JSON.stringify(base))
    } catch {
      // stockage plein ou bloqué : les données restent en mémoire pour la session
    }
  }
}
