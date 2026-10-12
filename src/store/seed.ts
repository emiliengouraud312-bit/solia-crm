// Jeu de données de départ de LocalStore : le fichier produit par `npm run seed`.
import type { Base } from '../domain/types'

export async function chargerSeed(): Promise<Base> {
  const module = await import('../data/seed.generated.json')
  return module.default as unknown as Base
}
