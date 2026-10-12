# Modèles de messages Solia

41 modèles, rédigés au vouvoiement dans le ton « solaire » de Solia. Les variables sont entre doubles accolades. Dans le CRM, tous les envois sont **simulés** : le message est affiché, puis tracé dans le journal du contact.

## Process 01

### M01 · Bienvenue personnelle

- **Canal** : whatsapp ou email (canal préféré)
- **Déclencheur** : Création de la fiche contact · **Délai** : J+2
- **Expéditeur** : référente · **Envoi** : automatique simulé
- **Objet** : Ravie de vous avoir rencontré(e), {{prenom}} !

```text
Bonjour {{prenom}},

C'était un plaisir d'échanger avec vous {{lieu_rencontre}}. Comme promis, voici les voyages que nous avons imaginés pour vous : {{lien_offres_cible}}

Chez Solia, on part en petit groupe et on revient avec des amis. Si une date vous fait de l'œil ou si vous avez la moindre question, répondez simplement à ce message.

À très vite,
{{prenom_referente}}, votre référente Solia
```

### M02 · Invitation personnelle à un départ

- **Canal** : canal préféré
- **Déclencheur** : Un départ du planning correspond aux envies du contact · **Délai** : Dès l'ouverture du départ
- **Expéditeur** : référente · **Envoi** : manuel (proposé par une tâche)
- **Objet** : {{prenom}}, ce départ est fait pour vous

```text
Bonjour {{prenom}},

Vous m'aviez parlé de votre envie de {{envie}}. Nous partons pour {{offre}} du {{date_depart}} au {{date_retour}}, en petit groupe de {{places_max}} voyageurs maximum.

Il reste {{places_restantes}} places. Je vous en dis plus de vive voix ? Un simple « oui » en réponse et je vous rappelle.

{{prenom_referente}}, votre référente Solia
```

## Process 02

### M03 · Accusé de réception d'une demande

- **Canal** : email
- **Déclencheur** : Formulaire du site reçu · **Délai** : Immédiat
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : Votre demande est bien arrivée

```text
Bonjour {{prenom}},

Merci pour votre message ! Nous l'avons bien reçu et nous vous répondons personnellement dans la journée.

À tout de suite,
L'équipe Solia
```

### M04 · Première relance prospect

- **Canal** : canal préféré
- **Déclencheur** : Pas de réponse à notre réponse personnelle · **Délai** : J+3
- **Expéditeur** : Solveig · **Envoi** : manuel (tâche)
- **Objet** : {{prenom}}, avez-vous pu jeter un œil ?

```text
Bonjour {{prenom}},

Je reviens vers vous au sujet de {{offre}}. Avez-vous eu le temps d'y réfléchir ? Je serais ravie de vous accueillir à l'agence ou de vous appeler 20 minutes pour en parler.

Belle journée,
Solveig, Solia
```

### M05 · Deuxième relance avec un élément concret

- **Canal** : canal préféré
- **Déclencheur** : Toujours pas de réponse · **Délai** : J+7
- **Expéditeur** : Solveig · **Envoi** : manuel (tâche)
- **Objet** : Le prochain Soli'apéro, c'est le {{date_evenement}}

```text
Bonjour {{prenom}},

Un petit signe pour vous donner envie : {{element_concret}}

Si vous voulez simplement voir à quoi ressemble un groupe Solia, venez nous rencontrer le {{date_evenement}}, c'est ouvert à tous et sans engagement.

Solveig, Solia
```

## Process 03

### M06 · Envoi du devis personnalisé

- **Canal** : email
- **Déclencheur** : Fin de la découverte, accord pour un devis · **Délai** : Sous 24 h
- **Expéditeur** : Solveig · **Envoi** : manuel (tâche)
- **Objet** : Votre devis pour {{offre}}

```text
Bonjour {{prenom}},

Merci pour notre échange. Comme convenu, voici votre devis pour {{offre}}, du {{date_depart}} au {{date_retour}} : {{lien_devis}}

Montant : {{montant}} € TTC, tout inclus.
Acompte de 30 % à la réservation, solde à régler 60 jours avant le départ.
Ce devis est valable jusqu'au {{date_fin_validite}}. Les places sont limitées à {{places_max}} voyageurs.

Pensez à vérifier votre couverture d'assurance (responsabilité civile, assistance, rapatriement, annulation), comme prévu à l'article 13 de nos CGV.

Je vous appelle dans quelques jours pour recueillir vos impressions.

Solveig, Solia
```

## Process 04

### M07 · Relance du devis : places restantes

- **Canal** : email
- **Déclencheur** : Devis envoyé sans réponse · **Délai** : J+7
- **Expéditeur** : Solia · **Envoi** : automatique simulé, uniquement si places restantes <= 5
- **Objet** : Plus que {{places_restantes}} places pour {{offre}}

```text
Bonjour {{prenom}},

Petite information pour votre projet : il ne reste plus que {{places_restantes}} places sur le départ du {{date_depart}} pour {{offre}}.

Votre devis est toujours valable jusqu'au {{date_fin_validite}}. Une question ? Répondez simplement à ce message.

L'équipe Solia
```

### M08 · Fin de validité du devis

- **Canal** : email
- **Déclencheur** : Devis expiré sans réponse · **Délai** : J+30
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : Une autre date vous conviendrait-elle ?

```text
Bonjour {{prenom}},

Votre devis pour {{offre}} arrive à échéance aujourd'hui. Si les dates ne vous convenaient pas, sachez que nous repartons le {{autre_date_depart}}.

Nous serions heureux de vous compter parmi nous, maintenant ou plus tard.

L'équipe Solia
```

### M09 · Proposition de liste d'attente

- **Canal** : canal préféré
- **Déclencheur** : Départ complet · **Délai** : Immédiat
- **Expéditeur** : Solveig · **Envoi** : manuel (tâche)
- **Objet** : {{offre}} affiche complet, mais pas dit notre dernier mot

```text
Bonjour {{prenom}},

Le départ du {{date_depart}} est complet. Je peux vous inscrire en liste d'attente : vous serez prévenu(e) en premier si une place se libère. Nous repartons aussi le {{autre_date_depart}}.

Que préférez-vous ?

Solveig, Solia
```

## Process 05

### M10 · Confirmation de réservation

- **Canal** : email
- **Déclencheur** : Statut Réservé · **Délai** : Le jour même
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : Bienvenue dans la tribu {{offre}} !

```text
Bonjour {{prenom}},

C'est officiel : vous partez avec nous du {{date_depart}} au {{date_retour}} pour {{offre}} !

Votre acompte de {{montant_acompte}} € est bien enregistré. Le solde de {{montant_solde}} € sera à régler au plus tard le {{date_echeance_solde}}.

Votre référente, {{prenom_referente}}, vous appellera sous 48 heures pour faire connaissance et répondre à vos questions. Prochain grand rendez-vous : le Soli'apéro brise-glace, le {{date_soliapero}} à l'agence.

À très vite,
L'équipe Solia
```

### M11 · SMS de présentation si injoignable

- **Canal** : sms
- **Déclencheur** : Deux appels de bienvenue sans réponse · **Délai** : Après la 2e tentative
- **Expéditeur** : référente · **Envoi** : manuel (tâche)

```text
Bonjour {{prenom}}, c'est {{prenom_referente}} de Solia, votre référente pour {{offre}}. J'ai essayé de vous joindre pour faire connaissance. Rappelez-moi quand vous voulez, ou dites-moi le meilleur moment. Belle journée !
```

### M12 · Présentation dans le groupe WhatsApp du voyage

- **Canal** : whatsapp (groupe du voyage)
- **Déclencheur** : Appel de bienvenue réalisé · **Délai** : J+1 après l'appel
- **Expéditeur** : référente · **Envoi** : manuel (tâche)

```text
Accueillons {{prenom}} dans la tribu {{offre}} ! {{prenom}} nous rejoint pour le départ du {{date_depart}}. Un petit mot pour lui souhaiter la bienvenue ?
```

## Process 06

### M13 · Rappel du solde et programme détaillé

- **Canal** : email
- **Déclencheur** : Réservation confirmée · **Délai** : J-70
- **Expéditeur** : Solia · **Envoi** : automatique simulé (désactivable sur la fiche)
- **Objet** : Votre programme {{offre}} et le rappel du solde

```text
Bonjour {{prenom}},

Le départ approche ! Vous trouverez votre programme détaillé ici : {{lien_programme}}

Petit rappel : le solde de {{montant_solde}} € est à régler au plus tard le {{date_echeance_solde}} (carte bancaire, virement, chèque ou chèques-vacances ANCV). Vos documents de voyage vous seront remis une fois le règlement complet.

L'équipe Solia
```

### M14 · Mise en demeure pour solde non réglé

- **Canal** : email avec accusé de réception (support durable)
- **Déclencheur** : Solde non encaissé à J-60 · **Délai** : J-57
- **Expéditeur** : Emilien · **Envoi** : manuel (tâche, validation d'Emilien)
- **Objet** : Mise en demeure : solde de votre voyage {{offre}}

```text
Madame, Monsieur {{nom}},

Sauf erreur de notre part, le solde de {{montant_solde}} € relatif à votre voyage {{offre}} du {{date_depart}}, exigible le {{date_echeance_solde}}, n'a pas été réglé.

Conformément à l'article 6 de nos conditions générales de vente, nous vous mettons en demeure de procéder à ce règlement sous 7 jours à compter de la réception de ce message. À défaut, le contrat sera résolu et le barème d'annulation prévu à nos CGV s'appliquera.

Si vous rencontrez une difficulté, contactez-nous : nous chercherons ensemble une solution.

Emilien, direction administrative et financière, Solia
```

## Process 07

### M15 · Invitation au Soli'apéro brise-glace

- **Canal** : email et whatsapp
- **Déclencheur** : Départ confirmé · **Délai** : J-21
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : Rencontrez votre tribu avant le départ !

```text
Bonjour {{prenom}},

Avant de partir ensemble, faisons connaissance ! Vous êtes invité(e) au Soli'apéro brise-glace le {{date_soliapero}} à {{heure_soliapero}}, à l'agence Solia.

Au programme : un jeu pour briser la glace, la présentation du programme, la remise de votre carnet de voyage et un verre tous ensemble.

Pouvez-vous nous confirmer votre présence en répondant à ce message ?

{{prenom_referente}}, votre référente Solia
```

### M16 · Relance personnelle de l'invitation

- **Canal** : canal préféré
- **Déclencheur** : Pas de confirmation de présence · **Délai** : J-18
- **Expéditeur** : référente · **Envoi** : manuel (tâche)
- **Objet** : On vous garde une place au Soli'apéro ?

```text
Bonjour {{prenom}}, c'est {{prenom_referente}} ! Je prépare les badges du Soli'apéro du {{date_soliapero}} et j'aimerais beaucoup vous y voir : c'est là que le groupe se rencontre. Vous serez des nôtres ?
```

### M17 · Photo de groupe : la tribu est née

- **Canal** : whatsapp (groupe du voyage)
- **Déclencheur** : Soli'apéro brise-glace passé · **Délai** : J-14
- **Expéditeur** : référente · **Envoi** : manuel (tâche)

```text
La tribu est née ! Merci à tous pour cette belle soirée. Rendez-vous le {{date_depart}} pour la suite de l'aventure {{offre}}.
```

### M18 · Compte à rebours J-3

- **Canal** : email et whatsapp
- **Déclencheur** : Départ imminent · **Délai** : J-3
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : J-3 avant {{offre}} !

```text
Bonjour {{prenom}},

Plus que 3 jours ! Rendez-vous le {{date_depart}} à {{heure_rdv}}, {{lieu_rdv}}. Pensez à votre pièce d'identité et à votre carnet de voyage.

Une question de dernière minute ? Votre référente {{prenom_referente}} est joignable au {{telephone_referente}}.

L'équipe Solia
```

### M19 · Veille du départ

- **Canal** : whatsapp (groupe du voyage)
- **Déclencheur** : Départ imminent · **Délai** : J-1
- **Expéditeur** : référente · **Envoi** : automatique simulé

```text
Demain, c'est le grand départ ! Rendez-vous à {{heure_rdv}}, {{lieu_rdv}}. On a hâte de vous retrouver. Dormez bien !
```

## Process 09

### M20 · Invitation au Soli'apéro retour

- **Canal** : email et whatsapp
- **Déclencheur** : Retour du voyage · **Délai** : R+2
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : On se retrouve pour revivre {{offre}} ?

```text
Bonjour {{prenom}},

Les valises sont à peine défaites et les souvenirs déjà nombreux ! Retrouvons-nous le {{date_soliapero_retour}} à {{heure_soliapero}} à l'agence pour le Soli'apéro retour : diaporama, remise de votre album photo et quelques surprises.

Pouvez-vous nous confirmer votre présence ?

{{prenom_referente}}, votre référente Solia
```

### M21 · Relance de l'invitation retour

- **Canal** : canal préféré
- **Déclencheur** : Pas de confirmation · **Délai** : R+5
- **Expéditeur** : référente · **Envoi** : manuel (tâche)
- **Objet** : Votre album vous attend

```text
Bonjour {{prenom}}, votre album photo du voyage est prêt et je serais ravie de vous le remettre en main propre le {{date_soliapero_retour}}. Vous serez là ?
{{prenom_referente}}
```

## Process 10

### M22 · Remerciement après le Soli'apéro retour

- **Canal** : email
- **Déclencheur** : Soli'apéro retour passé · **Délai** : R+1 après la soirée
- **Expéditeur** : référente · **Envoi** : manuel (tâche)
- **Objet** : Merci pour cette belle soirée !

```text
Bonjour {{prenom}},

Merci d'être venu(e) hier soir. Quel plaisir de revivre {{offre}} ensemble ! Voici quelques photos de la soirée : {{lien_photos}}

La tribu continue : retrouvez le programme des activités du mois ici : {{lien_programme_activites}}

{{prenom_referente}}, votre référente Solia
```

## Process 11

### M23 · Dernier message sur l'abonnement

- **Canal** : canal préféré
- **Déclencheur** : Pas de souscription après l'appel R+3 · **Délai** : R+15 après la soirée
- **Expéditeur** : référente · **Envoi** : manuel (tâche)
- **Objet** : La porte reste grande ouverte

```text
Bonjour {{prenom}},

Je ne veux pas insister, juste vous dire que la tribu Solia reste ouverte : vous recevrez notre newsletter et nos invitations aux événements ouverts à tous. Et si l'envie de nous rejoindre vient, un simple message suffit.

Au plaisir de vous revoir,
{{prenom_referente}}, votre référente Solia
```

## Process 12

### M24 · Enquête de satisfaction du voyage

- **Canal** : email (téléphone proposé aux seniors)
- **Déclencheur** : Soli'apéro retour passé · **Délai** : R+2 après la soirée
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : 3 minutes pour nous dire comment c'était ?

```text
Bonjour {{prenom}},

Votre avis nous aide à rendre chaque voyage encore plus beau. Voici 5 questions rapides : {{lien_enquete}}

Vous préférez en parler de vive voix ? Votre référente {{prenom_referente}} peut vous appeler : répondez simplement « appel ».

Merci du fond du cœur,
L'équipe Solia
```

### M25 · Demande d'avis Google et code parrain (note 9 ou 10)

- **Canal** : email
- **Déclencheur** : Note de recommandation de 9 ou 10 · **Délai** : Immédiat
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : Merci {{prenom}} ! Un dernier petit coup de pouce ?

```text
Bonjour {{prenom}},

Votre note nous fait chaud au cœur. Si vous avez 1 minute, votre avis sur Google aidera d'autres voyageurs à oser partir avec nous : {{lien_avis_google}}

Et parce que les plus belles rencontres se partagent, voici votre code parrain personnel : {{code_parrain}}. Si un proche réserve avec ce code, vous recevez {{recompense}}.

L'équipe Solia
```

### M26 · Remerciement et piste d'amélioration (note 7 ou 8)

- **Canal** : email
- **Déclencheur** : Note de recommandation de 7 ou 8 · **Délai** : Immédiat
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : Merci ! Qu'est-ce qui aurait rendu ce voyage parfait ?

```text
Bonjour {{prenom}},

Merci pour votre réponse. Une seule question : qu'est-ce qui aurait rendu votre voyage parfait ? Répondez simplement à ce message, nous lisons tout.

L'équipe Solia
```

## Process 13

### M27 · Bienvenue abonné

- **Canal** : email
- **Déclencheur** : Souscription à l'abonnement · **Délai** : J0
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : Bienvenue dans la communauté Solia !

```text
Bonjour {{prenom}},

Vous faites désormais partie de la communauté Solia ! Votre abonnement comprend les activités et retrouvailles de votre tribu, toute l'année.

Au programme ce mois-ci : {{programme_du_mois}}

Vous allez être ajouté(e) au canal WhatsApp {{nom_canal_cible}}, où se retrouvent les voyageurs de tous nos départs.

À très vite,
L'équipe Solia
```

### M28 · Invitation à la première activité

- **Canal** : canal préféré
- **Déclencheur** : Souscription · **Délai** : J+7
- **Expéditeur** : référente · **Envoi** : manuel (tâche)
- **Objet** : Votre première activité Solia

```text
Bonjour {{prenom}} ! Pour votre première activité, je vous propose {{activite}} le {{date_activite}} à {{heure_activite}}. Et pourquoi ne pas venir avec {{prenom_compagnon_voyage}}, rencontré(e) pendant {{offre}} ? Je vous garde une place ?
{{prenom_referente}}
```

### M29 · Suivi après la première activité

- **Canal** : canal préféré
- **Déclencheur** : Première activité réalisée · **Délai** : 2 jours après
- **Expéditeur** : référente · **Envoi** : manuel (tâche)

```text
Bonjour {{prenom}}, merci d'être venu(e) à {{activite}} ! Ça vous a plu ? La prochaine pour votre tribu, c'est {{prochaine_activite}} le {{date_prochaine_activite}}.
```

### M30 · Message d'anniversaire

- **Canal** : canal préféré
- **Déclencheur** : Date d'anniversaire du client · **Délai** : Le jour même
- **Expéditeur** : référente · **Envoi** : manuel (tâche)
- **Objet** : Joyeux anniversaire {{prenom}} !

```text
Joyeux anniversaire {{prenom}} ! Toute la tribu Solia vous souhaite une très belle journée. Une petite attention vous attend à votre prochaine activité.
{{prenom_referente}}
```

### M31 · Enquête annuelle de l'abonnement

- **Canal** : email
- **Déclencheur** : 1 an d'abonnement · **Délai** : Une fois par an
- **Expéditeur** : Florentine · **Envoi** : automatique simulé
- **Objet** : Votre année avec Solia en 3 minutes

```text
Bonjour {{prenom}},

Voilà un an que vous faites vivre la communauté Solia ! Pour construire la suite avec vous, dites-nous ce que vous aimez et ce que vous changeriez : {{lien_enquete_abonnement}}

Merci,
Florentine, Solia
```

### M32 · Newsletter mensuelle

- **Canal** : email
- **Déclencheur** : Début de mois · **Délai** : Chaque mois
- **Expéditeur** : Florentine · **Envoi** : automatique simulé
- **Objet** : Ce mois-ci chez Solia

```text
Bonjour {{prenom}},

Les activités du mois pour votre tribu :
{{liste_activites_du_mois}}

Les prochains départs :
{{liste_prochains_departs}}

Le mot d'un voyageur : « {{temoignage}} »

À très vite,
L'équipe Solia

Vous ne souhaitez plus recevoir cette newsletter ? {{lien_desinscription}}
```

## Process 14

### M33 · Prise de nouvelles à 6 mois

- **Canal** : email
- **Déclencheur** : Voyageur non abonné · **Délai** : R+6 mois
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : {{prenom}}, que devenez-vous ?

```text
Bonjour {{prenom}},

Six mois déjà depuis {{offre}} ! Nous espérons que les souvenirs sont toujours aussi vifs. Le prochain départ de votre tribu, c'est {{prochaine_offre}} le {{prochaine_date_depart}} : {{lien_offre}}

Au plaisir de vous revoir,
L'équipe Solia
```

### M34 · Flashback, anniversaire du voyage

- **Canal** : email
- **Déclencheur** : Un an après le voyage · **Délai** : Date anniversaire du départ
- **Expéditeur** : Florentine · **Envoi** : automatique simulé
- **Objet** : Il y a un an, vous étiez à {{destination}}

```text
Bonjour {{prenom}},

Il y a un an jour pour jour, vous partiez pour {{offre}}. Petit retour en images : {{lien_photos}}

Et si on remettait ça ? Pour fêter cet anniversaire, {{offre_speciale}} sur votre prochain voyage.

Florentine, Solia
```

## Process 15

### M35 · Remerciement du parrain

- **Canal** : canal préféré
- **Déclencheur** : Acompte du filleul encaissé · **Délai** : Immédiat
- **Expéditeur** : référente · **Envoi** : manuel (tâche)
- **Objet** : Merci {{prenom}}, vous êtes Ambassadeur Solia !

```text
Bonjour {{prenom}},

Grâce à vous, {{prenom_filleul}} part avec nous pour {{offre_filleul}} ! Pour vous remercier, vous recevez {{recompense}}, et votre badge Ambassadeur Solia.

Merci de faire grandir la tribu,
{{prenom_referente}}, votre référente Solia
```

## Process 16

### M36 · Accusé de réception d'une réclamation

- **Canal** : email
- **Déclencheur** : Réclamation écrite reçue · **Délai** : Sous 24 h
- **Expéditeur** : Solia · **Envoi** : automatique simulé
- **Objet** : Nous avons bien reçu votre message

```text
Bonjour {{prenom}},

Merci d'avoir pris le temps de nous écrire. Votre message est bien enregistré sous la référence {{numero_reclamation}}, et votre référente {{prenom_referente}} vous contactera très vite. Nous vous apporterons une réponse définitive sous 7 jours au plus tard.

L'équipe Solia
```

### M37 · Confirmation écrite de la solution

- **Canal** : email
- **Déclencheur** : Réponse donnée par téléphone · **Délai** : Sous 7 jours
- **Expéditeur** : référente · **Envoi** : manuel (tâche)
- **Objet** : Suite à notre échange

```text
Bonjour {{prenom}},

Comme convenu lors de notre appel, voici ce que nous vous proposons : {{solution}}

Merci encore pour votre confiance et votre franchise. Je vous rappellerai dans quelques jours pour m'assurer que tout vous convient.

{{prenom_referente}}, votre référente Solia
```

## Process 17

### M38 · Réponse publique à un avis positif

- **Canal** : google ou réseaux sociaux
- **Déclencheur** : Nouvel avis de 4 ou 5 étoiles · **Délai** : Sous 48 h
- **Expéditeur** : Florentine · **Envoi** : manuel (tâche)

```text
Merci {{prenom}} ! Quel bonheur de lire votre avis. {{detail_voyage}} restera aussi un beau souvenir pour toute l'équipe. À très vite pour de nouvelles aventures avec la tribu !
```

### M39 · Réponse publique à un avis négatif

- **Canal** : google ou réseaux sociaux
- **Déclencheur** : Nouvel avis de 3 étoiles ou moins · **Délai** : Sous 24 h
- **Expéditeur** : Florentine · **Envoi** : manuel (tâche)

```text
Bonjour {{prenom}}, merci d'avoir partagé votre ressenti, nous le prenons très au sérieux. Nous aimerions en parler avec vous directement : votre référente vous contacte dès aujourd'hui. L'équipe Solia
```

## Process 18

### M40 · Confirmation d'un report

- **Canal** : email (support durable)
- **Déclencheur** : Report accepté · **Délai** : Sous 48 h
- **Expéditeur** : référente · **Envoi** : manuel (tâche)
- **Objet** : Votre voyage est reporté au {{nouvelle_date_depart}}

```text
Bonjour {{prenom}},

C'est noté : votre voyage {{offre}} est reporté au départ du {{nouvelle_date_depart}}. {{ajustement_prix}}

Pour rappel, ce report gratuit ne peut être utilisé qu'une fois par contrat (article 9 de nos CGV).

À bientôt,
{{prenom_referente}}, votre référente Solia
```

### M41 · Confirmation d'une annulation

- **Canal** : email (support durable)
- **Déclencheur** : Annulation enregistrée · **Délai** : Sous 48 h
- **Expéditeur** : Emilien · **Envoi** : manuel (tâche, validation d'Emilien)
- **Objet** : Confirmation de l'annulation de votre voyage {{offre}}

```text
Bonjour {{prenom}},

Nous confirmons l'annulation de votre voyage {{offre}} du {{date_depart}}, reçue le {{date_reception}}.

Conformément au barème de nos CGV, {{pourcentage_retenu}} % du prix est retenu, soit {{montant_retenu}} €. Nous vous remboursons {{montant_rembourse}} € sous 14 jours au plus tard.

Nous espérons vous retrouver très vite : vous continuerez à recevoir nos invitations aux événements ouverts à tous.

Emilien, direction administrative et financière, Solia
```
