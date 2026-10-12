# CRM Solia

Le CRM interne de Solia, agence de voyages fictive du projet de groupe du Master MMRC (Bloc 3, relation client).
Il applique les 19 process relation client et la stratégie de lead scoring du groupe, avec des données fictives.

- Ce qu'on construit et comment : `CLAUDE.md`
- Cahier des charges : `docs/01-cahier-des-charges.md`
- Avancement (tableau de bord du projet) : `docs/04-plan.md`
- Décisions prises en cours de route : `docs/06-decisions.md`
- Mise en ligne avec Supabase, pas à pas : `docs/07-mise-en-ligne.md`
- Documents du groupe : `docs/sources/`

## Deux modes

- **Sans variables d'environnement** : données de démo dans le navigateur, on choisit l'utilisateur dans le bandeau.
- **Avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`** : connexion par e-mail et mot de passe, données partagées par toute l'équipe.

## Commandes

```bash
npm install
npm run dev        # application en local, avec les données de démo
npm run test       # tests automatiques (Vitest)
npm run build      # build de production
npm run seed       # régénère les données de démo et les fichiers SQL de Supabase depuis data/
```

## Organisation du code

- `data/` : équipe, offres, planning, modèles de messages, règles de scoring (source unique)
- `src/domain/` : types, dates, scoring, moteur d'automatismes, indicateurs (fonctions pures et testées)
- `src/store/` : accès aux données (`DataStore`, `LocalStore` dans le navigateur, `SupabaseStore` partagé) et description des tables (`schema.ts`)
- `supabase/` : schéma SQL rejouable et jeu de démo SQL, générés par `npm run seed`
- `src/pages/`, `src/components/` : les écrans
- `assets/` : polices et éléments de marque Solia
