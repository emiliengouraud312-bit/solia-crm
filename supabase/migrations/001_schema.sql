-- Schéma du CRM Solia. Généré par `npm run seed` depuis src/store/schema.ts : ne pas modifier à la main.
-- Rejouable : à coller dans l'éditeur SQL de Supabase (SQL Editor), puis « Run ». Aucune donnée n'est effacée.
-- Sécurité (RLS) : toute personne connectée lit et écrit toutes les tables ; sans connexion, rien n'est accessible.

-- equipe
create table if not exists public.equipe (id text primary key);
alter table public.equipe add column if not exists prenom text;
alter table public.equipe add column if not exists fonction text;
alter table public.equipe add column if not exists cible_referente text;
alter table public.equipe add column if not exists email text;
alter table public.equipe add column if not exists created_at timestamptz not null default now();
alter table public.equipe add column if not exists updated_at timestamptz not null default now();
alter table public.equipe enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.equipe;
create policy "Équipe connectée : lecture et écriture" on public.equipe for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.equipe to authenticated;

-- offres
create table if not exists public.offres (id text primary key);
alter table public.offres add column if not exists nom text;
alter table public.offres add column if not exists cible text;
alter table public.offres add column if not exists destination text;
alter table public.offres add column if not exists pays text;
alter table public.offres add column if not exists jours integer;
alter table public.offres add column if not exists nuits integer;
alter table public.offres add column if not exists prix_ttc numeric;
alter table public.offres add column if not exists places_max integer;
alter table public.offres add column if not exists transport text;
alter table public.offres add column if not exists hebergement text;
alter table public.offres add column if not exists a_verifier text;
alter table public.offres add column if not exists created_at timestamptz not null default now();
alter table public.offres add column if not exists updated_at timestamptz not null default now();
alter table public.offres enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.offres;
create policy "Équipe connectée : lecture et écriture" on public.offres for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.offres to authenticated;

-- departs
create table if not exists public.departs (id text primary key);
alter table public.departs add column if not exists offre_id text;
alter table public.departs add column if not exists offre text;
alter table public.departs add column if not exists cible text;
alter table public.departs add column if not exists date_depart date;
alter table public.departs add column if not exists date_retour date;
alter table public.departs add column if not exists prix_ttc numeric;
alter table public.departs add column if not exists places_max integer;
alter table public.departs add column if not exists soliapero_brise_glace timestamp;
alter table public.departs add column if not exists soliapero_retour timestamp;
alter table public.departs add column if not exists echeance_solde date;
alter table public.departs add column if not exists animatrice_id text;
alter table public.departs add column if not exists created_at timestamptz not null default now();
alter table public.departs add column if not exists updated_at timestamptz not null default now();
alter table public.departs enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.departs;
create policy "Équipe connectée : lecture et écriture" on public.departs for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.departs to authenticated;

-- activites
create table if not exists public.activites (id text primary key);
alter table public.activites add column if not exists date date;
alter table public.activites add column if not exists heure text;
alter table public.activites add column if not exists cible text;
alter table public.activites add column if not exists titre text;
alter table public.activites add column if not exists lieu text;
alter table public.activites add column if not exists capacite integer;
alter table public.activites add column if not exists ouverte_a_tous boolean;
alter table public.activites add column if not exists animatrice_id text;
alter table public.activites add column if not exists created_at timestamptz not null default now();
alter table public.activites add column if not exists updated_at timestamptz not null default now();
alter table public.activites enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.activites;
create policy "Équipe connectée : lecture et écriture" on public.activites for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.activites to authenticated;

-- contacts
create table if not exists public.contacts (id text primary key);
alter table public.contacts add column if not exists prenom text;
alter table public.contacts add column if not exists nom text;
alter table public.contacts add column if not exists email text;
alter table public.contacts add column if not exists telephone text;
alter table public.contacts add column if not exists date_naissance date;
alter table public.contacts add column if not exists ville text;
alter table public.contacts add column if not exists cible text;
alter table public.contacts add column if not exists origine text;
alter table public.contacts add column if not exists origine_detail text;
alter table public.contacts add column if not exists parrain_id text;
alter table public.contacts add column if not exists code_parrain text;
alter table public.contacts add column if not exists canal_prefere text;
alter table public.contacts add column if not exists statut text;
alter table public.contacts add column if not exists referente_id text;
alter table public.contacts add column if not exists envie_depart_id text;
alter table public.contacts add column if not exists dispo_debut date;
alter table public.contacts add column if not exists dispo_fin date;
alter table public.contacts add column if not exists budget numeric;
alter table public.contacts add column if not exists compte_social text;
alter table public.contacts add column if not exists craintes text;
alter table public.contacts add column if not exists contraintes text;
alter table public.contacts add column if not exists notes text;
alter table public.contacts add column if not exists motif_perte text;
alter table public.contacts add column if not exists ambassadeur boolean;
alter table public.contacts add column if not exists date_creation timestamp;
alter table public.contacts add column if not exists created_at timestamptz not null default now();
alter table public.contacts add column if not exists updated_at timestamptz not null default now();
create unique index if not exists contacts_code_parrain_unique on public.contacts (code_parrain);
create index if not exists contacts_statut_index on public.contacts (statut);
create index if not exists contacts_referente_id_index on public.contacts (referente_id);
alter table public.contacts enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.contacts;
create policy "Équipe connectée : lecture et écriture" on public.contacts for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.contacts to authenticated;

-- consentements
create table if not exists public.consentements (id text primary key);
alter table public.consentements add column if not exists contact_id text;
alter table public.consentements add column if not exists type text;
alter table public.consentements add column if not exists valeur boolean;
alter table public.consentements add column if not exists date timestamp;
alter table public.consentements add column if not exists created_at timestamptz not null default now();
alter table public.consentements add column if not exists updated_at timestamptz not null default now();
create index if not exists consentements_contact_id_index on public.consentements (contact_id);
alter table public.consentements enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.consentements;
create policy "Équipe connectée : lecture et écriture" on public.consentements for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.consentements to authenticated;

-- evenements
create table if not exists public.evenements (id text primary key);
alter table public.evenements add column if not exists contact_id text;
alter table public.evenements add column if not exists date timestamp;
alter table public.evenements add column if not exists type text;
alter table public.evenements add column if not exists code_critere text;
alter table public.evenements add column if not exists canal text;
alter table public.evenements add column if not exists process text;
alter table public.evenements add column if not exists auteur_id text;
alter table public.evenements add column if not exists details jsonb;
alter table public.evenements add column if not exists simule boolean;
alter table public.evenements add column if not exists created_at timestamptz not null default now();
alter table public.evenements add column if not exists updated_at timestamptz not null default now();
create index if not exists evenements_contact_id_index on public.evenements (contact_id);
create index if not exists evenements_date_index on public.evenements (date);
alter table public.evenements enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.evenements;
create policy "Équipe connectée : lecture et écriture" on public.evenements for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.evenements to authenticated;

-- taches
create table if not exists public.taches (id text primary key);
alter table public.taches add column if not exists contact_id text;
alter table public.taches add column if not exists depart_id text;
alter table public.taches add column if not exists activite_id text;
alter table public.taches add column if not exists reservation_id text;
alter table public.taches add column if not exists regle_id text;
alter table public.taches add column if not exists cle_unicite text;
alter table public.taches add column if not exists titre text;
alter table public.taches add column if not exists process text;
alter table public.taches add column if not exists date_declenchement timestamp;
alter table public.taches add column if not exists echeance timestamp;
alter table public.taches add column if not exists responsable_id text;
alter table public.taches add column if not exists statut text;
alter table public.taches add column if not exists message_code text;
alter table public.taches add column if not exists action_id text;
alter table public.taches add column if not exists fait_le timestamp;
alter table public.taches add column if not exists fait_par text;
alter table public.taches add column if not exists annulee_le timestamp;
alter table public.taches add column if not exists motif_annulation text;
alter table public.taches add column if not exists created_at timestamptz not null default now();
alter table public.taches add column if not exists updated_at timestamptz not null default now();
create unique index if not exists taches_cle_unicite_unique on public.taches (cle_unicite);
create index if not exists taches_contact_id_index on public.taches (contact_id);
create index if not exists taches_responsable_id_index on public.taches (responsable_id);
alter table public.taches enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.taches;
create policy "Équipe connectée : lecture et écriture" on public.taches for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.taches to authenticated;

-- messages_envoyes
create table if not exists public.messages_envoyes (id text primary key);
alter table public.messages_envoyes add column if not exists contact_id text;
alter table public.messages_envoyes add column if not exists message_code text;
alter table public.messages_envoyes add column if not exists canal text;
alter table public.messages_envoyes add column if not exists expediteur text;
alter table public.messages_envoyes add column if not exists date timestamp;
alter table public.messages_envoyes add column if not exists objet_rendu text;
alter table public.messages_envoyes add column if not exists corps_rendu text;
alter table public.messages_envoyes add column if not exists simule boolean;
alter table public.messages_envoyes add column if not exists regle_id text;
alter table public.messages_envoyes add column if not exists tache_id text;
alter table public.messages_envoyes add column if not exists cle_unicite text;
alter table public.messages_envoyes add column if not exists created_at timestamptz not null default now();
alter table public.messages_envoyes add column if not exists updated_at timestamptz not null default now();
create unique index if not exists messages_envoyes_cle_unicite_unique on public.messages_envoyes (cle_unicite);
create index if not exists messages_envoyes_contact_id_index on public.messages_envoyes (contact_id);
alter table public.messages_envoyes enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.messages_envoyes;
create policy "Équipe connectée : lecture et écriture" on public.messages_envoyes for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.messages_envoyes to authenticated;

-- devis
create table if not exists public.devis (id text primary key);
alter table public.devis add column if not exists contact_id text;
alter table public.devis add column if not exists depart_id text;
alter table public.devis add column if not exists montant numeric;
alter table public.devis add column if not exists date_envoi date;
alter table public.devis add column if not exists date_fin_validite date;
alter table public.devis add column if not exists statut text;
alter table public.devis add column if not exists created_at timestamptz not null default now();
alter table public.devis add column if not exists updated_at timestamptz not null default now();
create index if not exists devis_contact_id_index on public.devis (contact_id);
alter table public.devis enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.devis;
create policy "Équipe connectée : lecture et écriture" on public.devis for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.devis to authenticated;

-- reservations
create table if not exists public.reservations (id text primary key);
alter table public.reservations add column if not exists contact_id text;
alter table public.reservations add column if not exists depart_id text;
alter table public.reservations add column if not exists date_reservation date;
alter table public.reservations add column if not exists acompte_montant numeric;
alter table public.reservations add column if not exists acompte_date date;
alter table public.reservations add column if not exists moyen_paiement text;
alter table public.reservations add column if not exists solde_montant numeric;
alter table public.reservations add column if not exists solde_echeance date;
alter table public.reservations add column if not exists solde_date date;
alter table public.reservations add column if not exists mise_en_demeure_date date;
alter table public.reservations add column if not exists rappel_solde_auto boolean;
alter table public.reservations add column if not exists appel_bienvenue_date date;
alter table public.reservations add column if not exists tentatives_appel integer;
alter table public.reservations add column if not exists ajout_groupe_date date;
alter table public.reservations add column if not exists message_groupe_poste boolean;
alter table public.reservations add column if not exists hesite_dates boolean;
alter table public.reservations add column if not exists brise_glace_confirme_le date;
alter table public.reservations add column if not exists present_brise_glace boolean;
alter table public.reservations add column if not exists binome text;
alter table public.reservations add column if not exists opposition_image boolean;
alter table public.reservations add column if not exists note_chaud integer;
alter table public.reservations add column if not exists incident_non_resolu boolean;
alter table public.reservations add column if not exists partage_groupe boolean;
alter table public.reservations add column if not exists retour_confirme_le date;
alter table public.reservations add column if not exists present_retour boolean;
alter table public.reservations add column if not exists album_remis boolean;
alter table public.reservations add column if not exists statut text;
alter table public.reservations add column if not exists report_utilise boolean;
alter table public.reservations add column if not exists depart_initial_id text;
alter table public.reservations add column if not exists date_report date;
alter table public.reservations add column if not exists annulation_date date;
alter table public.reservations add column if not exists annulation_motif text;
alter table public.reservations add column if not exists montant_retenu numeric;
alter table public.reservations add column if not exists montant_rembourse numeric;
alter table public.reservations add column if not exists created_at timestamptz not null default now();
alter table public.reservations add column if not exists updated_at timestamptz not null default now();
create index if not exists reservations_contact_id_index on public.reservations (contact_id);
create index if not exists reservations_depart_id_index on public.reservations (depart_id);
alter table public.reservations enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.reservations;
create policy "Équipe connectée : lecture et écriture" on public.reservations for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.reservations to authenticated;

-- fiches_passation
create table if not exists public.fiches_passation (id text primary key);
alter table public.fiches_passation add column if not exists reservation_id text;
alter table public.fiches_passation add column if not exists attentes text;
alter table public.fiches_passation add column if not exists craintes text;
alter table public.fiches_passation add column if not exists contraintes text;
alter table public.fiches_passation add column if not exists details_personnels text;
alter table public.fiches_passation add column if not exists remplie_le date;
alter table public.fiches_passation add column if not exists created_at timestamptz not null default now();
alter table public.fiches_passation add column if not exists updated_at timestamptz not null default now();
create index if not exists fiches_passation_reservation_id_index on public.fiches_passation (reservation_id);
alter table public.fiches_passation enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.fiches_passation;
create policy "Équipe connectée : lecture et écriture" on public.fiches_passation for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.fiches_passation to authenticated;

-- liste_attente
create table if not exists public.liste_attente (id text primary key);
alter table public.liste_attente add column if not exists depart_id text;
alter table public.liste_attente add column if not exists contact_id text;
alter table public.liste_attente add column if not exists date date;
alter table public.liste_attente add column if not exists created_at timestamptz not null default now();
alter table public.liste_attente add column if not exists updated_at timestamptz not null default now();
alter table public.liste_attente enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.liste_attente;
create policy "Équipe connectée : lecture et écriture" on public.liste_attente for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.liste_attente to authenticated;

-- abonnements
create table if not exists public.abonnements (id text primary key);
alter table public.abonnements add column if not exists contact_id text;
alter table public.abonnements add column if not exists formule text;
alter table public.abonnements add column if not exists decision text;
alter table public.abonnements add column if not exists date_decision date;
alter table public.abonnements add column if not exists date_debut date;
alter table public.abonnements add column if not exists date_fin date;
alter table public.abonnements add column if not exists motif_resiliation text;
alter table public.abonnements add column if not exists motif_refus text;
alter table public.abonnements add column if not exists created_at timestamptz not null default now();
alter table public.abonnements add column if not exists updated_at timestamptz not null default now();
create index if not exists abonnements_contact_id_index on public.abonnements (contact_id);
alter table public.abonnements enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.abonnements;
create policy "Équipe connectée : lecture et écriture" on public.abonnements for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.abonnements to authenticated;

-- participations
create table if not exists public.participations (id text primary key);
alter table public.participations add column if not exists activite_id text;
alter table public.participations add column if not exists contact_id text;
alter table public.participations add column if not exists inscrit boolean;
alter table public.participations add column if not exists present boolean;
alter table public.participations add column if not exists created_at timestamptz not null default now();
alter table public.participations add column if not exists updated_at timestamptz not null default now();
create index if not exists participations_contact_id_index on public.participations (contact_id);
alter table public.participations enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.participations;
create policy "Équipe connectée : lecture et écriture" on public.participations for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.participations to authenticated;

-- enquetes
create table if not exists public.enquetes (id text primary key);
alter table public.enquetes add column if not exists contact_id text;
alter table public.enquetes add column if not exists reservation_id text;
alter table public.enquetes add column if not exists type text;
alter table public.enquetes add column if not exists nps integer;
alter table public.enquetes add column if not exists notes_par_temps jsonb;
alter table public.enquetes add column if not exists commentaire text;
alter table public.enquetes add column if not exists date date;
alter table public.enquetes add column if not exists avis_google_publie boolean;
alter table public.enquetes add column if not exists created_at timestamptz not null default now();
alter table public.enquetes add column if not exists updated_at timestamptz not null default now();
create index if not exists enquetes_contact_id_index on public.enquetes (contact_id);
alter table public.enquetes enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.enquetes;
create policy "Équipe connectée : lecture et écriture" on public.enquetes for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.enquetes to authenticated;

-- parrainages
create table if not exists public.parrainages (id text primary key);
alter table public.parrainages add column if not exists parrain_id text;
alter table public.parrainages add column if not exists filleul_id text;
alter table public.parrainages add column if not exists recompense text;
alter table public.parrainages add column if not exists date_recompense date;
alter table public.parrainages add column if not exists created_at timestamptz not null default now();
alter table public.parrainages add column if not exists updated_at timestamptz not null default now();
alter table public.parrainages enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.parrainages;
create policy "Équipe connectée : lecture et écriture" on public.parrainages for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.parrainages to authenticated;

-- reclamations
create table if not exists public.reclamations (id text primary key);
alter table public.reclamations add column if not exists contact_id text;
alter table public.reclamations add column if not exists reservation_id text;
alter table public.reclamations add column if not exists motif text;
alter table public.reclamations add column if not exists gravite text;
alter table public.reclamations add column if not exists ecrite boolean;
alter table public.reclamations add column if not exists description text;
alter table public.reclamations add column if not exists statut text;
alter table public.reclamations add column if not exists date_ouverture date;
alter table public.reclamations add column if not exists date_resolution date;
alter table public.reclamations add column if not exists geste text;
alter table public.reclamations add column if not exists geste_valide_par text;
alter table public.reclamations add column if not exists created_at timestamptz not null default now();
alter table public.reclamations add column if not exists updated_at timestamptz not null default now();
alter table public.reclamations enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.reclamations;
create policy "Équipe connectée : lecture et écriture" on public.reclamations for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.reclamations to authenticated;

-- avis
create table if not exists public.avis (id text primary key);
alter table public.avis add column if not exists contact_id text;
alter table public.avis add column if not exists plateforme text;
alter table public.avis add column if not exists note integer;
alter table public.avis add column if not exists texte text;
alter table public.avis add column if not exists date date;
alter table public.avis add column if not exists reponse text;
alter table public.avis add column if not exists date_reponse date;
alter table public.avis add column if not exists reclamation_id text;
alter table public.avis add column if not exists created_at timestamptz not null default now();
alter table public.avis add column if not exists updated_at timestamptz not null default now();
alter table public.avis enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.avis;
create policy "Équipe connectée : lecture et écriture" on public.avis for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.avis to authenticated;

-- parametres
create table if not exists public.parametres (id text primary key);
alter table public.parametres add column if not exists date_reference date;
alter table public.parametres add column if not exists version_seed text;
alter table public.parametres add column if not exists created_at timestamptz not null default now();
alter table public.parametres add column if not exists updated_at timestamptz not null default now();
alter table public.parametres enable row level security;
drop policy if exists "Équipe connectée : lecture et écriture" on public.parametres;
create policy "Équipe connectée : lecture et écriture" on public.parametres for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
grant select, insert, update, delete on public.parametres to authenticated;
