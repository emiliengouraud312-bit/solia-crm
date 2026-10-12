# Plan de construction

> **Compte rendu de la dernière phase** (Claude Code le met à jour à la fin de chaque phase, en 3 lignes : ce qui marche, ce qu'Emilien doit tester, ce qui reste)
>
> **Phase 0 terminée (12/10/2026).** Ce qui marche : le squelette du CRM (barre latérale avec le logo, bandeau de la date de référence avec +1 jour, +7 jours et retour au 30/11/2026, choix de l'utilisateur), polices et couleurs Solia, stockage local des données, tests et build au vert.
> À tester par Emilien : `npm run dev`, changer la date dans le bandeau, recharger la page (la date est conservée), puis Paramètres, « Réinitialiser la démo ».
> Ce qui reste : brancher Vercel sur le dépôt (étapes données dans le compte rendu de session), puis la phase 1 (données de démo, scoring, écran Contacts).

Livraison visée le **22/11/2026**. Chaque phase se termine par un commit sur `main`, des tests verts et un build qui passe.

## Phase 0 · Socle (semaine du 12/10)
- [x] Projet Vite + React + TypeScript + Tailwind + React Router + Vitest
- [x] Polices (Redotic, LemonMilk depuis `assets/fonts/`, Poppins depuis Google Fonts) et couleurs de la charte dans la configuration Tailwind
- [x] Mise en page : barre latérale, logo, bandeau avec la date de référence
- [x] Interface `DataStore`, implémentation `LocalStore`
- [x] `vercel.json` (réécriture vers `index.html` pour le routage)
- [ ] Déploiement Vercel qui affiche la page d'accueil (Emilien branche Vercel)

## Phase 1 · Données et scoring (19 au 25/10)
- [ ] Types du domaine et chargement de `data/*.json`
- [ ] `scripts/generate-seed.ts` : personas fixes et population générée (`docs/03-donnees-fictives.md`)
- [ ] `src/domain/scoring.ts` : `computeConversion` et `computeEngagement`
- [ ] Tests : les 8 cas de recette et les tests de limites passent
- [ ] Écran Contacts (liste, filtres, scores et paliers)

## Phase 2 · Fiche contact et frise du PIN (26/10 au 01/11)
- [ ] Fiche contact : en-tête, jauges, détail du calcul
- [ ] Frise du parcours en 7 phases avec le PIN Solia animé
- [ ] Onglets Journal, Voyages, Consentements, Fiche de passation, Notes
- [ ] Actions rapides qui créent les événements et recalculent les scores
- [ ] Pipeline par statut avec contrôle des champs obligatoires

## Phase 3 · Planning et automatismes (02 au 08/11)
- [ ] Planning : calendrier et liste, fiches départ et activité, remplissage, liste d'attente
- [ ] `src/domain/automations.ts` : règles R01 à R61, idempotentes, testées
- [ ] Rendu des messages (`data/messages.json`) et journal des messages simulés
- [ ] Écran Tâches et bloc « Ma journée »
- [ ] Changement de date de référence : +1 jour, +7 jours, retour au 30/11/2026

## Phase 4 · Supabase et tableau de bord (09 au 15/11)
- [ ] `supabase/migrations/001_schema.sql` (tables, RLS « utilisateur connecté »), rejouable
- [ ] `supabase/seed.sql` généré par le script de seed
- [ ] `SupabaseStore` et connexion par e-mail et mot de passe
- [ ] Tableau de bord : chiffres clés, prochains départs, paliers, indicateurs des process
- [ ] Guide pas à pas pour Emilien dans `docs/07-mise-en-ligne.md` (créer le projet Supabase, coller les SQL, créer les 6 comptes, variables Vercel)

## Phase 5 · Bonus et recette (16 au 22/11)
- [ ] Réclamations (R62 à R64), avis (R65, R66), report et annulation avec barème (R67, R68)
- [ ] Réinitialiser la démo en un clic
- [ ] Recette complète (`docs/01-cahier-des-charges.md`, section 10) en ligne sur Vercel
- [ ] Relecture : aucun tiret long, aucune icône interdite, textes en français
- [ ] Scénario de démo de 5 minutes pour le jury dans `docs/08-scenario-demo.md`
