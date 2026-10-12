// Génération des fichiers SQL de Supabase depuis la description des tables (schema.ts) et le jeu de démo.
// Les deux fichiers sont rejouables : Emilien peut les coller plusieurs fois dans l'éditeur SQL.
import type { Base, NomTable } from '../domain/types'
import { NOMS_TABLES, SCHEMA, TYPES_SQL } from './schema'

const POLITIQUE = 'Équipe connectée : lecture et écriture'

export function schemaSql(): string {
  const lignes: string[] = [
    '-- Schéma du CRM Solia. Généré par `npm run seed` depuis src/store/schema.ts : ne pas modifier à la main.',
    '-- Rejouable : à coller dans l\'éditeur SQL de Supabase (SQL Editor), puis « Run ». Aucune donnée n\'est effacée.',
    '-- Sécurité (RLS) : toute personne connectée lit et écrit toutes les tables ; sans connexion, rien n\'est accessible.',
    '',
  ]
  for (const table of NOMS_TABLES) {
    const { colonnes, index = [], uniques = [] } = SCHEMA[table]
    lignes.push(`-- ${table}`)
    lignes.push(`create table if not exists public.${table} (id text primary key);`)
    for (const [colonne, type] of Object.entries(colonnes)) {
      lignes.push(`alter table public.${table} add column if not exists ${colonne} ${TYPES_SQL[type]};`)
    }
    lignes.push(`alter table public.${table} add column if not exists created_at timestamptz not null default now();`)
    lignes.push(`alter table public.${table} add column if not exists updated_at timestamptz not null default now();`)
    for (const colonne of uniques) lignes.push(`create unique index if not exists ${table}_${colonne}_unique on public.${table} (${colonne});`)
    for (const colonne of index) lignes.push(`create index if not exists ${table}_${colonne}_index on public.${table} (${colonne});`)
    lignes.push(`alter table public.${table} enable row level security;`)
    lignes.push(`drop policy if exists "${POLITIQUE}" on public.${table};`)
    lignes.push(
      `create policy "${POLITIQUE}" on public.${table} for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');`,
    )
    lignes.push(`grant select, insert, update, delete on public.${table} to authenticated;`)
    lignes.push('')
  }
  return lignes.join('\n')
}

/** Valeur SQL d'un champ : texte entre apostrophes (doublées), JSON, nombre, booléen ou null. */
export function valeurSql(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return 'null'
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? String(valeur) : 'null'
  if (typeof valeur === 'boolean') return valeur ? 'true' : 'false'
  const texte = typeof valeur === 'string' ? valeur : JSON.stringify(valeur)
  return `'${texte.replace(/'/g, "''")}'`
}

/** Colonnes écrites pour une table (sans created_at ni updated_at, laissées à la base). */
export function colonnesDe(table: NomTable): string[] {
  return ['id', ...Object.keys(SCHEMA[table].colonnes)]
}

export function seedSql(base: Base, parLot = 400): string {
  const lignes: string[] = [
    '-- Jeu de démonstration du CRM Solia au 30/11/2026. Généré par `npm run seed` : ne pas modifier à la main.',
    '-- Les mêmes données que le mode local (src/data/seed.generated.json). Toutes les personnes sont fictives.',
    '-- Rejouable : remplace toutes les données par le jeu de démo d\'origine. À coller après 001_schema.sql.',
    '',
    'begin;',
    `truncate table ${NOMS_TABLES.map((t) => `public.${t}`).join(', ')};`,
    '',
  ]
  for (const table of NOMS_TABLES) {
    const colonnes = colonnesDe(table)
    const rangs = (base[table] as unknown as Record<string, unknown>[]).map((ligne) => `(${colonnes.map((c) => valeurSql(ligne[c])).join(', ')})`)
    for (let i = 0; i < rangs.length; i += parLot) {
      lignes.push(`insert into public.${table} (${colonnes.join(', ')}) values`)
      lignes.push(rangs.slice(i, i + parLot).join(',\n') + ';')
    }
    lignes.push('')
  }
  lignes.push('commit;', '')
  return lignes.join('\n')
}
