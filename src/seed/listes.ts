// Listes servant à générer les contacts fictifs. Les prénoms et noms des personas
// (Marc Leroy, Monique Bernard, Sarah Martin, Julie Petit, Jacqueline Morel, Thomas Garnier)
// sont exclus pour éviter toute confusion pendant la démo.
import type { Cible } from '../domain/types'

export const PRENOMS: Record<Cible, { femmes: string[]; hommes: string[]; partFemmes: number }> = {
  senior: {
    femmes: [
      'Françoise', 'Christiane', 'Josiane', 'Annie', 'Danielle', 'Michèle', 'Nicole', 'Martine', 'Colette',
      'Simone', 'Odile', 'Huguette', 'Brigitte', 'Chantal', 'Marie-Claude', 'Bernadette', 'Yvette', 'Gisèle',
      'Évelyne', 'Jeanine', 'Paulette', 'Arlette', 'Régine', 'Lucienne', 'Ginette',
    ],
    hommes: [
      'Michel', 'Gérard', 'Alain', 'Jean-Pierre', 'Daniel', 'Claude', 'René', 'Jacques', 'Roger', 'André',
      'Guy', 'Yves', 'Patrick', 'Gilbert', 'Serge', 'Henri', 'Maurice', 'Jean-Claude', 'Pierre', 'Raymond',
    ],
    partFemmes: 0.65,
  },
  parent_solo: {
    femmes: [
      'Aurélie', 'Émilie', 'Céline', 'Stéphanie', 'Sandrine', 'Virginie', 'Laetitia', 'Élodie', 'Audrey',
      'Nathalie', 'Caroline', 'Mélanie', 'Delphine', 'Karine', 'Sophie', 'Anne-Laure', 'Marion', 'Vanessa',
      'Amélie', 'Gaëlle', 'Hélène', 'Jessica',
    ],
    hommes: ['Nicolas', 'Julien', 'Sébastien', 'Mathieu', 'Guillaume', 'Romain', 'Jérôme', 'Cédric', 'Fabien', 'Olivier', 'Arnaud', 'Damien'],
    partFemmes: 0.75,
  },
  celibataire: {
    femmes: [
      'Camille', 'Léa', 'Manon', 'Chloé', 'Pauline', 'Marine', 'Justine', 'Lucie', 'Charlotte', 'Clara',
      'Margaux', 'Laura', 'Anaïs', 'Inès', 'Morgane', 'Océane', 'Jade', 'Lisa', 'Elsa', 'Noémie',
    ],
    hommes: [
      'Antoine', 'Maxime', 'Lucas', 'Hugo', 'Alexandre', 'Kevin', 'Benjamin', 'Valentin', 'Quentin', 'Florian',
      'Adrien', 'Baptiste', 'Jordan', 'Théo', 'Clément', 'Pierre-Louis', 'Yanis', 'Bastien',
    ],
    partFemmes: 0.55,
  },
}

export const NOMS = [
  'Bonnin', 'Rabaud', 'Gautier', 'Brochard', 'Jaunet', 'Gaborit', 'Chauvet', 'Boisseau', 'Charrier', 'Guérin',
  'Rondeau', 'Pineau', 'Robin', 'Hervouet', 'Bouron', 'Arnaud', 'Blanchard', 'Cougnon', 'Fradet', 'Grollier',
  'Martineau', 'Ménard', 'Ouvrard', 'Perraudeau', 'Renaud', 'Sicard', 'Tessier', 'Vrignaud', 'Barreau', 'Coutant',
  'Douillard', 'Joly', 'Lucas', 'Marchand', 'Noël', 'Poirier', 'Rivière', 'Texier', 'Morin', 'Dupont',
  'Lambert', 'Fontaine', 'Chevalier', 'Girard', 'Mercier', 'Bonnet', 'Faure', 'Roux', 'Simon', 'Laurent',
  'Moreau', 'Durand', 'Dubois', 'Lefebvre', 'Leclerc', 'Picard', 'Caillaud', 'Vallet', 'Bodin', 'Huet',
  'Mainguy', 'Raffin', 'Soulard', 'Thibaud', 'Audureau', 'Billaud', 'Cantin', 'Drouet',
]

/** Villes de Vendée et de Loire-Atlantique, pondérées. */
export const VILLES: readonly (readonly [string, number])[] = [
  ['La Roche-sur-Yon', 18],
  ['Les Sables-d\'Olonne', 9],
  ['Nantes', 12],
  ['Challans', 6],
  ['Montaigu-Vendée', 6],
  ['Luçon', 4],
  ['Fontenay-le-Comte', 4],
  ['Saint-Nazaire', 4],
  ['Les Herbiers', 5],
  ['Saint-Gilles-Croix-de-Vie', 4],
  ['Aizenay', 3],
  ['Pornic', 3],
  ['Rezé', 3],
  ['Saint-Hilaire-de-Riez', 3],
  ['Chantonnay', 3],
  ['Pouzauges', 2],
  ['Saint-Herblain', 2],
  ['Clisson', 2],
  ['Talmont-Saint-Hilaire', 3],
]

export const AGES: Record<Cible, [number, number]> = {
  senior: [62, 79],
  parent_solo: [29, 50],
  celibataire: [26, 45],
}

export const PART_WHATSAPP: Record<Cible, number> = { senior: 0.4, parent_solo: 0.8, celibataire: 0.85 }

export const ORIGINES = {
  senior: [['stand', 30], ['agence', 25], ['partenaire', 15], ['appel_entrant', 20], ['flyer_qr', 5], ['site', 5]],
  parent_solo: [['site', 30], ['reseau_social', 25], ['flyer_qr', 15], ['stand', 15], ['agence', 10], ['partenaire', 5]],
  celibataire: [['flyer_qr', 30], ['reseau_social', 25], ['site', 20], ['stand', 15], ['agence', 10]],
} as const

export const ATTENTES: Record<Cible, string[]> = {
  senior: [
    'Découvrir la destination sans se soucier de l\'organisation',
    'Rencontrer des personnes de son âge',
    'Un rythme tranquille avec des visites culturelles',
    'Sortir de la maison et partager des moments',
  ],
  parent_solo: [
    'Un séjour serein avec son enfant',
    'Rencontrer d\'autres parents solos',
    'Souffler un peu et partager',
    'Des activités pour les enfants et du temps pour soi',
  ],
  celibataire: [
    'Rencontrer du monde',
    'Visiter et faire la fête en groupe',
    'Sortir de la routine',
    'Partir sans tout organiser seul',
  ],
}

export const CRAINTES: Record<Cible, string[]> = {
  senior: ['Ne connaître personne', 'Le rythme des visites', 'La marche prolongée', 'Partager une chambre'],
  parent_solo: ['Que l\'enfant ne s\'adapte pas au groupe', 'Ne connaître personne', 'Le budget', 'La fatigue du trajet'],
  celibataire: ['Ne connaître personne', 'Être le seul de sa tranche d\'âge', 'Partager une chambre', 'Un groupe trop calme'],
}

export const CONTRAINTES = [
  'Aucune',
  'Aucune',
  'Aucune',
  'Régime végétarien',
  'Sans gluten',
  'Allergie aux fruits à coque',
  'Difficultés à marcher longtemps',
  'Chambre au rez-de-chaussée si possible',
]

export const DETAILS_PERSONNELS = [
  'Aime la photographie',
  'Passionné(e) de jardinage',
  'Ancien(ne) professeur(e) d\'histoire',
  'Adore la randonnée',
  'Joue de la guitare',
  'Aime cuisiner pour les autres',
  'Bénévole dans une association',
  'Grand(e) lecteur(rice) de romans policiers',
  'Fan de danse',
  'Passionné(e) de voile',
]

export const MOTIFS_REFUS_ABONNEMENT = ['Budget', 'Manque de temps', 'Distance', 'Préfère seulement voyager', 'Pas intéressé(e) par les activités']

export const TEXTES_AVIS_POSITIFS = [
  'On part seul et on revient avec des amis. Merci à toute l\'équipe !',
  'Organisation parfaite, groupe adorable, je recommande les yeux fermés.',
  'Le Soli\'apéro avant le départ change tout : on arrive déjà en confiance.',
  'Accompagnement aux petits soins du début à la fin.',
  'Une animatrice formidable et des souvenirs plein la tête.',
]
