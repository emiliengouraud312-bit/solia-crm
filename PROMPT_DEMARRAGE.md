# Prompts à coller dans Claude Code

## Première session (phase 0 et phase 1)

```text
Tu démarres le CRM de Solia. Lis d'abord CLAUDE.md, puis tous les fichiers de docs/ et de data/, puis les documents de docs/sources/ (le PDF des process en entier).

Ensuite :
1. Résume-moi en 10 lignes ce que tu as compris du projet, et liste les points du cahier des charges qui te semblent flous ou contradictoires, avec la décision que tu proposes pour chacun. Note ces décisions dans docs/06-decisions.md.
2. Réalise la phase 0 puis la phase 1 de docs/04-plan.md, dans l'ordre, en cochant les cases au fur et à mesure.
3. Les 8 cas de recette de data/scoring-rules.json doivent passer en test automatique avant de passer à l'écran Contacts.
4. Commit sur main à la fin de chaque phase, tests et build au vert, puis mets à jour le compte rendu en tête de docs/04-plan.md.

Je ne suis pas développeur : quand tu as besoin de moi (compte à créer, fichier à fournir, réglage à faire sur un site), donne-moi des étapes numérotées, très concrètes, en français.
```

## Sessions suivantes

```text
Relis CLAUDE.md et docs/04-plan.md. Fais la phase suivante non terminée, en cochant les cases. Tests et build au vert, commit sur main, puis compte rendu en tête de docs/04-plan.md et dis-moi précisément quoi tester.
```

## Pour corriger quelque chose

```text
Sur [écran], quand je [action], j'obtiens [résultat] alors que j'attends [résultat attendu]. Corrige, ajoute un test qui reproduit le problème, et note la décision dans docs/06-decisions.md si une règle métier est concernée.
```
