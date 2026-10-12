// Régénère les données de démo depuis data/ : src/data/seed.generated.json (LocalStore),
// supabase/migrations/001_schema.sql et supabase/seed.sql (Supabase). Les deux modes affichent les mêmes données.
import { mkdirSync, writeFileSync } from 'node:fs'
import { genererBase } from '../src/seed/generer'
import { schemaSql, seedSql } from '../src/store/sql'

const base = genererBase()
writeFileSync('src/data/seed.generated.json', JSON.stringify(base, null, 1) + '\n')
mkdirSync('supabase/migrations', { recursive: true })
writeFileSync('supabase/migrations/001_schema.sql', schemaSql())
writeFileSync('supabase/seed.sql', seedSql(base))

const statuts = new Map<string, number>()
for (const c of base.contacts) statuts.set(c.statut, (statuts.get(c.statut) ?? 0) + 1)
console.log(`Seed ${base.version_seed} : ${base.contacts.length} contacts, ${base.evenements.length} événements, ${base.reservations.length} réservations`)
console.log([...statuts].map(([s, n]) => `${s} ${n}`).join(', '))
console.log('Écrits : src/data/seed.generated.json, supabase/migrations/001_schema.sql, supabase/seed.sql')
