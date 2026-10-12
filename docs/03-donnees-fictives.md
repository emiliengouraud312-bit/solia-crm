# Données de démonstration

Toutes les personnes sont **fictives**. Les données sont produites par un script déterministe (`scripts/generate-seed.ts`, générateur pseudo-aléatoire à graine fixe) à partir de `data/`. Le même script produit `src/data/seed.generated.json` (pour `LocalStore`) et `supabase/seed.sql` (pour Supabase) : relancé, il redonne exactement les mêmes données.

**Date de démo : 30/11/2026.** Tout le jeu est cohérent à cette date : rien n'est daté après, sauf ce qui est planifié (départs, activités, échéances).

## Volumes visés

| Population | Volume | Détail |
| --- | --- | --- |
| Voyageurs des 9 départs passés (septembre à novembre 2026) | 110 à 130 | Remplissage de 60 à 85 % selon le départ |
| Clients réservés sur les départs de décembre 2026 à août 2027 | 70 à 90 | Décembre 60 à 85 % ; janvier 35 à 60 % ; février 20 à 40 % ; mars et avril 5 à 20 % ; ensuite 0 à 10 % |
| Pipeline (Contact, Prospect, Devis envoyé, Perdu) | 45 à 55 | Environ 20 Contacts, 12 Prospects, 8 Devis envoyés, 10 Perdus |
| Abonnés | 30 à 40 | Environ 40 % des voyageurs revenus depuis plus de 15 jours ; 2 résiliations |

Répartition des paliers de conversion dans le pipeline, à la date de démo : environ 45 % Froid, 25 % Tiède, 20 % Chaud, 10 % Prêt à réserver.

## Profils générés

- **Seniors** : 62 à 79 ans, plutôt appel entrant, visite à l'agence ou stand ; peu de consentement WhatsApp (environ 40 %).
- **Parents solos** : 29 à 50 ans, plutôt site, réseaux sociaux et parrainage ; consentement WhatsApp fréquent (environ 80 %).
- **Célibataires** : 26 à 45 ans, plutôt QR code, réseaux sociaux et parrainage ; consentement WhatsApp fréquent (environ 85 %).
- Villes : Vendée et Loire-Atlantique (La Roche-sur-Yon, Les Sables-d'Olonne, Nantes, Challans, Montaigu, Luçon, Fontenay-le-Comte, Saint-Nazaire…).
- Coordonnées visiblement factices : e-mails en `@exemple.fr`, téléphones en `06 00 xx xx xx`.
- Chaque client a un journal d'événements cohérent avec son statut (découverte avant devis, devis avant réservation, acompte, solde, présences, enquête…), daté de manière réaliste.

## Situations à inclure pour la démo

- Voyageurs avec des notes de satisfaction réparties : environ 60 % de 9 ou 10, 30 % de 7 ou 8, 10 % de 6 ou moins. Environ un tiers des 9 et 10 ont publié un avis Google.
- **Le départ Paris Insolite de décembre est complet** (16 sur 16), avec 2 personnes en liste d'attente.
- Sur un départ de janvier, **un solde en retard** : mise en demeure envoyée (critère M3).
- 4 réclamations : 2 résolues sous 7 jours, 1 en cours, **1 ouverte depuis plus de 7 jours** (alerte).
- 1 avis Google à 3 étoiles avec réponse publique et réclamation associée.
- 2 annulations (une à plus de 60 jours, une entre 30 et 15 jours) et 1 report.
- 3 abonnés sans activité depuis plus de 30 jours, dont 1 depuis plus de 60 jours.
- 4 parrainages, dont 2 avec acompte du filleul encaissé (badge Ambassadeur).
- Le voyage Séjour Barcelonnais de novembre est rentré le 29/11 : ses voyageurs viennent de passer en Voyageur et l'invitation au Soli'apéro retour est due le 01/12.
- Des tâches en retard pour au moins deux membres de l'équipe, pour que le tableau de bord ait quelque chose à montrer.

## Personas fixes (cas de recette visibles dans l'interface)

Ces fiches sont écrites à la main dans le script, avec ces dates exactes.

**Marc Leroy, célibataire, 31 ans, Nantes.** Score attendu au 30/11 : **22, Froid**.
- 12/11 : fiche créée, origine Flyer QR code (C3), e-mail vérifié, consentements newsletter et WhatsApp.
- 16/11 et 27/11 : clic dans la newsletter vers une offre (C5).
- Pas d'envie de départ précise.

**Monique Bernard, senior, 68 ans, La Roche-sur-Yon.** Score attendu au 30/11 : **77, Prêt à réserver**. Statut Devis envoyé.
- 22/11 : appel entrant (C10), numéro vérifié, cible, envie : Lumières de Malte de janvier 2027 (P5). Pas de consentement newsletter ni WhatsApp.
- 25/11 : rendez-vous découverte accepté pour le 27/11 (C13).
- 27/11 : découverte réalisée (C14), dates confirmées (P6), budget de 1 600 € (P7), accord pour un devis (C15), devis de 1 490 € envoyé, valable jusqu'au 27/12.
- 30/11 : appel de relance J+3 abouti (C16), question sur le paiement en chèques-vacances (C17).
- Pendant la démo, on enregistre sa réservation : le départ étant à moins de 60 jours, **la totalité est exigible** (règle métier), le PIN passe en Achat et les tâches du process 05 apparaissent.

**Sarah Martin, parent solo, 38 ans, Challans.** Score attendu au 30/11 : **39, Tiède**.
- 20/11 : fiche créée, origine Parrainage avec le code de **Julie Petit** (C1), e-mail vérifié, consentements newsletter et WhatsApp, envie : Parenthèse à Lisbonne de mars 2027 (P5).
- 20/11 : DM Instagram avec une question sur le programme (C9).

**Julie Petit, parent solo, 41 ans, Montaigu.** Voyageuse Paris Insolite d'octobre, abonnée depuis le Soli'apéro retour, marraine de Sarah (filleule pas encore réservée).

**Jacqueline Morel, senior, 72 ans, Les Sables-d'Olonne.** Voyageuse Légendes d'Irlande de septembre : note à chaud 9, présente aux deux Soli'apéros, NPS 10, avis Google publié, abonnée, présente à une activité seniors en novembre. Pas de message dans le groupe WhatsApp. Elle illustre un client Fidèle.

**Thomas Garnier, célibataire, 32 ans, Nantes.** Voyageur Sunset à Hossegor d'octobre, abonné, a posté des stories : parrain d'un ami réservé sur Barcelone en décembre (acompte encaissé, badge Ambassadeur).

## Équipe

Les tâches et événements sont attribués selon `data/equipe.json` : Jezabel (seniors), Lilou (célibataires), Solveig (parents solos, demandes, découvertes et devis), Florentine (newsletter, avis), Emilien (soldes, mises en demeure, montants).
