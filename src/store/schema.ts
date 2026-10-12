// Description des tables, source unique du schéma SQL (supabase/migrations/001_schema.sql),
// du jeu de démo SQL (supabase/seed.sql) et des conversions de SupabaseStore.
// Les champs suivent src/domain/types.ts ; un test vérifie que chaque ligne du seed y correspond.
import type { NomTable } from '../domain/types'

export type TypeColonne = 'texte' | 'entier' | 'nombre' | 'booleen' | 'date' | 'horodatage' | 'json'

export interface DescriptionTable {
  colonnes: Record<string, TypeColonne>
  /** Colonnes indexées pour les recherches fréquentes. */
  index?: string[]
  /** Colonnes uniques (plusieurs valeurs vides restent possibles). */
  uniques?: string[]
}

export const TYPES_SQL: Record<TypeColonne, string> = {
  texte: 'text',
  entier: 'integer',
  nombre: 'numeric',
  booleen: 'boolean',
  date: 'date',
  horodatage: 'timestamp',
  json: 'jsonb',
}

/** Ordre d'insertion : référentiels, puis contacts, puis ce qui en dépend ; parametres en dernier (marque d'installation). */
export const SCHEMA: Record<NomTable, DescriptionTable> = {
  equipe: {
    colonnes: { prenom: 'texte', fonction: 'texte', cible_referente: 'texte', email: 'texte' },
  },
  offres: {
    colonnes: {
      nom: 'texte',
      cible: 'texte',
      destination: 'texte',
      pays: 'texte',
      jours: 'entier',
      nuits: 'entier',
      prix_ttc: 'nombre',
      places_max: 'entier',
      transport: 'texte',
      hebergement: 'texte',
      a_verifier: 'texte',
    },
  },
  departs: {
    colonnes: {
      offre_id: 'texte',
      offre: 'texte',
      cible: 'texte',
      date_depart: 'date',
      date_retour: 'date',
      prix_ttc: 'nombre',
      places_max: 'entier',
      soliapero_brise_glace: 'horodatage',
      soliapero_retour: 'horodatage',
      echeance_solde: 'date',
      animatrice_id: 'texte',
    },
  },
  activites: {
    colonnes: {
      date: 'date',
      heure: 'texte',
      cible: 'texte',
      titre: 'texte',
      lieu: 'texte',
      capacite: 'entier',
      ouverte_a_tous: 'booleen',
      animatrice_id: 'texte',
    },
  },
  contacts: {
    colonnes: {
      prenom: 'texte',
      nom: 'texte',
      email: 'texte',
      telephone: 'texte',
      date_naissance: 'date',
      ville: 'texte',
      cible: 'texte',
      origine: 'texte',
      origine_detail: 'texte',
      parrain_id: 'texte',
      code_parrain: 'texte',
      canal_prefere: 'texte',
      statut: 'texte',
      referente_id: 'texte',
      envie_depart_id: 'texte',
      dispo_debut: 'date',
      dispo_fin: 'date',
      budget: 'nombre',
      compte_social: 'texte',
      craintes: 'texte',
      contraintes: 'texte',
      notes: 'texte',
      motif_perte: 'texte',
      ambassadeur: 'booleen',
      date_creation: 'horodatage',
    },
    index: ['statut', 'referente_id'],
    uniques: ['code_parrain'],
  },
  consentements: {
    colonnes: { contact_id: 'texte', type: 'texte', valeur: 'booleen', date: 'horodatage' },
    index: ['contact_id'],
  },
  evenements: {
    colonnes: {
      contact_id: 'texte',
      date: 'horodatage',
      type: 'texte',
      code_critere: 'texte',
      canal: 'texte',
      process: 'texte',
      auteur_id: 'texte',
      details: 'json',
      simule: 'booleen',
    },
    index: ['contact_id', 'date'],
  },
  taches: {
    colonnes: {
      contact_id: 'texte',
      depart_id: 'texte',
      activite_id: 'texte',
      reservation_id: 'texte',
      regle_id: 'texte',
      cle_unicite: 'texte',
      titre: 'texte',
      process: 'texte',
      date_declenchement: 'horodatage',
      echeance: 'horodatage',
      responsable_id: 'texte',
      statut: 'texte',
      message_code: 'texte',
      action_id: 'texte',
      fait_le: 'horodatage',
      fait_par: 'texte',
      annulee_le: 'horodatage',
      motif_annulation: 'texte',
    },
    index: ['contact_id', 'responsable_id'],
    uniques: ['cle_unicite'],
  },
  messages_envoyes: {
    colonnes: {
      contact_id: 'texte',
      message_code: 'texte',
      canal: 'texte',
      expediteur: 'texte',
      date: 'horodatage',
      objet_rendu: 'texte',
      corps_rendu: 'texte',
      simule: 'booleen',
      regle_id: 'texte',
      tache_id: 'texte',
      cle_unicite: 'texte',
    },
    index: ['contact_id'],
    uniques: ['cle_unicite'],
  },
  devis: {
    colonnes: {
      contact_id: 'texte',
      depart_id: 'texte',
      montant: 'nombre',
      date_envoi: 'date',
      date_fin_validite: 'date',
      statut: 'texte',
    },
    index: ['contact_id'],
  },
  reservations: {
    colonnes: {
      contact_id: 'texte',
      depart_id: 'texte',
      date_reservation: 'date',
      acompte_montant: 'nombre',
      acompte_date: 'date',
      moyen_paiement: 'texte',
      solde_montant: 'nombre',
      solde_echeance: 'date',
      solde_date: 'date',
      mise_en_demeure_date: 'date',
      rappel_solde_auto: 'booleen',
      appel_bienvenue_date: 'date',
      tentatives_appel: 'entier',
      ajout_groupe_date: 'date',
      message_groupe_poste: 'booleen',
      hesite_dates: 'booleen',
      brise_glace_confirme_le: 'date',
      present_brise_glace: 'booleen',
      binome: 'texte',
      opposition_image: 'booleen',
      note_chaud: 'entier',
      incident_non_resolu: 'booleen',
      partage_groupe: 'booleen',
      retour_confirme_le: 'date',
      present_retour: 'booleen',
      album_remis: 'booleen',
      statut: 'texte',
      report_utilise: 'booleen',
      depart_initial_id: 'texte',
      date_report: 'date',
      annulation_date: 'date',
      annulation_motif: 'texte',
      montant_retenu: 'nombre',
      montant_rembourse: 'nombre',
    },
    index: ['contact_id', 'depart_id'],
  },
  fiches_passation: {
    colonnes: {
      reservation_id: 'texte',
      attentes: 'texte',
      craintes: 'texte',
      contraintes: 'texte',
      details_personnels: 'texte',
      remplie_le: 'date',
    },
    index: ['reservation_id'],
  },
  liste_attente: {
    colonnes: { depart_id: 'texte', contact_id: 'texte', date: 'date' },
  },
  abonnements: {
    colonnes: {
      contact_id: 'texte',
      formule: 'texte',
      decision: 'texte',
      date_decision: 'date',
      date_debut: 'date',
      date_fin: 'date',
      motif_resiliation: 'texte',
      motif_refus: 'texte',
    },
    index: ['contact_id'],
  },
  participations: {
    colonnes: { activite_id: 'texte', contact_id: 'texte', inscrit: 'booleen', present: 'booleen' },
    index: ['contact_id'],
  },
  enquetes: {
    colonnes: {
      contact_id: 'texte',
      reservation_id: 'texte',
      type: 'texte',
      nps: 'entier',
      notes_par_temps: 'json',
      commentaire: 'texte',
      date: 'date',
      avis_google_publie: 'booleen',
    },
    index: ['contact_id'],
  },
  parrainages: {
    colonnes: { parrain_id: 'texte', filleul_id: 'texte', recompense: 'texte', date_recompense: 'date' },
  },
  reclamations: {
    colonnes: {
      contact_id: 'texte',
      reservation_id: 'texte',
      motif: 'texte',
      gravite: 'texte',
      ecrite: 'booleen',
      description: 'texte',
      statut: 'texte',
      date_ouverture: 'date',
      date_resolution: 'date',
      geste: 'texte',
      geste_valide_par: 'texte',
    },
  },
  avis: {
    colonnes: {
      contact_id: 'texte',
      plateforme: 'texte',
      note: 'entier',
      texte: 'texte',
      date: 'date',
      reponse: 'texte',
      date_reponse: 'date',
      reclamation_id: 'texte',
    },
  },
  parametres: {
    colonnes: { date_reference: 'date', version_seed: 'texte' },
  },
}

export const NOMS_TABLES = Object.keys(SCHEMA) as NomTable[]

/** Colonnes communes à toutes les tables, remplies par la base si elles manquent. */
export const COLONNES_TECHNIQUES = ['id', 'created_at', 'updated_at']
