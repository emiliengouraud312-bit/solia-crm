# Mise en ligne avec Supabase : le guide pas à pas

Ce guide branche le CRM publié sur Vercel à une base de données partagée (Supabase). Ensuite, toute l'équipe se connecte avec son e-mail et son mot de passe, et voit les mêmes données depuis n'importe quel ordinateur.

Durée : 20 minutes environ. Tu n'as rien à installer : tout se fait dans le navigateur, sur trois sites (Supabase, GitHub et Vercel).

Sans ces réglages, le CRM continue de marcher en mode local : données de démo dans le navigateur, sans connexion.

---

## Partie A : créer le projet Supabase (5 minutes)

1. Va sur **supabase.com**, clique sur **Start your project** et connecte-toi avec ton compte GitHub (le plus simple).
2. Clique sur **New project** et remplis le formulaire :
   - **Organization** : ton organisation personnelle (plan **Free**, gratuit).
   - **Project name** : `solia-crm`.
   - **Database password** : clique sur **Generate a password**, puis note-le dans un endroit sûr. Le CRM n'en a pas besoin, mais Supabase peut te le redemander un jour.
   - **Region** : une région en Europe, de préférence **Paris** (sinon Francfort).
3. Clique sur **Create new project** et attends 1 à 2 minutes que le projet soit prêt.

## Partie B : créer les tables (2 minutes)

4. Dans le menu de gauche de Supabase, ouvre **SQL Editor**, puis clique sur **New query** (ou le bouton « + »).
5. Dans un autre onglet, ouvre le dépôt GitHub `solia-crm`, puis le fichier `supabase/migrations/001_schema.sql`. Clique sur le bouton **Copy raw file** (l'icône des deux feuilles, en haut à droite du fichier).
6. Reviens dans Supabase, colle le texte dans l'éditeur, puis clique sur **Run** en bas à droite.
   - Résultat attendu : **Success. No rows returned**.
   - Des lignes « NOTICE » peuvent s'afficher : c'est normal.
   - Tu peux relancer ce fichier autant de fois que tu veux : il n'efface rien.

Pas besoin de charger les données de démo : le CRM les installe tout seul à la première connexion. Autre solution, si tu préfères : coller le fichier `supabase/seed.sql` (1,6 Mo) dans l'éditeur SQL. Il remet toutes les données de démo d'origine.

## Partie C : fermer les inscriptions et créer les 6 comptes (8 minutes)

Toute personne connectée voit et modifie toutes les données (c'est voulu, l'équipe a le même accès). Il faut donc qu'il soit impossible de se créer un compte seul.

7. Dans le menu de gauche, ouvre **Authentication**, puis **Sign In / Providers**. Désactive **Allow new users to sign up**, puis clique sur **Save**.
   - Selon la version de Supabase, le réglage peut aussi s'appeler « Enable sign ups » et se trouver dans **Providers**, puis **Email**.
8. Ouvre **Authentication**, puis **Users**. Clique sur **Add user**, puis sur **Create new user**.
   - **Email** : `jezabel@solia.demo`.
   - **Password** : un mot de passe (voir le conseil plus bas).
   - Coche **Auto Confirm User**, sinon le compte attend un e-mail de confirmation qui n'arrivera jamais.
   - Clique sur **Create user**.
9. Recommence l'étape 8 pour les cinq autres comptes :
   - `lilou@solia.demo`
   - `solveig@solia.demo`
   - `florentine@solia.demo`
   - `emilien@solia.demo`
   - `jury@solia.demo`

**Conseil pour les mots de passe** : un mot de passe commun pour l'équipe, et un autre pour le jury, que tu lui transmets à part (par exemple dans le dossier de rendu). Ne les écris jamais dans GitHub.

**Si Supabase refuse une adresse en `@solia.demo`** : utilise ta propre adresse Gmail avec le prénom après un « + », par exemple `ton.adresse+jezabel@gmail.com`. Le CRM reconnaît le prénom placé après le « + ».

## Partie D : brancher Vercel sur Supabase (3 minutes)

10. Dans Supabase, clique sur le bouton **Connect** en haut de la page du projet. Il affiche deux valeurs à copier :
    - l'**URL du projet**, de la forme `https://abcdefgh.supabase.co` ;
    - la **clé publique**, qui commence par `sb_publishable_`. Sur un projet plus ancien, c'est la clé **anon public**, une longue suite de caractères qui commence par `eyJ`.

    À défaut, l'URL se trouve dans **Project Settings**, puis **Data API**, et la clé dans **Project Settings**, puis **API Keys**.

    **Ne copie jamais la clé secrète** (`sb_secret_` ou `service_role`) : elle ne doit pas être dans le CRM.
11. Va sur **vercel.com**, ouvre le projet `solia-crm`, puis **Settings** et **Environment Variables**. Ajoute deux variables, en cochant les trois environnements (Production, Preview, Development) :

    | Key | Value |
    | --- | --- |
    | `VITE_SUPABASE_URL` | l'URL du projet |
    | `VITE_SUPABASE_ANON_KEY` | la clé publique (`sb_publishable_...` ou `eyJ...`) |

    Clique sur **Save**.
12. Les variables ne sont prises en compte qu'au prochain déploiement. Ouvre l'onglet **Deployments**, clique sur les trois points du dernier déploiement, puis sur **Redeploy**. Attends qu'il passe au vert (1 à 2 minutes).

## Partie E : vérifier (2 minutes)

13. Ouvre l'adresse du CRM sur Vercel : l'écran **Connexion** de Solia s'affiche.
14. Connecte-toi en `jezabel@solia.demo`. À la toute première connexion, le CRM installe le jeu de démo (quelques secondes), puis le tableau de bord s'affiche avec « Bonjour Jezabel ».
15. Test de partage, avec un deuxième navigateur ou une fenêtre de navigation privée :
    1. Connecte-toi en `solveig@solia.demo`.
    2. Dans la fenêtre de Jezabel, clique sur **+1 jour**.
    3. Dans celle de Solveig, clique sur **Actualiser** : la date passe au 01/12/2026.
16. Clique sur **Revenir au 30/11/2026**.

Pour repartir de zéro à tout moment (avant une répétition ou avant le jury) : ouvre **Paramètres**, puis **Réinitialiser la démo**. Cela remet les données d'origine pour toute l'équipe.

---

## Si quelque chose ne marche pas

| Ce que tu vois | Ce qu'il faut faire |
| --- | --- |
| Pas d'écran de connexion, le CRM s'ouvre directement | Les variables Vercel manquent, ou le site n'a pas été redéployé : reprends les étapes 11 et 12. |
| « E-mail ou mot de passe incorrect » | Vérifie le compte dans **Authentication**, puis **Users**. Il doit être confirmé ; sinon, supprime-le et recrée-le avec **Auto Confirm User**. |
| « Compte non relié à l'équipe » | L'adresse du compte ne correspond à aucun membre. Utilise une adresse de la liste, ou ton Gmail avec « +prénom ». |
| « Impossible de charger les données » avec « does not exist » ou « permission denied » | Le schéma n'a pas été créé : refais les étapes 4 à 6. |
| Bandeau rose « Les dernières modifications n'ont pas pu être enregistrées » | Clique sur **Recharger les données**. Si cela revient, vérifie que le projet Supabase n'est pas en pause (voir ci-dessous). |
| Le site est très lent ou ne répond plus, après plusieurs jours sans utilisation | Sur le plan gratuit, Supabase met en pause un projet inactif depuis 7 jours. Ouvre le projet sur supabase.com et clique sur **Restore project**. |

**Avant la soutenance** : ouvre le CRM la veille pour réveiller le projet, puis clique sur **Réinitialiser la démo**.

## Pour info : comment c'est protégé

- Chaque table a la règle de sécurité « utilisateur connecté » (RLS) : sans connexion, l'API ne renvoie rien.
- Les inscriptions libres sont fermées à l'étape 7 : seuls les 6 comptes créés à la main peuvent se connecter.
- La clé publique peut être visible dans le site : c'est prévu par Supabase, elle ne donne accès à rien sans connexion.
- Tous les messages restent simulés : le CRM n'envoie aucun e-mail, SMS ou WhatsApp, même connecté à Supabase.
