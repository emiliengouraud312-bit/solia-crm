# CLAUDE.md · CRM Solia

Ce fichier est lu au début de chaque session. Il dit ce qu'on construit, avec quoi, et comment travailler.

## Le projet en bref

Solia est une agence de voyages fictive (projet de groupe du Master MMRC, Bloc 3, relation client) qui crée du lien social : petits groupes, trois cibles (**seniors, parents solos, célibataires**), et un **abonnement** communautaire à 29 € par mois pour garder le lien après le voyage.

On construit **le CRM interne de Solia** : une application web publiée, connectée, qui applique réellement les 19 process relation client et la stratégie de lead scoring du groupe. Elle sert à une **démonstration devant le jury, avec des données fictives**.

- **Livraison visée : 22/11/2026.** Rendu au plus tard le 30/11/2026. Après le 22/11, on ne fait plus que des corrections.
- **Porteur du projet : Emilien** (DAF externalisé de Solia, pas développeur). Il valide, teste et tranche. Les explications qui lui sont destinées sont en français simple, sans jargon.
- **Tous les messages aux clients sont simulés.** Aucun e-mail, SMS ou WhatsApp n'est réellement envoyé : le CRM affiche le message rendu et le trace dans le journal du contact.

## Sources de vérité, par ordre de priorité

1. `docs/01-cahier-des-charges.md` : écrans, modèle de données, statuts, automatismes, indicateurs.
2. `docs/02-scoring.md` et `data/scoring-rules.json` : les deux scores, au point près.
3. `data/*.json` : équipe, offres, planning des départs et des activités, modèles de messages.
4. `docs/03-donnees-fictives.md` : le jeu de démonstration.
5. `docs/sources/` : les documents du groupe (process en PDF, stratégie de relation client, stratégie de lead scoring, grille Excel, charte). Ils priment sur ta propre interprétation, mais pas sur les décisions consignées dans `docs/06-decisions.md`.

Si deux sources se contredisent ou si un point n'est pas couvert : choisis l'option la plus simple qui respecte les process, note-la en une ligne dans `docs/06-decisions.md`, et continue. Ne t'arrête pas pour demander, sauf si la décision change le périmètre.

## Stack imposée

- **Vite + React + TypeScript** (strict), **Tailwind CSS**, React Router.
- **Supabase** : Postgres et authentification par e-mail et mot de passe. Toutes les tables sont accessibles en lecture et écriture à tout utilisateur connecté (RLS : `auth.role() = 'authenticated'`). Tout le monde a le même accès.
- **Hébergement : Vercel**, branché sur ce dépôt (branche `main`).
- **Tests : Vitest.** Le moteur de scoring et le moteur d'automatismes sont des fonctions pures, testées.

### Deux adaptateurs de données, obligatoires

L'environnement de Claude Code ne peut pas forcément joindre Supabase. Le code accède donc aux données via une interface `DataStore` avec deux implémentations :

- `LocalStore` : données de démo en mémoire, persistées dans `localStorage`. Utilisé en développement, dans les tests et comme repli si Supabase n'est pas configuré.
- `SupabaseStore` : utilisé quand `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont définies.

Le schéma SQL est livré dans `supabase/migrations/` et les données de démo dans `supabase/seed.sql`. Les deux sont **générés depuis les mêmes fichiers `data/` et le même script de seed** que `LocalStore`, pour que les deux modes affichent exactement les mêmes données. Emilien colle ces fichiers dans l'éditeur SQL de Supabase : rends-les idempotents et rejouables.

### La date de référence

Tout le CRM raisonne par rapport à une **date de référence** (paramètre `date_reference`, par défaut le **30/11/2026**, la date de démo). Le bandeau du haut l'affiche et permet de la changer, ou d'avancer de 1 ou 7 jours. Les scores, la dégressivité, les échéances, les tâches dues et les messages automatiques se recalculent à chaque changement. C'est ce qui permet de montrer au jury que les process tournent tout seuls.

## Charte graphique Solia

- **Couleurs** : rose `#E83C71` (accent, actions principales), bordeaux `#5A1A2E` (titres, fonds forts), orange `#FF8911` (repères, badges de délai, PIN si besoin d'un accent), beige `#FDF5F0` (fonds), blanc.
- **Typographies** : **Redotic** pour les grands titres d'écran, **LemonMilk** pour les sous-titres, libellés et badges (en capitales), **Poppins** (Google Fonts) pour tout le texte courant et les tableaux. Fichiers dans `assets/fonts/`.
- **Logo** : `assets/brand/logo-solia.svg`. **PIN Solia** : `assets/brand/pin-solia.svg`. Le PIN est l'élément qui avance sur la frise du parcours client.
- **Interdit** : aucune icône d'avion, de valise ou de mappemonde, nulle part (règle de la charte Solia).
- Ton de l'interface : chaleureux, clair et professionnel. C'est un outil de travail, pas une plaquette : de la densité lisible, pas de décoration gratuite.
- Responsive : utilisable sur un ordinateur portable de 13 pouces et lisible sur tablette. Le mobile n'est pas prioritaire.

## Règles d'écriture dans l'interface et les données

- Tout en **français**. Pas de tiret long (pas de « — » ni de « – ») : utilise une virgule, un deux-points ou des parenthèses.
- Messages clients au **vouvoiement**. Prénoms de l'équipe : Jezabel, Lilou, Solveig, Florentine, Emilien.
- **N'invente aucune règle métier** : elles sont dans les process. Les seules données inventées sont les contacts de démo, et elles sont générées par le script de seed.
- Dates au format `30/11/2026`, montants au format `1 490 €`.

## Méthode de travail

1. Suis `docs/04-plan.md` phase par phase. Coche les cases au fur et à mesure et garde le fichier à jour : c'est le tableau de bord d'Emilien.
2. Avant chaque commit : `npm run test` et `npm run build` passent. Pas de commit avec des tests rouges.
3. Messages de commit en français, courts, au présent (« Ajoute la frise du parcours »).
4. À la fin de chaque phase, écris en tête de `docs/04-plan.md` un compte rendu de 3 lignes : ce qui marche, ce qu'Emilien doit tester, ce qui reste.
5. Ne modifie jamais un poids ou une règle de scoring sans mettre à jour `data/scoring-rules.json`, `docs/02-scoring.md` et les tests ensemble.
6. Les cas de recette de `data/scoring-rules.json` (`cas_de_recette`) sont des tests automatiques. S'ils échouent, c'est le code qui a tort.
7. Préfère du code simple et lisible à des abstractions : Emilien doit pouvoir le présenter.

## Commandes

```bash
npm install
npm run dev        # application en local avec LocalStore
npm run test       # Vitest
npm run build      # build de production
npm run seed       # régénère src/data/seed.generated.json et supabase/seed.sql depuis data/
```
