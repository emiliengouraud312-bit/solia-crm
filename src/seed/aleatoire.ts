// Générateur pseudo-aléatoire à graine fixe (mulberry32) : relancé, le seed redonne
// exactement les mêmes données.
export class Aleatoire {
  private etat: number

  constructor(graine: number) {
    this.etat = graine >>> 0
  }

  /** Nombre entre 0 (inclus) et 1 (exclu). */
  suivant(): number {
    this.etat = (this.etat + 0x6d2b79f5) >>> 0
    let t = this.etat
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Entier entre min et max inclus. */
  entier(min: number, max: number): number {
    return min + Math.floor(this.suivant() * (max - min + 1))
  }

  chance(probabilite: number): boolean {
    return this.suivant() < probabilite
  }

  choix<T>(liste: readonly T[]): T {
    return liste[Math.floor(this.suivant() * liste.length)]
  }

  /** Choix pondéré : [[valeur, poids], ...]. */
  pondere<T>(options: readonly (readonly [T, number])[]): T {
    const total = options.reduce((s, [, poids]) => s + poids, 0)
    let tirage = this.suivant() * total
    for (const [valeur, poids] of options) {
      tirage -= poids
      if (tirage < 0) return valeur
    }
    return options[options.length - 1][0]
  }

  melanger<T>(liste: readonly T[]): T[] {
    const copie = [...liste]
    for (let i = copie.length - 1; i > 0; i--) {
      const j = Math.floor(this.suivant() * (i + 1))
      ;[copie[i], copie[j]] = [copie[j], copie[i]]
    }
    return copie
  }

  /** Identifiant au format uuid (version 4), reproductible. */
  uuid(): string {
    const hex = Array.from({ length: 32 }, () => Math.floor(this.suivant() * 16).toString(16))
    hex[12] = '4'
    hex[16] = ['8', '9', 'a', 'b'][Math.floor(this.suivant() * 4)]
    const s = hex.join('')
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
  }
}
