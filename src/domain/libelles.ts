// Libellés affichés dans l'interface pour les valeurs codées.
import type { CanalPrefere, Cible, Origine, Statut } from './types'

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
