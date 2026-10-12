// Libellés affichés dans l'interface pour les valeurs codées.
import type { Canal, CanalPrefere, Cible, Origine, Statut, TypeEvenement } from './types'

export const LIBELLES_CIBLE: Record<Cible, string> = {
  senior: 'Senior',
  parent_solo: 'Parent solo',
  celibataire: 'Célibataire',
}

export const LIBELLES_STATUT: Record<Statut, string> = {
  contact: 'Contact',
  prospect: 'Prospect',
  devis_envoye: 'Devis envoyé',
  reserve: 'Réservé',
  solde: 'Soldé',
  voyageur: 'Voyageur',
  abonne: 'Abonné',
  ancien_abonne: 'Ancien abonné',
  perdu: 'Perdu',
}

/** Ordre des statuts (process 19), utilisé pour les filtres et le pipeline. */
export const ORDRE_STATUTS: Statut[] = [
  'contact',
  'prospect',
  'devis_envoye',
  'reserve',
  'solde',
  'voyageur',
  'abonne',
  'ancien_abonne',
  'perdu',
]

export const LIBELLES_ORIGINE: Record<Origine, string> = {
  stand: 'Stand',
  agence: 'Agence',
  partenaire: 'Partenaire',
  flyer_qr: 'Flyer QR code',
  site: 'Site',
  reseau_social: 'Réseau social',
  parrainage: 'Parrainage',
  appel_entrant: 'Appel entrant',
}

export const LIBELLES_CANAL_PREFERE: Record<CanalPrefere, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  telephone: 'Téléphone',
  sms: 'SMS',
}

/** Statuts pour lesquels on affiche le score de conversion (docs/01, section 5). */
export const STATUTS_CONVERSION: Statut[] = ['contact', 'prospect', 'devis_envoye', 'perdu']

/** Libellés des événements du journal. */
export const LIBELLES_EVENEMENT: Record<TypeEvenement, string> = {
  creation: 'Fiche créée',
  origine: 'Origine du contact',
  coordonnee_verifiee: 'Coordonnée vérifiée',
  coordonnee_invalide: 'Coordonnée invalide',
  dates_confirmees: 'Dates confirmées',
  budget_confirme: 'Budget confirmé',
  clic_bienvenue: 'Clic dans le message de bienvenue',
  clic_newsletter: 'Clic dans la newsletter',
  interaction_sociale: 'Commentaire ou DM',
  telechargement_programme: 'Programme téléchargé',
  demande_ecrite: 'Demande écrite',
  appel_entrant: 'Appel entrant',
  visite_agence: 'Visite à l\'agence',
  reponse_relance: 'Réponse à une relance',
  rdv_accepte: 'Rendez-vous découverte accepté',
  rdv_realise: 'Rendez-vous découverte réalisé',
  accord_devis: 'Accord pour un devis',
  relance_devis_aboutie: 'Relance du devis aboutie',
  question_modalites: 'Question sur les modalités',
  liste_attente: 'Inscription en liste d\'attente',
  rdv_non_honore: 'Rendez-vous non honoré',
  devis_expire: 'Devis expiré',
  refus: 'Refus',
  reponse_personnelle: 'Réponse personnelle',
  statut: 'Changement de statut',
  appel_sortant: 'Appel sortant',
  note: 'Note',
  message_envoye: 'Message envoyé',
  devis_envoye: 'Devis envoyé',
  reservation: 'Réservation (acompte)',
  fiche_passation: 'Fiche de passation remplie',
  appel_bienvenue: 'Appel de bienvenue',
  ajout_groupe: 'Ajout au groupe WhatsApp',
  solde: 'Solde encaissé',
  mise_en_demeure: 'Mise en demeure',
  presence_soliapero: 'Soli\'apéro',
  satisfaction_chaud: 'Satisfaction à chaud',
  enquete: 'Enquête de satisfaction',
  souscription: 'Souscription à l\'abonnement',
  resiliation: 'Résiliation',
  parrainage: 'Parrainage',
  reclamation: 'Réclamation',
  avis: 'Avis publié',
  annulation: 'Annulation',
  report: 'Report',
}

/** Libellé précis d'un événement, avec son détail quand il aide à la lecture. */
export function libelleEvenement(evenement: { type: TypeEvenement; details: Record<string, unknown> }): string {
  const d = evenement.details
  switch (evenement.type) {
    case 'statut':
      return `Passage en ${LIBELLES_STATUT[d.vers as Statut] ?? String(d.vers)}`
    case 'presence_soliapero':
      return `Soli'apéro ${d.moment === 'retour' ? 'retour' : 'brise-glace'} (${d.present ? 'présent' : 'absent'})`
    case 'origine':
      return `Origine : ${LIBELLES_ORIGINE[d.origine as Origine] ?? String(d.origine)}`
    case 'satisfaction_chaud':
      return `Satisfaction à chaud : ${String(d.note)}/10`
    case 'enquete':
      return `Enquête de satisfaction : ${String(d.nps)}/10`
    default:
      return LIBELLES_EVENEMENT[evenement.type]
  }
}

export const LIBELLES_CANAL: Record<Canal, string> = {
  email: 'e-mail',
  whatsapp: 'WhatsApp',
  telephone: 'téléphone',
  sms: 'SMS',
  instagram: 'Instagram',
  facebook: 'Facebook',
  site: 'site',
  agence: 'agence',
  stand: 'stand',
  google: 'Google',
  crm: 'CRM',
}
