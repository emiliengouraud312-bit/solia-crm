# Journal des décisions

Une ligne par décision : date, décision, raison. Claude Code ajoute ici chaque arbitrage qu'il fait seul.

| Date | Décision | Raison |
| --- | --- | --- |
| 12/10/2026 | Solde de 70 % à J-60 (et non J-15 comme dans les CGV) | Parcours client validé par le groupe ; les CGV sont à aligner |
| 12/10/2026 | Totalité exigible pour une réservation à moins de 60 jours du départ | Conséquence du solde à J-60 (process 04 corrigé) |
| 12/10/2026 | Abonné inactif : alerte à 30 jours, appel à 60 jours | Process 13 et 19 incohérents, les deux seuils sont conservés |
| 12/10/2026 | Terme « animatrice du séjour » | Harmonisation du process 07 |
| 12/10/2026 | Critères C6 et C18 retirés, C1 à 11, C4 à 4, C5 à 3, C7 à 3, C15 à 8 | Validé par le groupe dans la stratégie de lead scoring |
| 12/10/2026 | Tout le monde a le même accès complet | Demande d'Emilien ; les rôles servent seulement à attribuer les tâches |
| 12/10/2026 | Messages simulés, aucun envoi réel | Démo devant le jury avec des données fictives |
| 12/10/2026 | Planning imaginé : 36 départs de septembre 2026 à août 2027 (1 par cible et par mois, seuil de rentabilité), 52 activités hebdomadaires avec rotation des cibles | Demande d'Emilien |
| 12/10/2026 | Soli'apéro brise-glace à J-15 à 18 h 30, Soli'apéro retour à R+10 à 18 h 30 | Process 07 et 09 (fenêtre R+7 à R+15) |
| 12/10/2026 | Places : Week-end Basque, Parenthèse à Lisbonne et Sunset à Hossegor à 16 places (hypothèse) ; Irlande à 1 690 € ; Paris à 16 places ; Barcelone à 18 places | Informations manquantes ou contradictoires dans les plaquettes, à confirmer par le groupe |
| 12/10/2026 | Date de démo : 30/11/2026 | Rendu prévu au plus tard le 30/11/2026 |
| 12/10/2026 | Parents solos : départs le week-end (vendredi au dimanche, jeudi pour Lisbonne) ; célibataires de décembre avancés à la 2e semaine pour éviter Noël | Choix de planning |
| 12/10/2026 | Dépôt réorganisé selon CLAUDE.md (`docs/`, `docs/sources/`, `data/`, `assets/fonts/`, `assets/brand/`), fichiers renommés sans espaces | Les fichiers avaient été déposés à plat ; les chemins de CLAUDE.md font foi |
| 12/10/2026 | Logo fourni en PNG : conservé en PNG sur fond transparent (`assets/brand/logo-solia.png`) ; PIN redessiné en SVG fidèle (`assets/brand/pin-solia.svg`) ; originaux dans `docs/sources/` | Aucun fichier SVG fourni ; le PIN doit pouvoir s'animer et se griser |
| 12/10/2026 | Référentiels (équipe, offres, départs, activités) identifiés par leur code texte de `data/` (ex. `malte-2027-01`), les autres tables par un uuid | Lisibilité et lien direct avec les fichiers `data/` |
| 12/10/2026 | Sarah est parrainée par Julie Petit | `docs/03-donnees-fictives.md` prime sur l'exemple du document de stratégie (Monique) |
| 12/10/2026 | Les exemples chiffrés du document de stratégie (20, 63, 78, 38, 33) ne servent pas de référence ; seuls les cas de recette de `data/scoring-rules.json` font foi | Exemples antérieurs à la mise à jour des poids |
| 12/10/2026 | Origine et critère : Parrainage avec parrain enregistré = C1 ; Stand, Agence, Partenaire = C2 ; Flyer QR code, Site = C3 ; Réseau social et Appel entrant = aucun point d'origine | Liste des origines de la grille Excel (onglet Champs CRM) ; l'appel compte déjà en C10 |
| 12/10/2026 | Preuves de P6 et P7 : événements datés `dates_confirmees` et `budget_confirme` (montant du budget dans le détail) | Règle « pas de preuve, pas de points » ; P6 et P7 seulement si confirmés à l'oral ou par écrit |
| 12/10/2026 | P6 « autre départ compatible » : départ ouvert de la même cible dont la date de départ tombe entre `dispo_debut` et `dispo_fin` ; la réservation du contact lui-même n'est pas décomptée des places restantes | Sinon le score figé à la réservation perdrait P6 quand le client prend la dernière place |
| 12/10/2026 | Au-delà du maximum d'occurrences d'un critère, on retient les plus récentes ; l'arrondi (au plus proche, 0,5 vers le haut) ne s'applique qu'au total | Option la plus favorable et la plus simple à expliquer |
| 12/10/2026 | Perdu : seuls les événements postérieurs à la dernière date de perte comptent dans le comportement (origine comprise), même si le contact redevient Prospect ; les points négatifs restent appliqués | « Le comportement repart à 0 à partir de la date de perte » ; les négatifs ne font pas partie du comportement |
| 12/10/2026 | Levée des négatifs : N3 par une nouvelle vérification de coordonnée, N4 par un rendez-vous réalisé ensuite, N5 et N6 par une nouvelle demande (demande écrite, appel entrant ou visite) ; chaque événement négatif actif compte | Colonne « levée » du JSON |
| 12/10/2026 | Score à la réservation : calculé à la date de la première réservation, puis figé | Le score de conversion mesure le chemin vers le premier achat |
| 12/10/2026 | Engagement : réservation de référence = la dernière réservation dont le voyage est terminé, sinon la réservation en cours | Sinon E15 (nouveau voyage dans les 12 mois) ne pourrait jamais être obtenu |
| 12/10/2026 | Engagement : un critère n'est compté comme obtenu que s'il est déjà atteignable | Sinon le prorata dépasserait 100 % (ex. appel de bienvenue fait avant la fin des 48 h) |
| 12/10/2026 | E1 : appel au plus tard 2 jours après la réservation ; E3 : solde réglé au plus tard à l'échéance de la réservation (date de réservation si la totalité était exigible) ; E10 : case « avis Google publié » de l'enquête ou avis Google rattaché au contact | Traduction des critères en données datées |
| 12/10/2026 | Date d'ajout au groupe WhatsApp enregistrée (`ajout_groupe_date`) | E2 devient atteignable 7 jours après l'ajout |
| 12/10/2026 | M1 levé 7 jours après la résolution ; M2 levé quand la réclamation liée à l'avis est résolue ; M4 à partir de 60 jours sans présence (depuis la dernière présence ou le début de l'abonnement) ; M5 tant que la désinscription n'est pas suivie d'une réinscription | Colonne « levée » du JSON ; « depuis 60 jours » lu comme 60 jours ou plus |
| 12/10/2026 | C19 : toute activité ouverte à tous, quelle que soit sa cible | Le critère vise la venue à un événement ouvert |
| 12/10/2026 | Après une annulation, le contact passe en Perdu avec le motif « Annulation du voyage » | Aucun statut dédié dans le process 19 |
| 12/10/2026 | Report : pas de statut de réservation « reportée » ; la réservation reste active sur le nouveau départ (`report_utilise`, `depart_initial_id`, `date_report`) | Le client reste réservé, seul le départ change |
| 12/10/2026 | Récompense de parrainage non définie dans les sources : champ laissé vide, la variable `{{recompense}}` s'affiche entre crochets | Ne pas inventer de règle métier ; à définir par le groupe |
| 12/10/2026 | Champs ajoutés au modèle : `contacts.date_creation` ; `reservations.rappel_solde_auto`, `hesite_dates`, `ajout_groupe_date`, `depart_initial_id`, `date_report`, `annulation_date`, `annulation_motif`, `montant_retenu`, `montant_rembourse` ; `abonnements.date_decision` ; `reclamations.ecrite`, `description` ; `avis.reclamation_id` | Nécessaires aux règles R20, R24, R62, au barème d'annulation et aux preuves datées |
| 12/10/2026 | En mode local, l'utilisateur connecté se choisit dans le bandeau ; la vraie connexion arrive avec Supabase (phase 4) | Permet de tester « Ma journée » sans compte |
| 12/10/2026 | Un devis ou une demande ne change pas le statut d'un Voyageur ou d'un Abonné ; seul le passage en Réservé le fait | « Un Voyageur ou un Abonné qui réserve un nouveau voyage repasse en Réservé » ; le statut Devis envoyé est réservé aux prospects |
| 12/10/2026 | Un contact Perdu après une annulation affiche son score d'engagement figé à l'annulation (son score à la réservation reste consultable) | Un score de conversion figé à 80 sur un client perdu induirait en erreur |
| 12/10/2026 | Jeu de démo : nombre de voyageurs et de réservations fixé par départ (117 voyageurs passés, 89 réservations à venir) ; 4 voyageurs non abonnés et 2 prospects venus aux événements ouverts à tous | Volumes de `docs/03-donnees-fictives.md` tenus à coup sûr |
| 12/10/2026 | Nouvel événement « Réponse personnelle » (process 02) ; un appel entrant ou une visite vaut réponse en direct | Jalon « Réponse personnelle » de la frise ; préparera la règle R05 et le délai de première réponse |
| 12/10/2026 | Frise : les jalons envoyés automatiquement (bienvenue à J+2, règle R01 ; confirmation le jour de la réservation, règle R15) sont atteints à leur date ; dès la phase 3, la date est celle du message tracé | Ces envois sont automatiques dans les process |
| 12/10/2026 | Frise : les Soli'apéros sont des jalons atteints dès que la présence est saisie (présent ou absent, précisé au survol) | Le jalon marque l'étape du parcours, la présence compte dans le score (E4, E8) |
| 12/10/2026 | Frise d'un client qui repart : le dernier voyage s'affiche par défaut ; un voyage suivant commence avec sa propre demande ou son devis | Règle d'affichage du cahier des charges (sélecteur des voyages précédents) |
| 12/10/2026 | Réservation à moins de 60 jours du départ : l'acompte est encaissé à la réservation et le solde devient exigible le jour même (échéance = date de réservation), encaissé ensuite par l'action « Encaisser le solde » (process 06, Emilien) | Totalité exigible à la signature ; le PIN passe en Achat à la réservation (cas de recette de Monique), puis en Avant au solde |
| 12/10/2026 | Pipeline : transitions autorisées listées dans `src/domain/statuts.ts` ; Réservé ou Soldé vers Perdu refusé (annulation : process 18, phase 5) ; Voyageur seulement après la date de retour | Process 19 : statuts et champs obligatoires contrôlés à la saisie |
| 12/10/2026 | Champs obligatoires du statut contrôlés à chaque action et affichés sur la fiche ; la fiche de passation est obligatoire en Réservé et Soldé | Process 05 : « fiche de passation obligatoire » ; indicateur « fiches complètes » du process 19 |
| 12/10/2026 | Badge Ambassadeur calculé à la date de référence : au moins un filleul dont l'acompte est encaissé | Process 15 ; le badge suit la date de référence comme les scores |
| 12/10/2026 | Code parrain généré au moment de l'action qui le déclenche : enquête avec une note de 9 ou 10, ou souscription | Règle R59 (« immédiat ») |
| 12/10/2026 | Pastilles de la frise : points bruts du critère, sur l'événement qui le prouve ; pour l'engagement, sur le voyage qui sert au score | Le score d'engagement est un prorata : la pastille montre la valeur du critère |
