// Types du domaine Solia. Les noms suivent le modèle de données du cahier des charges
// (docs/01-cahier-des-charges.md, section 6) : snake_case français.

/** Date sans heure, au format AAAA-MM-JJ. */
export type DateISO = string
/** Date et heure locales, au format AAAA-MM-JJTHH:MM. */
export type Horodatage = string

export type Cible = 'senior' | 'parent_solo' | 'celibataire'

export type Statut =
  | 'contact'
  | 'prospect'
  | 'devis_envoye'
  | 'reserve'
  | 'solde'
  | 'voyageur'
  | 'abonne'
  | 'ancien_abonne'
  | 'perdu'

export type Origine =
  | 'stand'
  | 'agence'
  | 'partenaire'
  | 'flyer_qr'
  | 'site'
  | 'reseau_social'
  | 'parrainage'
  | 'appel_entrant'

export type CanalPrefere = 'email' | 'whatsapp' | 'telephone' | 'sms'

export type Canal =
  | CanalPrefere
  | 'instagram'
  | 'facebook'
  | 'site'
  | 'agence'
  | 'stand'
  | 'google'
  | 'crm'

/** Champs techniques communs à toutes les tables. */
interface Ligne {
  id: string
  created_at?: string
  updated_at?: string
}

// ---------------------------------------------------------------------------
// Référentiels (lus dans data/*.json)
// ---------------------------------------------------------------------------

export interface MembreEquipe extends Ligne {
  prenom: string
  fonction: string
  cible_referente: Cible | null
  email: string
}

export interface Offre extends Ligne {
  nom: string
  cible: Cible
  destination: string
  pays: string
  jours: number
  nuits: number
  prix_ttc: number
  places_max: number
  transport: string
  hebergement: string
  a_verifier?: string
}

export interface Depart extends Ligne {
  offre_id: string
  offre: string
  cible: Cible
  date_depart: DateISO
  date_retour: DateISO
  prix_ttc: number
  places_max: number
  soliapero_brise_glace: Horodatage
  soliapero_retour: Horodatage
  echeance_solde: DateISO
  animatrice_id: string
}

export interface Activite extends Ligne {
  date: DateISO
  heure: string
  cible: Cible
  titre: string
  lieu: string
  capacite: number
  ouverte_a_tous: boolean
  animatrice_id: string
}

export interface ModeleMessage {
  code: string
  process: string
  nom: string
  canal: string
  declencheur: string
  delai: string
  expediteur: string
  envoi: string
  objet: string | null
  corps: string
}

// ---------------------------------------------------------------------------
// Données de la relation client
// ---------------------------------------------------------------------------

export interface Contact extends Ligne {
  prenom: string
  nom: string
  email: string | null
  telephone: string | null
  date_naissance: DateISO | null
  ville: string | null
  cible: Cible
  origine: Origine
  origine_detail: string | null
  parrain_id: string | null
  code_parrain: string | null
  canal_prefere: CanalPrefere
  statut: Statut
  referente_id: string
  envie_depart_id: string | null
  dispo_debut: DateISO | null
  dispo_fin: DateISO | null
  budget: number | null
  compte_social: string | null
  craintes: string | null
  contraintes: string | null
  notes: string | null
  motif_perte: string | null
  ambassadeur: boolean
  date_creation: Horodatage
}

export type TypeConsentement = 'newsletter' | 'whatsapp' | 'droit_image'

export interface Consentement extends Ligne {
  contact_id: string
  type: TypeConsentement
  valeur: boolean
  date: Horodatage
}

/**
 * Types d'événements du journal. Les premiers alimentent le score de conversion
 * (voir src/domain/criteres.ts) ; les suivants servent au journal et à la frise.
 */
export type TypeEvenement =
  // Profil et qualité de la fiche
  | 'creation'
  | 'origine'
  | 'coordonnee_verifiee'
  | 'coordonnee_invalide'
  | 'dates_confirmees'
  | 'budget_confirme'
  // Comportement (C4 à C20)
  | 'clic_bienvenue'
  | 'clic_newsletter'
  | 'interaction_sociale'
  | 'telechargement_programme'
  | 'demande_ecrite'
  | 'appel_entrant'
  | 'visite_agence'
  | 'reponse_relance'
  | 'rdv_accepte'
  | 'rdv_realise'
  | 'accord_devis'
  | 'relance_devis_aboutie'
  | 'question_modalites'
  | 'liste_attente'
  // Négatifs (N3 à N6)
  | 'rdv_non_honore'
  | 'devis_expire'
  | 'refus'
  // Journal sans points
  | 'reponse_personnelle'
  | 'statut'
  | 'appel_sortant'
  | 'note'
  | 'message_envoye'
  | 'devis_envoye'
  | 'reservation'
  | 'fiche_passation'
  | 'appel_bienvenue'
  | 'ajout_groupe'
  | 'solde'
  | 'mise_en_demeure'
  | 'presence_soliapero'
  | 'satisfaction_chaud'
  | 'enquete'
  | 'souscription'
  | 'resiliation'
  | 'parrainage'
  | 'reclamation'
  | 'avis'
  | 'annulation'
  | 'report'

export interface Evenement extends Ligne {
  contact_id: string
  date: Horodatage
  type: TypeEvenement
  /** Code du critère (P1 à E15, N1 à M5) ou null. Calculé par critereDeLEvenement. */
  code_critere: string | null
  canal: Canal | null
  process: string | null
  /** Membre de l'équipe, ou null si l'événement est automatique. */
  auteur_id: string | null
  details: Record<string, unknown>
  simule: boolean
}

export type StatutTache = 'a_faire' | 'fait' | 'annulee'

export interface Tache extends Ligne {
  contact_id: string | null
  depart_id: string | null
  activite_id: string | null
  regle_id: string
  cle_unicite: string
  titre: string
  process: string
  echeance: Horodatage
  responsable_id: string | null
  statut: StatutTache
  message_code: string | null
  fait_le: Horodatage | null
  fait_par: string | null
}

export interface MessageEnvoye extends Ligne {
  contact_id: string
  message_code: string
  canal: string
  date: Horodatage
  objet_rendu: string | null
  corps_rendu: string
  simule: true
}

export type StatutDevis = 'envoye' | 'accepte' | 'expire' | 'refuse'

export interface Devis extends Ligne {
  contact_id: string
  depart_id: string
  montant: number
  date_envoi: DateISO
  date_fin_validite: DateISO
  statut: StatutDevis
}

export type MoyenPaiement = 'carte' | 'virement' | 'cheque' | 'cheques_vacances'
export type StatutReservation = 'reservee' | 'soldee' | 'voyagee' | 'annulee'

export interface Reservation extends Ligne {
  contact_id: string
  depart_id: string
  date_reservation: DateISO
  acompte_montant: number
  acompte_date: DateISO
  moyen_paiement: MoyenPaiement
  solde_montant: number
  solde_echeance: DateISO
  solde_date: DateISO | null
  mise_en_demeure_date: DateISO | null
  /** R20 : le rappel automatique du solde peut être désactivé sur la fiche. */
  rappel_solde_auto: boolean
  appel_bienvenue_date: DateISO | null
  tentatives_appel: number
  /** Date d'ajout au groupe WhatsApp du voyage (E2 devient atteignable 7 jours après). */
  ajout_groupe_date: DateISO | null
  message_groupe_poste: boolean
  hesite_dates: boolean
  present_brise_glace: boolean | null
  binome: string | null
  opposition_image: boolean
  note_chaud: number | null
  incident_non_resolu: boolean
  partage_groupe: boolean
  present_retour: boolean | null
  album_remis: boolean | null
  statut: StatutReservation
  report_utilise: boolean
  depart_initial_id: string | null
  date_report: DateISO | null
  annulation_date: DateISO | null
  annulation_motif: string | null
  montant_retenu: number | null
  montant_rembourse: number | null
}

export interface FichePassation extends Ligne {
  reservation_id: string
  attentes: string | null
  craintes: string | null
  contraintes: string | null
  details_personnels: string | null
  remplie_le: DateISO | null
}

export interface ListeAttente extends Ligne {
  depart_id: string
  contact_id: string
  date: DateISO
}

export type DecisionAbonnement = 'abonne' | 'en_reflexion' | 'refus'

export interface Abonnement extends Ligne {
  contact_id: string
  formule: string
  decision: DecisionAbonnement
  date_decision: DateISO
  date_debut: DateISO | null
  date_fin: DateISO | null
  motif_resiliation: string | null
  motif_refus: string | null
}

export interface Participation extends Ligne {
  activite_id: string
  contact_id: string
  inscrit: boolean
  present: boolean | null
}

export interface Enquete extends Ligne {
  contact_id: string
  reservation_id: string | null
  type: 'voyage' | 'abonnement'
  nps: number | null
  notes_par_temps: Record<string, number>
  commentaire: string | null
  date: DateISO
  avis_google_publie: boolean
}

export interface Parrainage extends Ligne {
  parrain_id: string
  filleul_id: string
  recompense: string | null
  date_recompense: DateISO | null
}

export type MotifReclamation = 'hebergement' | 'transport' | 'programme' | 'animation' | 'facturation' | 'autre'

export interface Reclamation extends Ligne {
  contact_id: string
  reservation_id: string | null
  motif: MotifReclamation
  gravite: 'faible' | 'moyenne' | 'forte'
  ecrite: boolean
  description: string | null
  statut: 'ouverte' | 'en_cours' | 'resolue'
  date_ouverture: DateISO
  date_resolution: DateISO | null
  geste: string | null
  geste_valide_par: string | null
}

export interface Avis extends Ligne {
  contact_id: string
  plateforme: 'google' | 'facebook' | 'instagram'
  note: number
  texte: string | null
  date: DateISO
  reponse: string | null
  date_reponse: DateISO | null
  reclamation_id: string | null
}

export interface Parametres extends Ligne {
  date_reference: DateISO
}

/** L'ensemble des tables : c'est ce que charge un DataStore. */
export interface Base {
  version_seed: string
  equipe: MembreEquipe[]
  offres: Offre[]
  departs: Depart[]
  activites: Activite[]
  contacts: Contact[]
  consentements: Consentement[]
  evenements: Evenement[]
  taches: Tache[]
  messages_envoyes: MessageEnvoye[]
  devis: Devis[]
  reservations: Reservation[]
  fiches_passation: FichePassation[]
  liste_attente: ListeAttente[]
  abonnements: Abonnement[]
  participations: Participation[]
  enquetes: Enquete[]
  parrainages: Parrainage[]
  reclamations: Reclamation[]
  avis: Avis[]
  parametres: Parametres[]
}

/** Nom d'une table modifiable de la base. */
export type NomTable = Exclude<keyof Base, 'version_seed'>
