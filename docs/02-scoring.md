# Scoring · règles de calcul

Les poids sont dans `data/scoring-rules.json` (version validée par le groupe le 12/10/2026 : C6 et C18 retirés, C1 à 11, C4 à 4, C5 à 3, C7 à 3, C15 à 8). Ce document décrit **comment calculer**. Le code lit les poids dans le JSON, il ne les recopie pas en dur.

Deux fonctions pures, dans `src/domain/scoring.ts` :

```ts
computeConversion(contact, events, planning, reservations, dateReference): ScoreResult
computeEngagement(contact, events, reservations, participations, enquetes, abonnements, parrainages, planning, dateReference): ScoreResult

type ScoreResult = {
  score: number            // entier de 0 à 100
  palier: string           // Froid, Tiède, Chaud, Prêt à réserver | Distant, Engagé, Fidèle, Ambassadeur
  lignes: LigneDetail[]    // une ligne par critère pris en compte : code, libellé, points bruts, coefficient, points retenus, date, preuve (id d'événement)
  plafonds: { bloc: string; brut: number; retenu: number }[]
}
```

Le détail (`lignes` et `plafonds`) alimente l'écran « détail du calcul » de la fiche : rien n'est affiché que le calcul n'utilise pas.

## Règle de preuve

Un critère ne compte que s'il existe une donnée datée qui le prouve (événement du journal, champ de réservation, participation, réponse d'enquête). Seuls les événements dont la date est **inférieure ou égale à la date de référence** comptent.

## Score de conversion

1. **Profil (P1 à P7)** : 1 si le critère est vrai à la date de référence, sinon 0. Somme plafonnée à **30**.
   - P1 : cible renseignée.
   - P2 : coordonnée vérifiée (événement `coordonnee_verifiee`) et pas d'événement N3 actif.
   - P3, P4 : dernier état du consentement correspondant à vrai.
   - P5 : `envie_depart_id` renseigné et ce départ existe dans le planning.
   - P6 : contraintes de dates confirmées (événement `dates_confirmees`) **et** le départ visé est ouvert (date de départ après la date de référence et places restantes supérieures à 0), ou un autre départ de la même cible compatible avec les disponibilités.
   - P7 : budget confirmé en découverte supérieur ou égal au prix du départ visé.
2. **Origine (C1 à C3)** : un seul critère compte, le plus fort. **Pas de dégressivité.**
3. **Digital (C4, C5, C7, C8)** : chaque occurrence compte jusqu'au maximum du critère, multipliée par le coefficient de dégressivité de son âge. Somme plafonnée à **12**.
4. **Intention (C9 à C20)** : même calcul, sans plafond propre.
5. **Comportement** = origine + digital plafonné + intention, plafonné à **70**.
6. **Négatifs (N1 à N6)** : chaque événement négatif actif (non levé) retire ses points. N3 retire aussi P2.
7. **Score** = arrondi(profil + comportement + négatifs), borné entre 0 et 100.

**Dégressivité** (âge = date de référence moins date de l'événement, en jours) : 0 à 30 jours, 100 % ; 31 à 60 jours, 50 % ; 61 à 90 jours, 25 % ; plus de 90 jours, 0 %.

**Clôtures** : statut Perdu, le comportement repart à 0 à partir de la date de perte (les événements antérieurs ne comptent plus), le profil reste. Statut Réservé, le score est calculé une dernière fois à la date de la réservation et stocké comme « score à la réservation ».

### Correspondance entre actions et critères

| Action dans le CRM | Événement | Critère |
| --- | --- | --- |
| Fiche créée avec origine « Parrainage » et code valide | `origine` | C1 |
| Origine Stand, Agence, Partenaire | `origine` | C2 |
| Origine Flyer QR code ou Site | `origine` | C3 |
| Clic sur le lien tracké du message de bienvenue | `clic_bienvenue` | C4 |
| Clic sur un lien tracké de la newsletter | `clic_newsletter` | C5 |
| Commentaire ou DM sans question précise | `interaction_sociale` | C7 |
| Programme téléchargé | `telechargement_programme` | C8 |
| Demande écrite avec une question sur un voyage | `demande_ecrite` | C9 |
| Appel entrant | `appel_entrant` | C10 |
| Visite à l'agence | `visite_agence` | C11 |
| Réponse à une relance | `reponse_relance` | C12 |
| Rendez-vous découverte accepté | `rdv_accepte` | C13 |
| Rendez-vous découverte réalisé | `rdv_realise` | C14 |
| Accord pour un devis | `accord_devis` | C15 |
| Appel de relance J+3 abouti | `relance_devis_aboutie` | C16 |
| Question sur les modalités | `question_modalites` | C17 |
| Présence à un événement ouvert à tous | participation | C19 |
| Inscription en liste d'attente | `liste_attente` | C20 |
| Désinscription newsletter, retrait WhatsApp | consentement à faux | N1, N2 |
| Rebond d'e-mail ou numéro invalide | `coordonnee_invalide` | N3 |
| Rendez-vous non honoré | `rdv_non_honore` | N4 |
| Devis expiré (automatique, règle R13) | `devis_expire` | N5 |
| Refus explicite | `refus` | N6 |

Les événements sans critère (appel sortant, note interne, message envoyé) apparaissent dans le journal et sur la frise avec 0 point.

## Score d'engagement

Il se calcule pour la réservation en cours (ou la dernière), à partir de la date de réservation.

1. Pour chaque critère E1 à E15 : **atteignable** si sa date d'atteignabilité (colonne `atteignable_des` du JSON) est passée à la date de référence ; **obtenu** selon la donnée qui le prouve.
   - E5 et E9 : 9 ou 10, points pleins ; 7 ou 8, moitié ; 6 ou moins, 0.
   - E12 : au moins une participation présente dans les 30 jours avant la date de référence.
   - E13 : au moins 3 participations présentes dans les 90 jours avant la date de référence.
   - E14 : 5 points par filleul dont l'acompte est encaissé, 10 au maximum.
   - E15 : nouvelle réservation dans les 12 mois après le retour.
2. Par bloc, les points **obtenus** et les points **atteignables** sont plafonnés : avant 20, pendant 20, après 25, fidélité 35.
3. **Négatifs (M1 à M5)** actifs : retranchés des points obtenus.
4. **Score** = arrondi((obtenus plafonnés + négatifs) ÷ atteignables plafonnés × 100), borné entre 0 et 100. Si rien n'est encore atteignable, afficher « En attente » au lieu d'un score.

**Clôtures** : annulation, le score est figé à la date d'annulation ; résiliation, le score est figé et le statut passe à Ancien abonné.

## Cas de recette (tests obligatoires)

Ils sont dans `data/scoring-rules.json`, clé `cas_de_recette`. Pour chacun, construire les événements dans le test et vérifier score et palier.

| Cas | Score attendu | Palier |
| --- | --- | --- |
| Marc, célibataire, flyer (QR code, cible, e-mail valide, 2 consentements, 2 clics newsletter récents) | 22 | Froid |
| Monique, senior, jour 0 (appel entrant, cible, numéro vérifié, envie précise) | 28 | Tiède |
| Monique, jour 5 (+ découverte acceptée et réalisée, dates et budget confirmés, accord devis) | 66 | Chaud |
| Monique, jour 8 (+ relance J+3 aboutie, question sur les chèques-vacances) | 77 | Prêt à réserver |
| Sarah, parent solo, parrainée (profil sans dates ni budget, demande écrite récente) | 39 | Tiède |
| Sarah, 45 jours plus tard sans action | 34 | Tiède |
| Jacqueline, senior, abonnée active, tout atteignable, sans message dans le groupe ni 3 participations ni filleul ni réachat | 81 | Fidèle |
| Jacqueline, 60 jours sans activité | 61 | Engagé |

Ajouter aussi des tests de limites : plafond digital à 12, plafond comportement à 70, score jamais négatif, un seul critère d'origine, dégressivité aux bornes 30, 31, 60, 61, 90 et 91 jours.
