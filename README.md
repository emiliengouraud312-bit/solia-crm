# CRM Solia

Le CRM interne de Solia, agence de voyages fictive du projet de groupe du Master MMRC (Bloc 3, relation client).
Il applique les 19 process relation client et la stratégie de lead scoring du groupe, avec des données fictives.

- Ce qu'on construit et comment : `CLAUDE.md`
- Cahier des charges : `docs/01-cahier-des-charges.md`
- Avancement (tableau de bord du projet) : `docs/04-plan.md`
- Décisions prises en cours de route : `docs/06-decisions.md`
- Documents du groupe : `docs/sources/`

## Commandes

```bash
npm install
npm run dev        # application en local, avec les données de démo
npm run test       # tests automatiques (Vitest)
npm run build      # build de production
npm run seed       # régénère les données de démo depuis data/
```

## Organisation du code

- `data/` : équipe, offres, planning, modèles de messages, règles de scoring (source unique)
- `src/domain/` : types, dates, scoring (fonctions pures et testées)
- `src/store/` : accès aux données (`DataStore`, `LocalStore`, plus tard `SupabaseStore`)
- `src/pages/`, `src/components/` : les écrans
- `assets/` : polices et éléments de marque Solia
