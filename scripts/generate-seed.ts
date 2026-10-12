// Régénère les données de démo depuis data/ : src/data/seed.generated.json (LocalStore).
// supabase/seed.sql sera produit par ce même script en phase 4, avec le schéma.
import { writeFileSync } from 'node:fs'
import { genererBase } from '../src/seed/generer'

const base = genererBase()
writeFileSync('src/data/seed.generated.json', JSON.stringify(base, null, 1) + '\n')

const statuts = new Map<string, number>()
for (const c of base.contacts) statuts.set(c.statut, (statuts.get(c.statut) ?? 0) + 1)
console.log(`Seed ${base.version_seed} : ${base.contacts.length} contacts, ${base.evenements.length} événements, ${base.reservations.length} réservations`)
console.log([...statuts].map(([s, n]) => `${s} ${n}`).join(', '))
