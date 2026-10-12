# Cahier des charges · CRM Solia

Version du 12/10/2026. Construit à partir des 19 process relation client de Solia (`docs/sources/Process_Solia.pdf`), de la stratégie de lead scoring et de la stratégie de relation client du groupe.

## 1. Objectif et périmètre

Le CRM est le carnet de bord commun de l'équipe Solia (process 19). Il doit montrer au jury, en démonstration, trois choses :

1. **Le parcours client est suivi de bout en bout**, de la première rencontre au parrainage, avec le PIN Solia qui avance sur une frise.
2. **Les process tournent tout seuls** : chaque étape crée les bonnes tâches, au bon moment, pour la bonne personne, et les messages automatiques partent (en simulation).
3. **Le lead scoring est réel et vérifiable** : chaque point a une preuve dans le journal, et les cas de recette donnent le score attendu.

| Priorité | Contenu |
| --- | --- |
| **Indispensable** | Connexion, tableau de bord, liste des contacts, pipeline, fiche contact avec frise et PIN, les deux scores, planning des départs et des activités, tâches générées par les process 01 à 15, bibliothèque de messages simulés, date de référence, données de démo |
| **Si le temps le permet** | Écran réclamations (process 16), avis et e-réputation (process 17), report et annulation avec calcul du barème (process 18), réinitialisation de la démo en un clic, export CSV |
| **Hors périmètre** | Envoi réel de messages, paiement en ligne, portail client, application mobile, gestion fine des droits |

## 2. Utilisateurs

Six comptes, **tous avec le même accès complet** (`data/equipe.json`) :

| Compte | Rôle dans les process |
| --- | --- |
| Jezabel | Animatrice, référente des **seniors** |
| Lilou | Animatrice, référente des **célibataires** |
| Solveig | Animatrice et commerciale à mi-temps, référente des **parents solos**, traite toutes les demandes entrantes, découvertes et devis (process 02 à 04) |
| Florentine | Communication : réseaux, newsletter, avis, e-réputation (process 01, 12, 13, 14, 15, 17) |
| Emilien | DAF externalisé : encaissement des soldes, mises en demeure, validation des gestes et des montants d'annulation, indicateurs (process 06, 16, 18, 19) |
| Jury | Compte de démonstration |

Les rôles servent uniquement à **attribuer les tâches**. Tout le monde voit et modifie tout. La référente d'un contact est attribuée automatiquement selon sa cible.

## 3. Écrans

Navigation latérale, logo Solia en haut, bandeau supérieur avec la **date de référence** (boutons « +1 jour », « +7 jours », sélecteur de date, « Revenir au 30/11/2026 ») et l'utilisateur connecté.

### 3.1 Tableau de bord
- Ligne de chiffres clés : contacts actifs, prospects chauds et prêts à réserver, réservations du mois, taux de remplissage des 3 prochains départs, abonnés actifs, tâches en retard.
- **Ma journée** : les tâches dues aujourd'hui pour l'utilisateur connecté, puis celles en retard.
- Prochains départs (3) avec jauge de remplissage, date du Soli'apéro brise-glace et soldes en attente.
- Répartition des contacts par palier de conversion, et des clients par palier d'engagement.
- Indicateurs des process (section 9), avec pour chacun sa valeur, sa définition au survol et le process d'origine.

### 3.2 Contacts
Tableau filtrable et triable : nom, cible, statut, référente, score de conversion ou d'engagement avec son palier (pastille de couleur), dernière action, prochaine tâche. Filtres : cible, statut, palier, référente, origine. Recherche par nom. Bouton « Nouveau contact ».

### 3.3 Pipeline
Colonnes par statut (section 5), cartes déplaçables. Chaque carte : prénom et nom, cible, score et palier, offre visée, jours depuis la dernière action. Déplacer une carte crée l'événement correspondant et demande les champs obligatoires du nouveau statut (process 19 : statuts et champs obligatoires contrôlés à la saisie).

### 3.4 Fiche contact (écran central de la démo)
- **En-tête** : identité, cible, référente, statut, origine (avec le parrain s'il y en a un), badge **Ambassadeur** s'il a parrainé quelqu'un.
- **Les deux jauges** : score de conversion (ou « score à la réservation » figé si le contact a réservé) et score d'engagement, chacune avec son palier. Un clic ouvre le **détail du calcul** : chaque critère, ses points, sa date, sa dégressivité, ses plafonds. C'est la preuve demandée par le jury.
- **La frise du parcours avec le PIN** (section 4).
- **Actions rapides**, qui créent chacune un événement daté et recalculent les scores : enregistrer un appel entrant, une visite à l'agence, une demande écrite, un rendez-vous découverte (accepté, réalisé, non honoré), un devis, une réservation (acompte), un solde, une présence à un Soli'apéro, une note de satisfaction, une souscription, un refus, etc.
- **Onglets** : Journal (tous les événements, du plus récent au plus ancien, avec canal, process, auteur et points), Tâches, Voyages (réservations et devis), Messages (messages simulés envoyés), Consentements, Fiche de passation, Notes.

### 3.5 Planning interne (visible uniquement par l'équipe)
Le planning est la source de données de tous les automatismes (dernière page des process).
- **Vue calendrier** (mois) et **vue liste** : départs (couleur de la cible) et activités hebdomadaires.
- **Fiche départ** : offre, dates, prix, places max, réservées, restantes, liste d'attente, dates du Soli'apéro brise-glace et du Soli'apéro retour, échéance du solde, animatrice, liste des voyageurs avec statut du solde, présence au brise-glace et binôme de chambre.
- **Fiche activité** : date, heure, cible, lieu, capacité, ouverte à tous ou réservée aux abonnés, inscrits et présents.

### 3.6 Tâches
Liste filtrable (à moi, à toute l'équipe, en retard, aujourd'hui, cette semaine, par process). Chaque tâche : titre, contact, process et étape, échéance, responsable, modèle de message éventuel. Bouton « Fait » ; si un modèle est associé, le message rendu s'affiche avant validation (« Envoyer, simulation ») et rejoint le journal.

### 3.7 Messages
Bibliothèque des 41 modèles (`data/messages.json`), groupés par process, avec aperçu rendu sur un contact choisi.

### 3.8 Paramètres
Date de référence, liste de l'équipe, réinitialisation des données de démo.

### 3.9 Réclamations et avis (si le temps le permet)
Liste des réclamations (statut, motif, gravité, délai, geste) et des avis (note, plateforme, réponse, délai de réponse), reliés aux fiches contacts.

## 4. La frise du parcours et le PIN Solia

La frise est la signature visuelle du CRM. Elle reprend les 7 phases du parcours client et place le **PIN Solia** (`assets/brand/pin-solia.svg`) sur l'étape où se trouve le contact à la date de référence.

| Phase | Points du parcours | Jalons affichés | Process |
| --- | --- | --- | --- |
| Curiosité | 1 à 14 | Contact capté, Bienvenue envoyée | 01 |
| Considération | 15 à 29 | Demande, Réponse personnelle, Découverte, Devis envoyé, Relance du devis | 02, 03, 04 |
| Achat | 30 à 32 | Réservé, Confirmation, Appel de bienvenue | 04, 05 |
| Avant | 33 à 38 | Groupe WhatsApp, Solde réglé, Soli'apéro brise-glace | 06, 07 |
| Pendant | 39 à 45 | Départ, Point mi-séjour, Satisfaction à chaud | 08 |
| Après | 46 à 55 | Retour, Soli'apéro retour, Enquête, Avis | 09 à 12 |
| Loyauté | 56 à 70 | Abonné, Activités, Parrainage, Nouveau voyage | 13 à 15 |

Règles d'affichage :
- Jalon atteint : pastille pleine rose. Jalon à venir : contour gris. **Le PIN se pose sur le jalon le plus avancé atteint** et porte une infobulle « Étape actuelle : … depuis le … ».
- Sous la frise, chaque événement du journal est une petite pastille datée, avec son gain ou sa perte de points (« +15 appel entrant »). Survol : détail et preuve.
- Contact en statut **Perdu** : PIN grisé sur la dernière étape atteinte, mention du motif. **Ancien abonné** : PIN sur Loyauté, grisé.
- Un client qui repart (nouvelle réservation) : la frise affiche le voyage en cours, avec un sélecteur pour revoir les voyages précédents.
- Le PIN se déplace avec une courte animation quand une action le fait avancer : c'est le moment fort de la démo.

## 5. Statuts et transitions

Statuts du contact (process 19) : **Contact, Prospect, Devis envoyé, Réservé, Soldé, Voyageur, Abonné, Ancien abonné, Perdu.**

| Vers | Déclenché par | Champs obligatoires |
| --- | --- | --- |
| Contact | Création de la fiche (process 01) | Identité, cible, origine, canal préféré, consentements newsletter et WhatsApp |
| Prospect | Demande entrante (formulaire, WhatsApp, DM, appel) ou visite (process 02, 03) | Date et heure de la demande, canal, voyage concerné |
| Devis envoyé | Envoi du devis (process 03) | Offre, départ, montant, date de fin de validité (envoi + 30 jours) |
| Réservé | Acompte encaissé (process 04) | Date et montant de l'acompte, moyen de paiement, solde dû, échéance |
| Soldé | Solde encaissé (process 06) | Date et montant du solde |
| Voyageur | Jour du retour (process 09), automatique | Date du retour |
| Abonné | Souscription (process 11) | Date de souscription, formule, canal de cible |
| Ancien abonné | Résiliation (process 13) | Motif de résiliation |
| Perdu | J+14 sans réponse (process 02) ou devis expiré (process 04) ou refus | Motif de perte |

- Un Voyageur ou un Abonné qui réserve un nouveau voyage repasse en **Réservé** pour ce voyage ; son abonnement reste actif (indicateur séparé sur la fiche).
- Un contact Perdu redevient Prospect s'il refait une demande.
- Le score de conversion se calcule pour Contact, Prospect, Devis envoyé et Perdu. Au passage en Réservé, il est **figé** et archivé comme « score à la réservation ». Le score d'engagement démarre à Réservé.

## 6. Modèle de données

Noms de tables en snake_case français. Toutes les tables ont `id` (uuid), `created_at`, `updated_at`.

| Table | Champs principaux |
| --- | --- |
| `equipe` | prenom, fonction, cible_referente, email |
| `offres` | nom, cible, destination, jours, nuits, prix_ttc, places_max, transport, hebergement |
| `departs` | offre_id, cible, date_depart, date_retour, prix_ttc, places_max, soliapero_brise_glace, soliapero_retour, echeance_solde, animatrice_id |
| `activites` | date, heure, cible, titre, lieu, capacite, ouverte_a_tous, animatrice_id |
| `contacts` | prenom, nom, email, telephone, date_naissance, ville, cible, origine, origine_detail, parrain_id, code_parrain (unique, généré), canal_prefere, statut, referente_id, envie_depart_id, dispo_debut, dispo_fin, budget, compte_social, craintes, contraintes, notes, motif_perte, ambassadeur |
| `consentements` | contact_id, type (newsletter, whatsapp, droit_image), valeur, date |
| `evenements` | contact_id, date (horodatage), type, code_critere (P1 à E15, N1 à M5 ou vide), canal, process, auteur_id (vide si automatique), details (json), simule |
| `taches` | contact_id, depart_id, activite_id, regle_id, cle_unicite, titre, process, echeance, responsable_id, statut (à faire, fait, annulée), message_code, fait_le, fait_par |
| `messages_envoyes` | contact_id, message_code, canal, date, objet_rendu, corps_rendu, simule (toujours vrai) |
| `devis` | contact_id, depart_id, montant, date_envoi, date_fin_validite, statut |
| `reservations` | contact_id, depart_id, date_reservation, acompte_montant, acompte_date, moyen_paiement, solde_montant, solde_echeance, solde_date, mise_en_demeure_date, appel_bienvenue_date, tentatives_appel, ajoute_groupe_whatsapp, message_groupe_poste, present_brise_glace, binome, opposition_image, note_chaud, incident_non_resolu, partage_groupe, present_retour, album_remis, statut (réservée, soldée, annulée, reportée, voyagée), report_utilise |
| `fiches_passation` | reservation_id, attentes, craintes, contraintes, details_personnels, remplie_le |
| `liste_attente` | depart_id, contact_id, date |
| `abonnements` | contact_id, formule (29 € par mois), date_debut, date_fin, motif_resiliation, decision (abonné, en réflexion, refus), motif_refus |
| `participations` | activite_id, contact_id, inscrit, present |
| `enquetes` | contact_id, reservation_id, type (voyage, abonnement), nps, notes_par_temps (json), commentaire, date, avis_google_publie |
| `parrainages` | parrain_id, filleul_id, recompense, date_recompense |
| `reclamations` | contact_id, reservation_id, motif, gravite, statut, date_ouverture, date_resolution, geste, geste_valide_par |
| `avis` | contact_id, plateforme, note, texte, date, reponse, date_reponse |
| `parametres` | date_reference |

Le **journal d'événements est la source du scoring** : aucun score n'est stocké à la main. Il est recalculé à partir des événements, des réservations, des participations et du planning.

## 7. Le moteur d'automatismes

### Principe
Une fonction pure `runAutomations(data, dateReference)` parcourt les règles ci-dessous et renvoie les tâches à créer, les tâches à annuler, les messages automatiques à tracer et les changements de statut automatiques. Chaque élément a une **clé d'unicité** (`regle + entité + occurrence`) : relancer le moteur ne crée jamais de doublon. Le moteur tourne au chargement de l'application et à chaque changement de date de référence.

- **Envoi automatique simulé** : à la date due, le message est rendu et tracé dans `messages_envoyes` et dans le journal, sans action humaine.
- **Envoi manuel** : une tâche est créée pour le responsable ; le message rendu s'affiche quand il coche « Fait ».
- Les délais en **jours ouvrés** (réponse sous 24 h du process 02) excluent samedi et dimanche.

### Règles

| Règle | Process | Déclencheur | Action | Échéance | Responsable | Message | Annulée si |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | 01 | Fiche créée | Message de bienvenue (auto) | J+2 | Référente | M01 | |
| R02 | 01 | Consentement newsletter | Inscription à la newsletter (auto, journal) | J+2 | Florentine | | |
| R03 | 01 | Nouveau départ correspondant aux envies d'un Contact | Invitation personnelle | Ouverture du départ | Référente | M02 | Contact devenu Prospect |
| R04 | 02 | Formulaire reçu | Accusé de réception (auto) | Immédiat | | M03 | |
| R05 | 02 | Demande entrante | Répondre personnellement et proposer un rendez-vous | 24 h ouvrées | Solveig | | Réponse tracée |
| R06 | 02 | Réponse envoyée, pas de retour | Première relance | J+3 | Solveig | M04 | Le prospect répond |
| R07 | 02 | Toujours pas de retour | Deuxième relance avec un élément concret | J+7 | Solveig | M05 | Le prospect répond |
| R08 | 02 | Toujours pas de retour | Passage en Perdu (auto), reste en newsletter si consentement | J+14 | | | Le prospect répond |
| R09 | 03 | Rendez-vous découverte accepté | Mener la découverte (20 à 30 min) | Date du rendez-vous | Solveig | | |
| R10 | 03 | Découverte réalisée et accord pour un devis | Envoyer le devis personnalisé | Sous 24 h | Solveig | M06 | |
| R11 | 04 | Devis envoyé | Appeler le prospect (jamais un simple e-mail) | J+3 | Solveig | | Réservation |
| R12 | 04 | Devis sans réponse | Relance places restantes (auto), **uniquement si places restantes inférieures ou égales à 5** | J+7 | | M07 | Réservation |
| R13 | 04 | Devis expiré | Dernier message avec une autre date (auto), statut Perdu, critère N5 | J+30 | | M08 | Réservation |
| R14 | 04 | Demande sur un départ complet | Proposer la liste d'attente ou un autre départ | Immédiat | Solveig | M09 | |
| R15 | 05 | Statut Réservé | Mail de confirmation (auto) | Jour même | | M10 | |
| R16 | 05 | Statut Réservé | Remplir la fiche de passation | Jour même | Solveig | | |
| R17 | 05 | Fiche de passation remplie | Appel de bienvenue (10 à 15 min) | Sous 48 h | Référente | | |
| R18 | 05 | Deux tentatives d'appel sans réponse | SMS de présentation | Après la 2e tentative | Référente | M11 | |
| R19 | 05 | Appel de bienvenue réalisé | Ajouter au groupe WhatsApp du voyage et présenter | J+1 | Référente | M12 | |
| R20 | 06 | Réservation | Rappel du solde et programme détaillé (auto, désactivable sur la fiche) | J-70 | | M13 | Soldé |
| R21 | 06 | Réservation | Encaisser le solde de 70 % | J-60 | Emilien | | Soldé |
| R22 | 06 | Solde non réglé | Mise en demeure sur support durable, critère M3 | J-57 | Emilien | M14 | Soldé |
| R23 | 06 | Solde toujours non réglé 7 jours après la mise en demeure | Alerte : contrat résolu, appliquer le barème d'annulation | J-50 | Emilien | | Soldé |
| R24 | 06 | Client marqué « hésite sur ses dates » | Appeler avant la fin du report gratuit | J-31 | Référente | | |
| R25 | 07 | Départ confirmé | Invitation au Soli'apéro brise-glace (auto) | J-21 | | M15 | |
| R26 | 07 | Pas de confirmation de présence | Relance personnelle | J-18 | Référente | M16 | Présence confirmée |
| R27 | 07 | Départ | Préparer la soirée (badges, jeu, carnets, goodies) | J-16 | Référente | | |
| R28 | 07 | Départ | Animer le Soli'apéro et saisir présences, binômes, oppositions au droit à l'image | J-15 | Référente | | |
| R29 | 07 | Soli'apéro passé | Poster la photo de groupe : « La tribu est née ! » | J-14 | Référente | M17 | |
| R30 | 07 | Absent au Soli'apéro | Rappeler le client | J-4 | Référente | | |
| R31 | 07 | Départ | Compte à rebours (auto) et appel des clients ayant exprimé une crainte | J-3 | Référente | M18 | |
| R32 | 07 | Départ | Message de veille de départ (auto) | J-1 | | M19 | |
| R33 | 08 | Mi-séjour | Point individuel de 5 minutes avec chaque voyageur | Milieu du séjour | Animatrice | | |
| R34 | 08 | Dernier jour du séjour | Saisir la satisfaction à chaud de chaque voyageur | Date de retour | Animatrice | | |
| R35 | 09 | Date de retour | Passage en Voyageur (auto) | R | | | |
| R36 | 09 | Retour | Invitation au Soli'apéro retour (auto) | R+2 | | M20 | |
| R37 | 09 | Pas de confirmation | Relance personnelle | R+5 | Référente | M21 | Présence confirmée |
| R38 | 09 | Retour | Préparer la soirée retour (album, diaporama, fiches, programme du mois) | R+5 | Référente et Florentine | | |
| R39 | 10 | Soli'apéro retour | Saisir présences, album remis, décision sur l'abonnement | Date de la soirée | Référente | | |
| R40 | 10 | Soirée passée | Mail de remerciement avec photos | Soirée + 1 jour | Référente | M22 | |
| R41 | 10 | Absent à la soirée | Appeler, remettre l'album, proposer l'abonnement | Soirée + 7 jours | Référente | | |
| R42 | 11 | Pas de souscription | Appeler : écouter les freins, proposer une activité d'essai | Soirée + 3 jours | Référente | | Abonné |
| R43 | 11 | Toujours pas de souscription | Dernier message sans insistance, bascule process 14 | Soirée + 15 jours | Référente | M23 | Abonné |
| R44 | 12 | Soirée passée | Enquête de satisfaction (auto) | Soirée + 2 jours | | M24 | |
| R45 | 12 | Note de 9 ou 10 | Lien avis Google et code parrain (auto) | Immédiat | | M25 | |
| R46 | 12 | Note de 7 ou 8 | Remerciement et question d'amélioration (auto) | Immédiat | | M26 | |
| R47 | 12 | Note de 6 ou moins | Appeler le client ; ouvrir une réclamation si le mécontentement est confirmé | Sous 48 h | Référente | | |
| R48 | 13 | Souscription | Mail de bienvenue abonné (auto) et ajout au canal WhatsApp de la cible | J0 | Référente | M27 | |
| R49 | 13 | Souscription | Invitation à la première activité | J+7 | Référente | M28 | |
| R50 | 13 | Première activité réalisée | Message de suivi | +2 jours | Référente | M29 | |
| R51 | 13 | Anniversaire du client | Message d'anniversaire et attention à la prochaine activité | Date d'anniversaire | Référente | M30 | |
| R52 | 13 | Un an d'abonnement | Enquête annuelle (auto) | Date anniversaire | | M31 | |
| R53 | 13 et 14 | Premier jour du mois | Newsletter mensuelle (auto) à tous les consentants | Le 1er | Florentine | M32 | |
| R54 | 13 | Abonné sans activité depuis 30 jours | Alerte sur la fiche et au tableau de bord | J+30 | Référente | | Nouvelle participation |
| R55 | 13 | Abonné sans activité depuis 60 jours | Prendre des nouvelles sans parler d'abonnement, critère M4 | J+60 | Référente | | Nouvelle participation |
| R56 | 14 | Voyageur non abonné venu à un événement ouvert | Reproposer l'abonnement à chaud | +2 jours | Référente | | Abonné |
| R57 | 14 | Voyageur non abonné | Prise de nouvelles (auto) | R+6 mois | | M33 | Abonné ou nouvelle réservation |
| R58 | 14 | Voyageur | Mail flashback (auto) | Anniversaire du départ | Florentine | M34 | |
| R59 | 15 | Note de 9 ou 10, ou nouvel abonné | Générer le code parrain unique | Immédiat | | | |
| R60 | 15 | Acompte d'un filleul encaissé | Attribuer la récompense, remercier le parrain, badge Ambassadeur | Immédiat | Référente | M35 | |
| R61 | 15 | Appel de bienvenue d'un filleul | Mentionner le parrain dans la tâche d'appel (« Monique m'a beaucoup parlé de vous ») | | Référente | | |
| R62 | 16 | Réclamation ouverte | Accusé de réception si écrite (auto), vérifier les faits | Sous 24 h, puis 72 h | Référente | M36 | |
| R63 | 16 | Réclamation | Réponse définitive par téléphone puis par écrit ; geste hors barème validé par Emilien | Sous 7 jours | Référente, Emilien | M37 | Résolue |
| R64 | 16 | Réclamation résolue | Rappeler pour vérifier que la solution convient | J+7 | Référente | | |
| R65 | 17 | Avis de 4 ou 5 étoiles | Réponse personnalisée | Sous 48 h | Florentine | M38 | |
| R66 | 17 | Avis de 3 étoiles ou moins | Réponse publique, alerte à la référente, ouverture du process 16, critère M2 | Sous 24 h | Florentine | M39 | |
| R67 | 18 | Demande de report acceptée | Confirmation écrite | Sous 48 h | Référente | M40 | |
| R68 | 18 | Annulation | Calcul du barème, confirmation écrite des montants, remboursement sous 14 jours, place proposée à la liste d'attente | Sous 48 h | Emilien, Solveig | M41 | |

Les variables des messages (`{{prenom}}`, `{{offre}}`, `{{date_depart}}`…) sont remplies depuis la fiche, la réservation et le planning. Une variable sans valeur s'affiche entre crochets (`[lien_enquete]`), jamais vide.

## 8. Règles métier retenues

Ces règles tranchent les incohérences relevées dans les process. Elles sont reprises dans `docs/06-decisions.md`.

- **Acompte de 30 %** à la réservation, **solde de 70 % à J-60**. Une réservation à **moins de 60 jours** du départ règle la totalité à la signature.
- **Devis valable 30 jours.** Places limitées au maximum de l'offre (14 à 20).
- **Report gratuit** une seule fois par contrat, seulement à **plus de 30 jours** du départ, sur une date du programme dans les 12 mois (article 9 des CGV).
- **Barème d'annulation** (frais retenus selon le nombre de jours entre la réception de l'annulation et le départ) : plus de 60 jours, 30 % ; de 60 à 31 jours, 50 % ; de 30 à 15 jours, 75 % ; de 14 à 7 jours, 90 % ; moins de 7 jours ou absence, 100 %. Remboursement sous 14 jours.
- **Abonné inactif** : alerte à 30 jours sans activité, appel à 60 jours.
- **Soli'apéro brise-glace à J-15**, **Soli'apéro retour à R+10** (dans la fenêtre R+7 à R+15).
- **Une activité par semaine**, la cible change chaque semaine (seniors, célibataires, parents solos) : chaque cible a donc une activité toutes les 3 semaines. La première activité de chaque mois est ouverte à tous.
- **Abonnement** : formule unique à 29 € par mois, sans mois offert.
- Le terme officiel est « **animatrice** du séjour ».

## 9. Indicateurs du tableau de bord

Chaque indicateur affiche sa définition et le process qui l'a défini. Calculés sur les 90 derniers jours avant la date de référence, sauf mention contraire.

| Indicateur | Définition | Process |
| --- | --- | --- |
| Contacts qualifiés par origine | Nouvelles fiches par origine | 01 |
| Délai moyen de première réponse | Demande à première réponse personnelle, en heures ouvrées | 02 |
| Taux demande vers rendez-vous | Prospects ayant accepté une découverte ÷ prospects | 02 |
| Taux découverte vers devis | Devis envoyés ÷ découvertes réalisées | 03 |
| Taux devis vers réservation | Réservations ÷ devis envoyés | 04 |
| Remplissage par départ | Places réservées ÷ places max, pour chaque départ à venir | 04 |
| Appels de bienvenue sous 48 h | Part des réservations appelées dans les 48 h | 05 |
| Soldes réglés à l'échéance | Soldes encaissés au plus tard à J-60 ÷ soldes échus | 06 |
| Participation au Soli'apéro brise-glace | Présents ÷ voyageurs (objectif 100 %) | 07 |
| Satisfaction à chaud | Moyenne des notes à chaud | 08 |
| Participation au Soli'apéro retour | Présents ÷ voyageurs | 09, 10 |
| **Conversion voyageurs vers abonnés** (indicateur clé) | Abonnés ÷ voyageurs revenus depuis plus de 15 jours | 11 |
| NPS | % de 9 et 10 moins % de 0 à 6 | 12 |
| Avis Google | Nombre et note moyenne | 12, 17 |
| Abonnés actifs dans le mois | Abonnés venus à au moins une activité en 30 jours ÷ abonnés | 13 |
| Taux de résiliation | Résiliations ÷ abonnés en début de période | 13 |
| Part des clients venus par recommandation | Contacts d'origine parrainage ÷ contacts | 15 |
| Réclamations résolues sous 7 jours | Part et délai moyen | 16 |
| Taux d'annulation | Annulations ÷ réservations | 18 |
| Fiches complètes | Fiches dont tous les champs obligatoires du statut sont remplis | 19 |
| Équité du scoring | Médiane du score à la réservation, par cible (alerte si plus de 10 points d'écart) | Lead scoring |

## 10. Critères de recette

- [ ] Les 8 cas de recette de `data/scoring-rules.json` passent en test automatique.
- [ ] À la date du 30/11/2026, les fiches de démo **Marc** (22, Froid), **Monique** (77, Prêt à réserver) et **Sarah** (39, Tiède) affichent ces scores.
- [ ] Sur la fiche de Monique, enregistrer la réservation fait avancer le PIN de Considération à Achat, fige son score de conversion et crée le mail de confirmation, la tâche de fiche de passation, puis la tâche d'appel de bienvenue.
- [ ] Avancer la date de 7 jours fait apparaître les nouvelles tâches dues et les messages automatiques, et fait baisser les scores selon la dégressivité.
- [ ] Le départ de décembre le plus proche affiche son remplissage, ses soldes et son Soli'apéro brise-glace cohérents avec les réservations.
- [ ] Aucun tiret long, aucune icône d'avion, de valise ou de mappemonde dans l'interface.
- [ ] L'application publiée sur Vercel s'ouvre, la connexion fonctionne avec les 6 comptes, et les données sont partagées entre deux navigateurs.
