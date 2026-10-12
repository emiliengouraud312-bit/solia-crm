// Actions rapides de la fiche contact et transitions du pipeline (cahier des charges, sections 3.3 à 3.4 et 5).
// Chaque action décrit ses champs (obligatoires ou non), vérifie la saisie et renvoie la liste
// des changements à enregistrer : un événement daté, et selon le cas une réservation, un devis,
// un changement de statut. Fonctions pures : l'écran affiche, le store enregistre.
import { inserer, modifier, type Changement } from '../store/DataStore'
import { formatDate, formatMontant } from '../lib/format'
import { ajouterJours, ecartJours, estPasse, numeroJour } from './dates'
import { nouvelEvenement } from './evenements'
import { LIBELLES_CANAL, LIBELLES_STATUT } from './libelles'
import { messageEnvoye, type ContexteMessage } from './messages'
import { placesRestantes } from './planning'
import type { DonneesContact } from './scoring'
import { reservationCourante } from './statuts'
import type {
  Abonnement,
  Base,
  Canal,
  DateISO,
  Depart,
  Devis,
  FichePassation,
  Horodatage,
  MoyenPaiement,
  Reservation,
  Statut,
  TypeConsentement,
  TypeEvenement,
} from './types'

// ---------------------------------------------------------------------------
// Description des formulaires
// ---------------------------------------------------------------------------

export type ValeurChamp = string | number | boolean
export type Valeurs = Record<string, ValeurChamp | undefined>

export interface OptionChamp {
  valeur: string
  libelle: string
}

interface ChampCommun {
  cle: string
  libelle: string
  aide?: string
  obligatoire?: boolean
}

export type Champ =
  | (ChampCommun & { type: 'texte' | 'zone' | 'date'; defaut?: string })
  | (ChampCommun & { type: 'nombre'; defaut?: number; min?: number; max?: number })
  | (ChampCommun & { type: 'choix'; options: OptionChamp[]; defaut?: string })
  | (ChampCommun & { type: 'case'; defaut?: boolean })

export interface ContexteAction {
  base: Base
  donnees: DonneesContact
  dateReference: DateISO
  /** Horodatage de l'action : la date de référence, à l'heure réelle. */
  maintenant: Horodatage
  /** Membre de l'équipe qui saisit l'action. */
  auteur: string
  nouvelId: () => string
}

export type GroupeAction = 'Considération' | 'Achat' | 'Avant le départ' | 'Pendant le séjour' | 'Après le voyage' | 'Loyauté' | 'Digital et coordonnées' | 'Suivi'

export interface DefinitionAction {
  id: string
  libelle: string
  groupe: GroupeAction
  process: string
  /** Critère de scoring concerné, affiché à côté de l'action (C10, N6, E1...). */
  critere?: string
  /** Statut auquel l'action fait passer le contact, le cas échéant. */
  statutVise?: Statut
  disponible(ctx: ContexteAction): boolean
  champs(ctx: ContexteAction): Champ[]
  /** Contrôles propres à l'action, en plus des champs obligatoires. */
  verifier?(valeurs: Valeurs, ctx: ContexteAction): string[]
  /** Phrase de récapitulatif affichée sous le formulaire (montants, échéances). */
  resume?(valeurs: Valeurs, ctx: ContexteAction): string | null
  appliquer(valeurs: Valeurs, ctx: ContexteAction): Changement[]
}

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

const texte = (v: ValeurChamp | undefined): string => (v === undefined || v === null ? '' : String(v).trim())
const nombre = (v: ValeurChamp | undefined): number | null => (texte(v) === '' ? null : Number(v))

function evenement(
  ctx: ContexteAction,
  type: TypeEvenement,
  process: string,
  options: { canal?: Canal | null; details?: Record<string, unknown> } = {},
): Changement {
  return inserer(
    'evenements',
    nouvelEvenement(ctx.donnees.contact.id, ctx.maintenant, type, {
      id: ctx.nouvelId(),
      auteur: ctx.auteur,
      process,
      canal: options.canal ?? null,
      details: options.details ?? {},
    }),
  )
}

/** Changement de statut : la fiche et un événement « statut » dans le journal. */
function changerStatut(ctx: ContexteAction, vers: Statut, process: string, motif?: string): Changement[] {
  const { contact } = ctx.donnees
  if (contact.statut === vers) return []
  return [
    modifier('contacts', contact.id, { statut: vers, ...(vers === 'perdu' ? { motif_perte: motif ?? null } : {}) }),
    evenement(ctx, 'statut', process, { canal: 'crm', details: { de: contact.statut, vers, ...(motif ? { motif } : {}) } }),
  ]
}

/** Message envoyé avec l'action (simulé) : rendu et tracé dans le journal du contact. */
function messageTrace(ctx: ContexteAction, code: string, regle: string, contexte: Partial<ContexteMessage> = {}): Changement {
  return inserer(
    'messages_envoyes',
    messageEnvoye({ base: ctx.base, contact: ctx.donnees.contact, date: ctx.maintenant, ...contexte }, code, { id: ctx.nouvelId(), regle_id: regle }),
  )
}

const statutParmi = (ctx: ContexteAction, statuts: Statut[]) => statuts.includes(ctx.donnees.contact.statut)
const STATUTS_AVANT_ACHAT: Statut[] = ['contact', 'prospect', 'devis_envoye', 'perdu']
const STATUTS_CLIENT_SANS_VOYAGE_EN_COURS: Statut[] = ['voyageur', 'abonne', 'ancien_abonne']

function depart(ctx: ContexteAction, id: ValeurChamp | undefined): Depart | undefined {
  return ctx.base.departs.find((d) => d.id === id)
}

function departsDeLaCible(ctx: ContexteAction, filtre: (places: number) => boolean): OptionChamp[] {
  return ctx.base.departs
    .filter((d) => d.cible === ctx.donnees.contact.cible && numeroJour(d.date_depart) > numeroJour(ctx.dateReference))
    .map((d) => ({ d, places: placesRestantes(d, ctx.base.reservations, ctx.dateReference, ctx.donnees.contact.id) }))
    .filter(({ places }) => filtre(places))
    .map(({ d, places }) => ({
      valeur: d.id,
      libelle: `${d.offre} · ${formatDate(d.date_depart)} · ${places > 0 ? `${places} place(s)` : 'complet'}`,
    }))
}

const departsOuverts = (ctx: ContexteAction) => departsDeLaCible(ctx, (places) => places > 0)

function aUneDemande(ctx: ContexteAction): boolean {
  return ctx.donnees.evenements.some((e) => ['demande_ecrite', 'appel_entrant', 'visite_agence'].includes(e.type))
}

function devisEnCours(ctx: ContexteAction): Devis | undefined {
  return ctx.donnees.devis
    .filter((d) => d.statut === 'envoye' && estPasse(d.date_envoi, ctx.dateReference))
    .sort((a, b) => (a.date_envoi < b.date_envoi ? 1 : -1))[0]
}

function reservation(ctx: ContexteAction): Reservation | null {
  return reservationCourante(ctx.donnees, ctx.dateReference)
}

function departDe(ctx: ContexteAction, r: Reservation | null): Depart | undefined {
  return r ? ctx.base.departs.find((d) => d.id === r.depart_id) : undefined
}

const passe = (ctx: ContexteAction, date: string | null | undefined) => Boolean(date) && estPasse(date as string, ctx.dateReference)

function abonnementActif(ctx: ContexteAction): Abonnement | undefined {
  return ctx.donnees.abonnements.find(
    (a) => a.decision === 'abonne' && a.date_debut && passe(ctx, a.date_debut) && (!a.date_fin || !passe(ctx, a.date_fin)),
  )
}

/** Code parrain unique (process 15), généré pour une note de 9 ou 10 et pour chaque nouvel abonné. */
export function nouveauCodeParrain(prenom: string, codesExistants: Set<string>, tirage: () => number = Math.random): string {
  const racine = prenom.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'SOLIA'
  for (let essai = 0; essai < 500; essai++) {
    const code = `${racine}${10 + Math.floor(tirage() * 90)}`
    if (!codesExistants.has(code)) return code
  }
  return `${racine}${Date.now() % 100000}`
}

function codeParrainSiAbsent(ctx: ContexteAction): Changement[] {
  const { contact } = ctx.donnees
  if (contact.code_parrain) return []
  const codes = new Set(ctx.base.contacts.map((c) => c.code_parrain).filter((c): c is string => Boolean(c)))
  return [modifier('contacts', contact.id, { code_parrain: nouveauCodeParrain(contact.prenom, codes) })]
}

const OUI_NON: OptionChamp[] = [
  { valeur: 'oui', libelle: 'Oui' },
  { valeur: 'non', libelle: 'Non' },
]

const MOYENS_PAIEMENT: OptionChamp[] = [
  { valeur: 'carte', libelle: 'Carte bancaire' },
  { valeur: 'virement', libelle: 'Virement' },
  { valeur: 'cheque', libelle: 'Chèque' },
  { valeur: 'cheques_vacances', libelle: 'Chèques-vacances ANCV' },
]

const champVoyage = (ctx: ContexteAction, obligatoire = true): Champ => ({
  cle: 'depart_id',
  libelle: 'Voyage concerné',
  type: 'choix',
  obligatoire,
  options: departsDeLaCible(ctx, () => true),
  defaut: ctx.donnees.contact.envie_depart_id ?? undefined,
})

// ---------------------------------------------------------------------------
// Process 02 : demandes entrantes
// ---------------------------------------------------------------------------

type TypeDemande = 'appel_entrant' | 'visite_agence' | 'demande_ecrite'

function enregistrerDemande(ctx: ContexteAction, type: TypeDemande, valeurs: Valeurs, canalEcrit?: Canal): Changement[] {
  const d = depart(ctx, valeurs.depart_id)
  const canal: Canal = type === 'appel_entrant' ? 'telephone' : type === 'visite_agence' ? 'agence' : (canalEcrit ?? 'site')
  const { contact } = ctx.donnees
  const changements: Changement[] = [
    evenement(ctx, type, '02', {
      canal,
      details: {
        ...(d ? { voyage: d.offre, depart_id: d.id } : {}),
        ...(nombre(valeurs.duree_minutes) ? { duree_minutes: nombre(valeurs.duree_minutes) } : {}),
        ...(texte(valeurs.question) ? { question: texte(valeurs.question) } : {}),
      },
    }),
  ]
  if (d && !contact.envie_depart_id) changements.push(modifier('contacts', contact.id, { envie_depart_id: d.id }))
  if (contact.statut === 'contact' || contact.statut === 'perdu') changements.push(...changerStatut(ctx, 'prospect', '02'))
  return changements
}

const CANAUX_ECRITS: OptionChamp[] = (['site', 'whatsapp', 'instagram', 'facebook', 'email'] as Canal[]).map((c) => ({
  valeur: c,
  libelle: LIBELLES_CANAL[c].charAt(0).toUpperCase() + LIBELLES_CANAL[c].slice(1),
}))

const actionAppel: DefinitionAction = {
  id: 'appel_entrant',
  libelle: 'Appel entrant',
  groupe: 'Considération',
  process: '02',
  critere: 'C10',
  statutVise: 'prospect',
  disponible: () => true,
  champs: (ctx) => [
    champVoyage(ctx),
    { cle: 'duree_minutes', libelle: 'Durée de l\'appel (minutes)', type: 'nombre', min: 1, defaut: 10 },
    { cle: 'question', libelle: 'Question posée', type: 'zone' },
  ],
  appliquer: (v, ctx) => enregistrerDemande(ctx, 'appel_entrant', v),
}

const actionVisite: DefinitionAction = {
  id: 'visite_agence',
  libelle: 'Visite à l\'agence',
  groupe: 'Considération',
  process: '03',
  critere: 'C11',
  statutVise: 'prospect',
  disponible: () => true,
  champs: (ctx) => [champVoyage(ctx), { cle: 'question', libelle: 'Question posée', type: 'zone' }],
  appliquer: (v, ctx) => enregistrerDemande(ctx, 'visite_agence', v),
}

const actionDemandeEcrite: DefinitionAction = {
  id: 'demande_ecrite',
  libelle: 'Demande écrite',
  groupe: 'Considération',
  process: '02',
  critere: 'C9',
  statutVise: 'prospect',
  disponible: () => true,
  champs: (ctx) => [
    { cle: 'canal', libelle: 'Canal', type: 'choix', options: CANAUX_ECRITS, obligatoire: true, defaut: 'site' },
    champVoyage(ctx),
    { cle: 'question', libelle: 'Question sur le voyage', type: 'zone', obligatoire: true },
  ],
  appliquer: (v, ctx) => enregistrerDemande(ctx, 'demande_ecrite', v, texte(v.canal) as Canal),
}

/** Transition vers Prospect depuis le pipeline : une demande, quel qu'en soit le canal. */
const actionDemande: DefinitionAction = {
  id: 'demande',
  libelle: 'Nouvelle demande',
  groupe: 'Considération',
  process: '02',
  statutVise: 'prospect',
  disponible: (ctx) => statutParmi(ctx, ['contact', 'perdu']),
  champs: (ctx) => [
    {
      cle: 'type',
      libelle: 'Type de demande',
      type: 'choix',
      obligatoire: true,
      options: [
        { valeur: 'appel_entrant', libelle: 'Appel entrant (C10)' },
        { valeur: 'visite_agence', libelle: 'Visite à l\'agence (C11)' },
        { valeur: 'demande_ecrite', libelle: 'Demande écrite (C9)' },
      ],
    },
    { cle: 'canal', libelle: 'Canal (demande écrite)', type: 'choix', options: CANAUX_ECRITS, defaut: 'site' },
    champVoyage(ctx),
    { cle: 'question', libelle: 'Question posée', type: 'zone' },
  ],
  appliquer: (v, ctx) => enregistrerDemande(ctx, texte(v.type) as TypeDemande, v, texte(v.canal) as Canal),
}

const actionReponse: DefinitionAction = {
  id: 'reponse_personnelle',
  libelle: 'Réponse personnelle envoyée',
  groupe: 'Considération',
  process: '02',
  disponible: (ctx) => aUneDemande(ctx) && statutParmi(ctx, STATUTS_AVANT_ACHAT),
  champs: (ctx) => [
    {
      cle: 'canal',
      libelle: 'Canal de la réponse',
      type: 'choix',
      obligatoire: true,
      options: [...CANAUX_ECRITS, { valeur: 'telephone', libelle: 'Téléphone' }],
      defaut: ctx.donnees.contact.canal_prefere,
    },
    { cle: 'proposition', libelle: 'Proposition faite', type: 'texte', defaut: 'Rendez-vous découverte ou visite à l\'agence' },
  ],
  appliquer: (v, ctx) => [
    evenement(ctx, 'reponse_personnelle', '02', { canal: texte(v.canal) as Canal, details: { proposition: texte(v.proposition) } }),
  ],
}

const actionReponseRelance: DefinitionAction = {
  id: 'reponse_relance',
  libelle: 'Réponse à une relance',
  groupe: 'Considération',
  process: '02',
  critere: 'C12',
  disponible: (ctx) => aUneDemande(ctx) && statutParmi(ctx, STATUTS_AVANT_ACHAT),
  champs: (ctx) => [
    { cle: 'canal', libelle: 'Canal', type: 'choix', options: [...CANAUX_ECRITS, { valeur: 'telephone', libelle: 'Téléphone' }], defaut: ctx.donnees.contact.canal_prefere },
  ],
  appliquer: (v, ctx) => [evenement(ctx, 'reponse_relance', '02', { canal: texte(v.canal) as Canal })],
}

// ---------------------------------------------------------------------------
// Process 03 : découverte et devis
// ---------------------------------------------------------------------------

const actionRdvAccepte: DefinitionAction = {
  id: 'rdv_accepte',
  libelle: 'Rendez-vous découverte accepté',
  groupe: 'Considération',
  process: '03',
  critere: 'C13',
  disponible: (ctx) => statutParmi(ctx, [...STATUTS_AVANT_ACHAT, ...STATUTS_CLIENT_SANS_VOYAGE_EN_COURS]),
  champs: (ctx) => [
    { cle: 'date_rdv', libelle: 'Date du rendez-vous', type: 'date', obligatoire: true, defaut: ajouterJours(ctx.dateReference, 2) },
    {
      cle: 'lieu',
      libelle: 'Lieu',
      type: 'choix',
      options: [
        { valeur: 'agence', libelle: 'À l\'agence' },
        { valeur: 'telephone', libelle: 'Par téléphone' },
      ],
      defaut: 'agence',
    },
  ],
  appliquer: (v, ctx) => [
    evenement(ctx, 'rdv_accepte', '03', { canal: 'telephone', details: { date_rdv: texte(v.date_rdv), lieu: texte(v.lieu) } }),
  ],
}

const actionRdvRealise: DefinitionAction = {
  id: 'rdv_realise',
  libelle: 'Découverte réalisée',
  groupe: 'Considération',
  process: '03',
  critere: 'C14',
  disponible: (ctx) => statutParmi(ctx, [...STATUTS_AVANT_ACHAT, ...STATUTS_CLIENT_SANS_VOYAGE_EN_COURS]),
  champs: (ctx) => {
    const c = ctx.donnees.contact
    return [
      champVoyage(ctx, false),
      { cle: 'dispo_debut', libelle: 'Disponible à partir du', type: 'date', defaut: c.dispo_debut ?? undefined, aide: 'Dates confirmées : critère P6' },
      { cle: 'dispo_fin', libelle: 'Disponible jusqu\'au', type: 'date', defaut: c.dispo_fin ?? undefined },
      { cle: 'budget', libelle: 'Budget confirmé (€)', type: 'nombre', min: 0, defaut: c.budget ?? undefined, aide: 'Budget compatible : critère P7' },
      { cle: 'craintes', libelle: 'Craintes exprimées', type: 'texte', defaut: c.craintes ?? undefined },
      { cle: 'contraintes', libelle: 'Contraintes (mobilité, régime...)', type: 'texte', defaut: c.contraintes ?? undefined },
      { cle: 'accord_devis', libelle: 'Accord pour recevoir un devis (C15)', type: 'case', defaut: true },
    ]
  },
  verifier: (v) => {
    const erreurs: string[] = []
    if (Boolean(texte(v.dispo_debut)) !== Boolean(texte(v.dispo_fin))) erreurs.push('Indiquez les deux dates de disponibilité, ou aucune.')
    if (texte(v.dispo_debut) && texte(v.dispo_fin) && texte(v.dispo_debut) > texte(v.dispo_fin)) {
      erreurs.push('La date de début de disponibilité doit précéder la date de fin.')
    }
    return erreurs
  },
  appliquer: (v, ctx) => {
    const { contact } = ctx.donnees
    const d = depart(ctx, v.depart_id)
    const changements: Changement[] = [evenement(ctx, 'rdv_realise', '03', { canal: 'agence', details: { duree_minutes: 25 } })]
    const fiche: Record<string, unknown> = {}
    if (d) fiche.envie_depart_id = d.id
    if (texte(v.craintes)) fiche.craintes = texte(v.craintes)
    if (texte(v.contraintes)) fiche.contraintes = texte(v.contraintes)
    if (texte(v.dispo_debut) && texte(v.dispo_fin)) {
      fiche.dispo_debut = texte(v.dispo_debut)
      fiche.dispo_fin = texte(v.dispo_fin)
      changements.push(evenement(ctx, 'dates_confirmees', '03', { canal: 'agence', details: { du: fiche.dispo_debut, au: fiche.dispo_fin } }))
    }
    const budget = nombre(v.budget)
    if (budget !== null) {
      fiche.budget = budget
      changements.push(evenement(ctx, 'budget_confirme', '03', { canal: 'agence', details: { budget } }))
    }
    if (v.accord_devis) changements.push(evenement(ctx, 'accord_devis', '03', { canal: 'agence' }))
    if (Object.keys(fiche).length > 0) changements.push(modifier('contacts', contact.id, fiche))
    return changements
  },
}

const actionRdvNonHonore: DefinitionAction = {
  id: 'rdv_non_honore',
  libelle: 'Rendez-vous non honoré',
  groupe: 'Considération',
  process: '03',
  critere: 'N4',
  disponible: (ctx) => ctx.donnees.evenements.some((e) => e.type === 'rdv_accepte') && statutParmi(ctx, STATUTS_AVANT_ACHAT),
  champs: () => [{ cle: 'note', libelle: 'Précision', type: 'texte', defaut: 'Absent sans prévenir' }],
  appliquer: (v, ctx) => [evenement(ctx, 'rdv_non_honore', '03', { canal: 'agence', details: { note: texte(v.note) } })],
}

const actionDevis: DefinitionAction = {
  id: 'devis',
  libelle: 'Envoyer le devis',
  groupe: 'Considération',
  process: '03',
  statutVise: 'devis_envoye',
  disponible: (ctx) => statutParmi(ctx, [...STATUTS_AVANT_ACHAT, ...STATUTS_CLIENT_SANS_VOYAGE_EN_COURS]),
  champs: (ctx) => {
    const envie = depart(ctx, ctx.donnees.contact.envie_depart_id ?? undefined)
    const dejaAccord = ctx.donnees.evenements.some((e) => e.type === 'accord_devis')
    return [
      { cle: 'depart_id', libelle: 'Offre et départ', type: 'choix', obligatoire: true, options: departsOuverts(ctx), defaut: envie?.id },
      { cle: 'montant', libelle: 'Montant TTC (€)', type: 'nombre', obligatoire: true, min: 1, defaut: envie?.prix_ttc, aide: 'Par défaut, le prix du départ' },
      ...(dejaAccord ? [] : [{ cle: 'accord_devis', libelle: 'Le client a donné son accord pour recevoir le devis (C15)', type: 'case' as const, defaut: true }]),
    ]
  },
  verifier: (v, ctx) => {
    const d = depart(ctx, v.depart_id)
    if (d && placesRestantes(d, ctx.base.reservations, ctx.dateReference, ctx.donnees.contact.id) <= 0) {
      return ['Ce départ est complet : proposez la liste d\'attente ou un autre départ (process 04).']
    }
    return []
  },
  resume: (_v, ctx) =>
    `Valable jusqu'au ${formatDate(ajouterJours(ctx.dateReference, 30))} (30 jours). Acompte de 30 % à la réservation, solde à J-60.`,
  appliquer: (v, ctx) => {
    const d = depart(ctx, v.depart_id) as Depart
    const montant = nombre(v.montant) ?? d.prix_ttc
    const finValidite = ajouterJours(ctx.dateReference, 30)
    const { contact } = ctx.donnees
    const changements: Changement[] = []
    if (v.accord_devis) changements.push(evenement(ctx, 'accord_devis', '03', { canal: 'agence' }))
    const devis: Devis = {
      id: ctx.nouvelId(),
      contact_id: contact.id,
      depart_id: d.id,
      montant,
      date_envoi: ctx.dateReference,
      date_fin_validite: finValidite,
      statut: 'envoye',
    }
    changements.push(
      inserer('devis', devis),
      evenement(ctx, 'devis_envoye', '03', {
        canal: 'email',
        details: { depart_id: d.id, offre: d.offre, montant, valable_jusqu_au: finValidite },
      }),
      messageTrace(ctx, 'M06', 'R10', { devis, depart: d }),
    )
    if (contact.envie_depart_id !== d.id) changements.push(modifier('contacts', contact.id, { envie_depart_id: d.id }))
    if (statutParmi(ctx, STATUTS_AVANT_ACHAT)) changements.push(...changerStatut(ctx, 'devis_envoye', '03'))
    return changements
  },
}

// ---------------------------------------------------------------------------
// Process 04 : relance du devis et réservation
// ---------------------------------------------------------------------------

const actionRelanceDevis: DefinitionAction = {
  id: 'relance_devis_aboutie',
  libelle: 'Appel de relance du devis abouti',
  groupe: 'Considération',
  process: '04',
  critere: 'C16',
  disponible: (ctx) => Boolean(devisEnCours(ctx)),
  champs: () => [{ cle: 'ressenti', libelle: 'Ressenti et freins exprimés', type: 'zone' }],
  appliquer: (v, ctx) => [
    evenement(ctx, 'relance_devis_aboutie', '04', { canal: 'telephone', details: { ressenti: texte(v.ressenti) } }),
  ],
}

const actionQuestion: DefinitionAction = {
  id: 'question_modalites',
  libelle: 'Question sur les modalités',
  groupe: 'Considération',
  process: '04',
  critere: 'C17',
  disponible: (ctx) => aUneDemande(ctx) && statutParmi(ctx, STATUTS_AVANT_ACHAT),
  champs: () => [
    {
      cle: 'question',
      libelle: 'Question',
      type: 'choix',
      obligatoire: true,
      options: ['Montant de l\'acompte', 'Paiement en chèques-vacances', 'Choix du binôme de chambre', 'Assurance', 'Autre'].map((q) => ({ valeur: q, libelle: q })),
    },
  ],
  appliquer: (v, ctx) => [evenement(ctx, 'question_modalites', '04', { canal: 'telephone', details: { question: texte(v.question) } })],
}

const actionListeAttente: DefinitionAction = {
  id: 'liste_attente',
  libelle: 'Inscrire en liste d\'attente',
  groupe: 'Considération',
  process: '04',
  critere: 'C20',
  disponible: (ctx) => statutParmi(ctx, STATUTS_AVANT_ACHAT) && departsDeLaCible(ctx, (p) => p <= 0).length > 0,
  champs: (ctx) => [{ cle: 'depart_id', libelle: 'Départ complet', type: 'choix', obligatoire: true, options: departsDeLaCible(ctx, (p) => p <= 0) }],
  verifier: (v, ctx) =>
    ctx.donnees.listeAttente.some((l) => l.depart_id === v.depart_id) ? ['Ce contact est déjà en liste d\'attente sur ce départ.'] : [],
  appliquer: (v, ctx) => {
    const d = depart(ctx, v.depart_id) as Depart
    return [
      inserer('liste_attente', { id: ctx.nouvelId(), depart_id: d.id, contact_id: ctx.donnees.contact.id, date: ctx.dateReference }),
      evenement(ctx, 'liste_attente', '04', { canal: 'telephone', details: { depart_id: d.id, offre: d.offre } }),
    ]
  },
}

/** Règle métier : à moins de 60 jours du départ, la totalité du prix est exigible à la signature. */
export function conditionsDeReservation(d: Depart, dateReservation: DateISO) {
  const acompte = Math.round(d.prix_ttc * 0.3)
  const totaliteExigible = ecartJours(dateReservation, d.date_depart) < 60
  return {
    acompte,
    solde: d.prix_ttc - acompte,
    totaliteExigible,
    echeanceSolde: totaliteExigible ? dateReservation : d.echeance_solde,
  }
}

const actionReservation: DefinitionAction = {
  id: 'reservation',
  libelle: 'Enregistrer la réservation (acompte)',
  groupe: 'Achat',
  process: '04',
  statutVise: 'reserve',
  disponible: (ctx) => statutParmi(ctx, ['prospect', 'devis_envoye', ...STATUTS_CLIENT_SANS_VOYAGE_EN_COURS]),
  champs: (ctx) => {
    const devis = devisEnCours(ctx)
    return [
      {
        cle: 'depart_id',
        libelle: 'Départ réservé',
        type: 'choix',
        obligatoire: true,
        options: departsOuverts(ctx),
        defaut: devis?.depart_id ?? ctx.donnees.contact.envie_depart_id ?? undefined,
      },
      { cle: 'moyen_paiement', libelle: 'Moyen de paiement de l\'acompte', type: 'choix', obligatoire: true, options: MOYENS_PAIEMENT },
    ]
  },
  verifier: (v, ctx) => {
    const d = depart(ctx, v.depart_id)
    if (!d) return []
    if (numeroJour(d.date_depart) <= numeroJour(ctx.dateReference)) return ['Ce départ a déjà eu lieu.']
    if (placesRestantes(d, ctx.base.reservations, ctx.dateReference, ctx.donnees.contact.id) <= 0) {
      return ['Ce départ est complet : proposez la liste d\'attente ou un autre départ.']
    }
    return []
  },
  resume: (v, ctx) => {
    const d = depart(ctx, v.depart_id)
    if (!d) return null
    const c = conditionsDeReservation(d, ctx.dateReference)
    return c.totaliteExigible
      ? `Départ à moins de 60 jours : la totalité est exigible à la signature. Acompte de ${formatMontant(c.acompte)}, puis solde de ${formatMontant(c.solde)} à encaisser dès aujourd'hui.`
      : `Acompte de 30 % : ${formatMontant(c.acompte)}. Solde de ${formatMontant(c.solde)} à régler au plus tard le ${formatDate(c.echeanceSolde)} (J-60).`
  },
  appliquer: (v, ctx) => {
    const d = depart(ctx, v.depart_id) as Depart
    const { contact } = ctx.donnees
    const c = conditionsDeReservation(d, ctx.dateReference)
    const nouvelle: Reservation = {
      id: ctx.nouvelId(),
      contact_id: contact.id,
      depart_id: d.id,
      date_reservation: ctx.dateReference,
      acompte_montant: c.acompte,
      acompte_date: ctx.dateReference,
      moyen_paiement: texte(v.moyen_paiement) as MoyenPaiement,
      solde_montant: c.solde,
      solde_echeance: c.echeanceSolde,
      solde_date: null,
      mise_en_demeure_date: null,
      rappel_solde_auto: true,
      appel_bienvenue_date: null,
      tentatives_appel: 0,
      ajout_groupe_date: null,
      message_groupe_poste: false,
      hesite_dates: false,
      brise_glace_confirme_le: null,
      present_brise_glace: null,
      binome: null,
      opposition_image: false,
      note_chaud: null,
      incident_non_resolu: false,
      partage_groupe: false,
      retour_confirme_le: null,
      present_retour: null,
      album_remis: null,
      statut: 'reservee',
      report_utilise: false,
      depart_initial_id: null,
      date_report: null,
      annulation_date: null,
      annulation_motif: null,
      montant_retenu: null,
      montant_rembourse: null,
    }
    const changements: Changement[] = [
      inserer('reservations', nouvelle),
      evenement(ctx, 'reservation', '04', {
        canal: 'agence',
        details: {
          depart_id: d.id,
          offre: d.offre,
          acompte: c.acompte,
          moyen_paiement: nouvelle.moyen_paiement,
          solde: c.solde,
          echeance_solde: c.echeanceSolde,
          totalite_exigible: c.totaliteExigible,
        },
      }),
      ...ctx.donnees.devis
        .filter((x) => x.depart_id === d.id && x.statut === 'envoye')
        .map((x) => modifier('devis', x.id, { statut: 'accepte' })),
      ...changerStatut(ctx, 'reserve', '04'),
    ]
    if (contact.envie_depart_id !== d.id) changements.push(modifier('contacts', contact.id, { envie_depart_id: d.id }))
    return changements
  },
}

const actionRefus: DefinitionAction = {
  id: 'refus',
  libelle: 'Refus explicite',
  groupe: 'Considération',
  process: '02',
  critere: 'N6',
  statutVise: 'perdu',
  disponible: (ctx) => statutParmi(ctx, ['contact', 'prospect', 'devis_envoye']),
  champs: () => [{ cle: 'motif', libelle: 'Ce que le client a dit', type: 'texte', obligatoire: true, defaut: 'Pas pour le moment' }],
  appliquer: (v, ctx) => [
    evenement(ctx, 'refus', '02', { canal: 'telephone', details: { motif: texte(v.motif) } }),
    ...changerStatut(ctx, 'perdu', '02', `Refus : ${texte(v.motif).toLowerCase()}`),
  ],
}

const MOTIFS_PERTE = ['Sans réponse 14 jours après la demande', 'Devis expiré sans réponse', 'Refus : pas pour le moment', 'Autre']

const actionPerdu: DefinitionAction = {
  id: 'perdu',
  libelle: 'Passer en Perdu',
  groupe: 'Suivi',
  process: '19',
  statutVise: 'perdu',
  disponible: (ctx) => statutParmi(ctx, ['contact', 'prospect', 'devis_envoye']),
  champs: () => [
    { cle: 'motif', libelle: 'Motif de perte', type: 'choix', obligatoire: true, options: MOTIFS_PERTE.map((m) => ({ valeur: m, libelle: m })) },
    { cle: 'precision', libelle: 'Précision', type: 'texte', aide: 'Obligatoire si le motif est « Autre »' },
  ],
  verifier: (v) => (texte(v.motif) === 'Autre' && !texte(v.precision) ? ['Précisez le motif de perte.'] : []),
  appliquer: (v, ctx) => {
    const motif = texte(v.motif) === 'Autre' ? texte(v.precision) : texte(v.motif)
    const changements: Changement[] = []
    // Un refus explicite retire aussi 15 points (N6).
    if (texte(v.motif).startsWith('Refus')) changements.push(evenement(ctx, 'refus', '02', { canal: 'telephone', details: { motif: 'Pas pour le moment' } }))
    return [...changements, ...changerStatut(ctx, 'perdu', '19', motif)]
  },
}

// ---------------------------------------------------------------------------
// Process 05 à 07 : confirmation, passage de relais, préparation du départ
// ---------------------------------------------------------------------------

const voyageAVenir = (ctx: ContexteAction) => {
  const r = reservation(ctx)
  const d = departDe(ctx, r)
  return Boolean(r && d && numeroJour(d.date_depart) > numeroJour(ctx.dateReference))
}

const actionPassation: DefinitionAction = {
  id: 'fiche_passation',
  libelle: 'Remplir la fiche de passation',
  groupe: 'Achat',
  process: '05',
  disponible: (ctx) => Boolean(reservation(ctx)),
  champs: (ctx) => {
    const r = reservation(ctx)
    const fiche = ctx.donnees.fiches.find((f) => f.reservation_id === r?.id)
    const c = ctx.donnees.contact
    return [
      { cle: 'attentes', libelle: 'Attentes', type: 'zone', obligatoire: true, defaut: fiche?.attentes ?? undefined },
      { cle: 'craintes', libelle: 'Craintes', type: 'zone', obligatoire: true, defaut: fiche?.craintes ?? c.craintes ?? undefined },
      { cle: 'contraintes', libelle: 'Contraintes', type: 'zone', obligatoire: true, defaut: fiche?.contraintes ?? c.contraintes ?? undefined },
      { cle: 'details_personnels', libelle: 'Détails personnels', type: 'zone', defaut: fiche?.details_personnels ?? undefined },
    ]
  },
  appliquer: (v, ctx) => {
    const r = reservation(ctx) as Reservation
    const existante = ctx.donnees.fiches.find((f) => f.reservation_id === r.id)
    const valeurs = {
      attentes: texte(v.attentes) || null,
      craintes: texte(v.craintes) || null,
      contraintes: texte(v.contraintes) || null,
      details_personnels: texte(v.details_personnels) || null,
    }
    const changements: Changement[] = [
      modifier('contacts', ctx.donnees.contact.id, { craintes: valeurs.craintes, contraintes: valeurs.contraintes }),
    ]
    if (existante) {
      changements.push(modifier('fiches_passation', existante.id, { ...valeurs, remplie_le: existante.remplie_le ?? ctx.dateReference }))
    } else {
      const fiche: FichePassation = { id: ctx.nouvelId(), reservation_id: r.id, ...valeurs, remplie_le: ctx.dateReference }
      changements.push(inserer('fiches_passation', fiche))
    }
    if (!existante?.remplie_le) changements.push(evenement(ctx, 'fiche_passation', '05', { canal: 'crm' }))
    return changements
  },
}

const actionAppelBienvenue: DefinitionAction = {
  id: 'appel_bienvenue',
  libelle: 'Appel de bienvenue',
  groupe: 'Achat',
  process: '05',
  critere: 'E1',
  disponible: (ctx) => voyageAVenir(ctx) && !reservation(ctx)?.appel_bienvenue_date,
  champs: () => [
    {
      cle: 'resultat',
      libelle: 'Résultat',
      type: 'choix',
      obligatoire: true,
      options: [
        { valeur: 'abouti', libelle: 'Appel réalisé (10 à 15 minutes)' },
        { valeur: 'sans_reponse', libelle: 'Tentative sans réponse' },
      ],
      defaut: 'abouti',
    },
    { cle: 'note', libelle: 'Ce qui a été dit (crainte rassurée, questions)', type: 'zone' },
  ],
  appliquer: (v, ctx) => {
    const r = reservation(ctx) as Reservation
    if (texte(v.resultat) === 'sans_reponse') {
      return [
        modifier('reservations', r.id, { tentatives_appel: r.tentatives_appel + 1 }),
        evenement(ctx, 'appel_sortant', '05', { canal: 'telephone', details: { objet: 'Appel de bienvenue', abouti: false, tentative: r.tentatives_appel + 1 } }),
      ]
    }
    return [
      modifier('reservations', r.id, { appel_bienvenue_date: ctx.dateReference, tentatives_appel: r.tentatives_appel + 1 }),
      evenement(ctx, 'appel_bienvenue', '05', { canal: 'telephone', details: { duree_minutes: 12, note: texte(v.note) } }),
    ]
  },
}

const actionGroupe: DefinitionAction = {
  id: 'ajout_groupe',
  libelle: 'Ajouté au groupe WhatsApp du voyage',
  groupe: 'Avant le départ',
  process: '05',
  disponible: (ctx) => voyageAVenir(ctx) && !reservation(ctx)?.ajout_groupe_date,
  champs: () => [],
  appliquer: (_v, ctx) => {
    const r = reservation(ctx) as Reservation
    const d = departDe(ctx, r) as Depart
    return [
      modifier('reservations', r.id, { ajout_groupe_date: ctx.dateReference }),
      evenement(ctx, 'ajout_groupe', '05', { canal: 'whatsapp', details: { groupe: `${d.offre} ${formatDate(d.date_depart)}` } }),
      messageTrace(ctx, 'M12', 'R19', { reservation: r, depart: d }),
    ]
  },
}

const actionMessageGroupe: DefinitionAction = {
  id: 'message_groupe',
  libelle: 'A posté un message dans le groupe',
  groupe: 'Avant le départ',
  process: '06',
  critere: 'E2',
  disponible: (ctx) => Boolean(reservation(ctx)?.ajout_groupe_date) && !reservation(ctx)?.message_groupe_poste,
  champs: () => [],
  appliquer: (_v, ctx) => [
    modifier('reservations', (reservation(ctx) as Reservation).id, { message_groupe_poste: true }),
    evenement(ctx, 'note', '06', { canal: 'whatsapp', details: { texte: 'Premier message posté dans le groupe WhatsApp du voyage' } }),
  ],
}

const actionSolde: DefinitionAction = {
  id: 'solde',
  libelle: 'Encaisser le solde',
  groupe: 'Avant le départ',
  process: '06',
  critere: 'E3',
  statutVise: 'solde',
  disponible: (ctx) => {
    const r = reservation(ctx)
    return Boolean(r && !r.solde_date)
  },
  champs: (ctx) => [
    { cle: 'montant', libelle: 'Montant du solde (€)', type: 'nombre', obligatoire: true, min: 0, defaut: reservation(ctx)?.solde_montant },
    { cle: 'moyen_paiement', libelle: 'Moyen de paiement', type: 'choix', obligatoire: true, options: MOYENS_PAIEMENT },
  ],
  resume: (_v, ctx) => {
    const r = reservation(ctx)
    if (!r) return null
    const retard = numeroJour(ctx.dateReference) > numeroJour(r.solde_echeance)
    return `Échéance : ${formatDate(r.solde_echeance)}${retard ? ', dépassée : le solde est encaissé en retard (E3 non obtenu).' : '.'}`
  },
  appliquer: (v, ctx) => {
    const r = reservation(ctx) as Reservation
    return [
      modifier('reservations', r.id, { solde_date: ctx.dateReference, statut: 'soldee' }),
      evenement(ctx, 'solde', '06', { details: { montant: nombre(v.montant), moyen_paiement: texte(v.moyen_paiement) } }),
      ...(ctx.donnees.contact.statut === 'reserve' ? changerStatut(ctx, 'solde', '06') : []),
    ]
  },
}

const actionMiseEnDemeure: DefinitionAction = {
  id: 'mise_en_demeure',
  libelle: 'Envoyer la mise en demeure (solde non réglé)',
  groupe: 'Avant le départ',
  process: '06',
  critere: 'M3',
  disponible: (ctx) => {
    const r = reservation(ctx)
    return Boolean(r && !r.solde_date && !r.mise_en_demeure_date && numeroJour(ctx.dateReference) > numeroJour(r.solde_echeance))
  },
  champs: () => [
    { cle: 'support', libelle: 'Envoyée sur support durable (e-mail avec accusé de réception)', type: 'case', obligatoire: true, defaut: true },
  ],
  resume: (_v, ctx) => {
    const r = reservation(ctx)
    return r ? `Solde de ${formatMontant(r.solde_montant)} exigible le ${formatDate(r.solde_echeance)}. Sans règlement sous 7 jours, le contrat est résolu (R23).` : null
  },
  appliquer: (_v, ctx) => {
    const r = reservation(ctx) as Reservation
    const d = departDe(ctx, r)
    return [
      modifier('reservations', r.id, { mise_en_demeure_date: ctx.dateReference }),
      evenement(ctx, 'mise_en_demeure', '06', { canal: 'email', details: { montant: r.solde_montant, message: 'M14' } }),
      messageTrace(ctx, 'M14', 'R22', { reservation: r, depart: d }),
    ]
  },
}

const actionHesiteDates: DefinitionAction = {
  id: 'hesite_dates',
  libelle: 'Le client hésite sur ses dates',
  groupe: 'Avant le départ',
  process: '06',
  disponible: (ctx) => {
    const r = reservation(ctx)
    const d = departDe(ctx, r)
    return Boolean(r && d && !r.hesite_dates && !r.report_utilise && ecartJours(ctx.dateReference, d.date_depart) > 30)
  },
  champs: () => [{ cle: 'note', libelle: 'Ce qui le fait hésiter', type: 'zone' }],
  resume: (_v, ctx) => {
    const d = departDe(ctx, reservation(ctx))
    return d ? `Report gratuit possible jusqu'au ${formatDate(ajouterJours(d.date_depart, -31))} : une tâche d'appel est créée pour la référente (R24).` : null
  },
  appliquer: (v, ctx) => [
    modifier('reservations', (reservation(ctx) as Reservation).id, { hesite_dates: true }),
    evenement(ctx, 'note', '06', { canal: 'telephone', details: { texte: `Hésite sur ses dates${texte(v.note) ? ` : ${texte(v.note)}` : ''}` } }),
  ],
}

/** Réponse à l'invitation au Soli'apéro : annule la relance personnelle (R26 ou R37). */
function actionConfirmation(moment: 'brise_glace' | 'retour'): DefinitionAction {
  const briseGlace = moment === 'brise_glace'
  const champ = briseGlace ? 'brise_glace_confirme_le' : 'retour_confirme_le'
  return {
    id: briseGlace ? 'confirmation_brise_glace' : 'confirmation_retour',
    libelle: briseGlace ? 'Présence confirmée au Soli\'apéro brise-glace' : 'Présence confirmée au Soli\'apéro retour',
    groupe: briseGlace ? 'Avant le départ' : 'Après le voyage',
    process: briseGlace ? '07' : '09',
    disponible: (ctx) => {
      const r = reservation(ctx)
      const d = departDe(ctx, r)
      if (!r || !d || r[champ]) return false
      const invitation = briseGlace ? ajouterJours(d.date_depart, -21) : ajouterJours(d.date_retour, 2)
      const soiree = briseGlace ? d.soliapero_brise_glace : d.soliapero_retour
      return passe(ctx, invitation) && !passe(ctx, soiree)
    },
    champs: () => [],
    resume: (_v, ctx) => {
      const d = departDe(ctx, reservation(ctx))
      return d ? `Soirée du ${formatDate(briseGlace ? d.soliapero_brise_glace : d.soliapero_retour)}.` : null
    },
    appliquer: (_v, ctx) => [
      modifier('reservations', (reservation(ctx) as Reservation).id, { [champ]: ctx.dateReference }),
      evenement(ctx, 'note', briseGlace ? '07' : '09', {
        canal: ctx.donnees.contact.canal_prefere,
        details: { texte: briseGlace ? 'Présence confirmée au Soli\'apéro brise-glace' : 'Présence confirmée au Soli\'apéro retour' },
      }),
    ],
  }
}

const actionBriseGlace: DefinitionAction = {
  id: 'presence_brise_glace',
  libelle: 'Présence au Soli\'apéro brise-glace',
  groupe: 'Avant le départ',
  process: '07',
  critere: 'E4',
  disponible: (ctx) => {
    const d = departDe(ctx, reservation(ctx))
    return Boolean(d && passe(ctx, d.soliapero_brise_glace))
  },
  champs: (ctx) => {
    const r = reservation(ctx)
    return [
      { cle: 'present', libelle: 'Présent', type: 'choix', obligatoire: true, options: OUI_NON, defaut: r?.present_brise_glace === false ? 'non' : 'oui' },
      { cle: 'binome', libelle: 'Binôme de chambre', type: 'texte', defaut: r?.binome ?? undefined },
      { cle: 'opposition_image', libelle: 'S\'oppose à l\'utilisation de son image (article 15 des CGV)', type: 'case', defaut: r?.opposition_image ?? false },
    ]
  },
  appliquer: (v, ctx) => {
    const r = reservation(ctx) as Reservation
    const present = v.present === 'oui'
    return [
      modifier('reservations', r.id, { present_brise_glace: present, binome: texte(v.binome) || null, opposition_image: Boolean(v.opposition_image) }),
      evenement(ctx, 'presence_soliapero', '07', { canal: 'agence', details: { moment: 'brise_glace', present } }),
      inserer('consentements', { id: ctx.nouvelId(), contact_id: ctx.donnees.contact.id, type: 'droit_image', valeur: !v.opposition_image, date: ctx.maintenant }),
    ]
  },
}

/** Saisie d'une présence depuis la fiche départ (process 07 et 10), sur une réservation précise. */
export function presenceSoliapero(
  r: Reservation,
  moment: 'brise_glace' | 'retour',
  present: boolean,
  options: { maintenant: Horodatage; auteur: string; nouvelId: () => string },
): Changement[] {
  const retour = moment === 'retour'
  const album = present ? true : (r.album_remis ?? false)
  return [
    modifier('reservations', r.id, retour ? { present_retour: present, album_remis: album } : { present_brise_glace: present }),
    inserer(
      'evenements',
      nouvelEvenement(r.contact_id, options.maintenant, 'presence_soliapero', {
        id: options.nouvelId(),
        auteur: options.auteur,
        process: retour ? '10' : '07',
        canal: 'agence',
        details: retour ? { moment, present, album_remis: album } : { moment, present },
      }),
    ),
  ]
}

// ---------------------------------------------------------------------------
// Process 08 à 12 : séjour, retour, satisfaction
// ---------------------------------------------------------------------------

const actionSatisfaction: DefinitionAction = {
  id: 'satisfaction_chaud',
  libelle: 'Satisfaction à chaud',
  groupe: 'Pendant le séjour',
  process: '08',
  critere: 'E5',
  disponible: (ctx) => {
    const d = departDe(ctx, reservation(ctx))
    return Boolean(d && passe(ctx, d.date_depart))
  },
  champs: (ctx) => {
    const r = reservation(ctx)
    return [
      { cle: 'note', libelle: 'Note à chaud (sur 10)', type: 'nombre', obligatoire: true, min: 0, max: 10, defaut: r?.note_chaud ?? undefined },
      { cle: 'incident_non_resolu', libelle: 'Un incident est resté sans solution (E6)', type: 'case', defaut: r?.incident_non_resolu ?? false },
      { cle: 'partage_groupe', libelle: 'A partagé des photos ou des messages dans le groupe (E7)', type: 'case', defaut: r?.partage_groupe ?? false },
    ]
  },
  verifier: (v) => {
    const n = nombre(v.note)
    return n === null || n < 0 || n > 10 || !Number.isInteger(n) ? ['La note est un nombre entier de 0 à 10.'] : []
  },
  appliquer: (v, ctx) => {
    const r = reservation(ctx) as Reservation
    return [
      modifier('reservations', r.id, { note_chaud: nombre(v.note), incident_non_resolu: Boolean(v.incident_non_resolu), partage_groupe: Boolean(v.partage_groupe) }),
      evenement(ctx, 'satisfaction_chaud', '08', { canal: 'agence', details: { note: nombre(v.note) } }),
    ]
  },
}

const actionPassageVoyageur: DefinitionAction = {
  id: 'passage_voyageur',
  libelle: 'Retour du voyage : passer en Voyageur',
  groupe: 'Après le voyage',
  process: '09',
  statutVise: 'voyageur',
  disponible: (ctx) => {
    const d = departDe(ctx, reservation(ctx))
    return statutParmi(ctx, ['reserve', 'solde']) && Boolean(d && passe(ctx, d.date_retour))
  },
  champs: () => [],
  resume: (_v, ctx) => {
    const d = departDe(ctx, reservation(ctx))
    return d ? `Date du retour : ${formatDate(d.date_retour)}.` : null
  },
  verifier: (_v, ctx) => {
    const d = departDe(ctx, reservation(ctx))
    return d && passe(ctx, d.date_retour) ? [] : ['Le passage en Voyageur se fait le jour du retour (process 09) : le voyage n\'est pas encore rentré.']
  },
  appliquer: (_v, ctx) => {
    const r = reservation(ctx) as Reservation
    return [modifier('reservations', r.id, { statut: 'voyagee' }), ...changerStatut(ctx, 'voyageur', '09')]
  },
}

const actionSoliaperoRetour: DefinitionAction = {
  id: 'presence_retour',
  libelle: 'Présence au Soli\'apéro retour',
  groupe: 'Après le voyage',
  process: '10',
  critere: 'E8',
  disponible: (ctx) => {
    const d = departDe(ctx, reservation(ctx))
    return Boolean(d && passe(ctx, d.soliapero_retour))
  },
  champs: (ctx) => {
    const r = reservation(ctx)
    return [
      { cle: 'present', libelle: 'Présent', type: 'choix', obligatoire: true, options: OUI_NON, defaut: r?.present_retour === false ? 'non' : 'oui' },
      { cle: 'album_remis', libelle: 'Album photo remis', type: 'case', defaut: r?.album_remis ?? true },
    ]
  },
  appliquer: (v, ctx) => {
    const r = reservation(ctx) as Reservation
    const present = v.present === 'oui'
    return [
      modifier('reservations', r.id, { present_retour: present, album_remis: Boolean(v.album_remis) }),
      evenement(ctx, 'presence_soliapero', '10', { canal: 'agence', details: { moment: 'retour', present, album_remis: Boolean(v.album_remis) } }),
    ]
  },
}

const actionEnquete: DefinitionAction = {
  id: 'enquete',
  libelle: 'Réponse à l\'enquête de satisfaction',
  groupe: 'Après le voyage',
  process: '12',
  critere: 'E9',
  disponible: (ctx) => {
    const r = reservation(ctx)
    const d = departDe(ctx, r)
    return Boolean(r && d && passe(ctx, d.date_retour) && !ctx.donnees.enquetes.some((e) => e.reservation_id === r.id))
  },
  champs: () => [
    { cle: 'nps', libelle: 'Note de recommandation (sur 10)', type: 'nombre', obligatoire: true, min: 0, max: 10 },
    { cle: 'commentaire', libelle: 'Commentaire', type: 'zone' },
    { cle: 'avis_google_publie', libelle: 'Avis Google publié (E10)', type: 'case', defaut: false },
  ],
  verifier: (v) => {
    const n = nombre(v.nps)
    return n === null || n < 0 || n > 10 || !Number.isInteger(n) ? ['La note est un nombre entier de 0 à 10.'] : []
  },
  appliquer: (v, ctx) => {
    const r = reservation(ctx) as Reservation
    const nps = nombre(v.nps) as number
    return [
      inserer('enquetes', {
        id: ctx.nouvelId(),
        contact_id: ctx.donnees.contact.id,
        reservation_id: r.id,
        type: 'voyage',
        nps,
        notes_par_temps: {},
        commentaire: texte(v.commentaire) || null,
        date: ctx.dateReference,
        avis_google_publie: Boolean(v.avis_google_publie),
      }),
      evenement(ctx, 'enquete', '12', { canal: 'email', details: { nps } }),
      // Process 15 : code parrain remis pour une note de 9 ou 10.
      ...(nps >= 9 ? codeParrainSiAbsent(ctx) : []),
    ]
  },
}

// ---------------------------------------------------------------------------
// Process 11, 13 et 14 : abonnement et activités
// ---------------------------------------------------------------------------

const FORMULE = '29 € par mois'

const actionSouscription: DefinitionAction = {
  id: 'souscription',
  libelle: 'Souscription à l\'abonnement',
  groupe: 'Loyauté',
  process: '11',
  critere: 'E11',
  statutVise: 'abonne',
  disponible: (ctx) => !abonnementActif(ctx) && ctx.donnees.reservations.some((r) => r.statut !== 'annulee'),
  champs: () => [{ cle: 'formule', libelle: 'Formule', type: 'choix', obligatoire: true, options: [{ valeur: FORMULE, libelle: `Abonnement Solia, ${FORMULE}` }], defaut: FORMULE }],
  resume: (_v, ctx) => `Début le ${formatDate(ctx.dateReference)}. Ajout au canal WhatsApp de la cible et code parrain remis (process 13 et 15).`,
  appliquer: (_v, ctx) => [
    inserer('abonnements', {
      id: ctx.nouvelId(),
      contact_id: ctx.donnees.contact.id,
      formule: FORMULE,
      decision: 'abonne',
      date_decision: ctx.dateReference,
      date_debut: ctx.dateReference,
      date_fin: null,
      motif_resiliation: null,
      motif_refus: null,
    }),
    evenement(ctx, 'souscription', '11', { canal: 'agence', details: { formule: FORMULE } }),
    ...(statutParmi(ctx, ['voyageur', 'ancien_abonne']) ? changerStatut(ctx, 'abonne', '11') : []),
    ...codeParrainSiAbsent(ctx),
  ],
}

const MOTIFS_REFUS = ['Budget', 'Manque de temps', 'Distance', 'Préfère seulement voyager', 'Pas intéressé(e) par les activités']

const actionDecisionAbonnement: DefinitionAction = {
  id: 'decision_abonnement',
  libelle: 'Décision sur l\'abonnement (réflexion ou refus)',
  groupe: 'Loyauté',
  process: '11',
  disponible: (ctx) => statutParmi(ctx, ['voyageur']) && !abonnementActif(ctx),
  champs: () => [
    {
      cle: 'decision',
      libelle: 'Décision',
      type: 'choix',
      obligatoire: true,
      options: [
        { valeur: 'en_reflexion', libelle: 'En réflexion' },
        { valeur: 'refus', libelle: 'Refus' },
      ],
    },
    { cle: 'motif_refus', libelle: 'Motif du refus', type: 'choix', options: MOTIFS_REFUS.map((m) => ({ valeur: m, libelle: m })), aide: 'Obligatoire en cas de refus (process 11)' },
  ],
  verifier: (v) => (v.decision === 'refus' && !texte(v.motif_refus) ? ['Le motif de refus est obligatoire : c\'est lui qui fera évoluer l\'offre.'] : []),
  appliquer: (v, ctx) => [
    inserer('abonnements', {
      id: ctx.nouvelId(),
      contact_id: ctx.donnees.contact.id,
      formule: FORMULE,
      decision: v.decision === 'refus' ? 'refus' : 'en_reflexion',
      date_decision: ctx.dateReference,
      date_debut: null,
      date_fin: null,
      motif_resiliation: null,
      motif_refus: v.decision === 'refus' ? texte(v.motif_refus) : null,
    }),
    evenement(ctx, 'note', '11', {
      canal: 'crm',
      details: { texte: v.decision === 'refus' ? `Décision sur l'abonnement : refus (${texte(v.motif_refus)})` : 'Décision sur l\'abonnement : en réflexion' },
    }),
  ],
}

const actionParticipation: DefinitionAction = {
  id: 'participation',
  libelle: 'Présence à une activité',
  groupe: 'Loyauté',
  process: '13',
  critere: 'E12',
  disponible: () => true,
  champs: (ctx) => {
    const options = ctx.base.activites
      .filter(
        (a) =>
          passe(ctx, a.date) &&
          ecartJours(a.date, ctx.dateReference) <= 60 &&
          (a.cible === ctx.donnees.contact.cible || a.ouverte_a_tous) &&
          !ctx.donnees.participations.some((p) => p.activite_id === a.id && p.present),
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((a) => ({ valeur: a.id, libelle: `${formatDate(a.date)} · ${a.titre}${a.ouverte_a_tous ? ' (ouverte à tous)' : ''}` }))
    return [{ cle: 'activite_id', libelle: 'Activité', type: 'choix', obligatoire: true, options, aide: 'Activités des 60 derniers jours : celles de sa tribu et celles ouvertes à tous (C19 pour un prospect)' }]
  },
  appliquer: (v, ctx) => {
    const existante = ctx.donnees.participations.find((p) => p.activite_id === v.activite_id)
    return existante
      ? [modifier('participations', existante.id, { present: true })]
      : [inserer('participations', { id: ctx.nouvelId(), activite_id: texte(v.activite_id), contact_id: ctx.donnees.contact.id, inscrit: true, present: true })]
  },
}

const actionResiliation: DefinitionAction = {
  id: 'resiliation',
  libelle: 'Résiliation de l\'abonnement',
  groupe: 'Loyauté',
  process: '13',
  statutVise: 'ancien_abonne',
  disponible: (ctx) => Boolean(abonnementActif(ctx)),
  champs: () => [{ cle: 'motif', libelle: 'Motif de résiliation', type: 'texte', obligatoire: true }],
  appliquer: (v, ctx) => {
    const abonnement = abonnementActif(ctx) as Abonnement
    return [
      modifier('abonnements', abonnement.id, { date_fin: ctx.dateReference, motif_resiliation: texte(v.motif) }),
      evenement(ctx, 'resiliation', '13', { canal: 'telephone', details: { motif: texte(v.motif) } }),
      ...(statutParmi(ctx, ['abonne']) ? changerStatut(ctx, 'ancien_abonne', '13') : []),
    ]
  },
}

// ---------------------------------------------------------------------------
// Digital, coordonnées, suivi
// ---------------------------------------------------------------------------

function actionSimple(
  id: TypeEvenement,
  libelle: string,
  critere: string,
  process: string,
  canal: Canal,
  champs: Champ[] = [],
): DefinitionAction {
  return {
    id,
    libelle,
    groupe: 'Digital et coordonnées',
    process,
    critere,
    disponible: () => true,
    champs: () => champs,
    appliquer: (v, ctx) => [
      evenement(ctx, id, process, { canal, details: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== '')) }),
    ],
  }
}

const actionClicBienvenue = actionSimple('clic_bienvenue', 'Clic dans le message de bienvenue', 'C4', '01', 'email')
const actionClicNewsletter = actionSimple('clic_newsletter', 'Clic dans la newsletter', 'C5', '14', 'email', [
  { cle: 'lien', libelle: 'Offre cliquée', type: 'texte' },
])
const actionInteraction = actionSimple('interaction_sociale', 'Commentaire ou DM sans question', 'C7', '17', 'instagram')
const actionProgramme = actionSimple('telechargement_programme', 'Programme téléchargé', 'C8', '02', 'site')
const actionCoordonneeVerifiee = actionSimple('coordonnee_verifiee', 'Coordonnée vérifiée', 'P2', '01', 'crm', [
  {
    cle: 'coordonnee',
    libelle: 'Coordonnée',
    type: 'choix',
    obligatoire: true,
    options: [
      { valeur: 'email', libelle: 'E-mail délivré sans rebond' },
      { valeur: 'telephone', libelle: 'Appel abouti' },
    ],
  },
])
const actionCoordonneeInvalide = actionSimple('coordonnee_invalide', 'Coordonnée invalide', 'N3', '01', 'crm', [
  { cle: 'raison', libelle: 'Raison', type: 'texte', obligatoire: true, defaut: 'Rebond de l\'e-mail' },
])

const actionNote: DefinitionAction = {
  id: 'note',
  libelle: 'Note interne',
  groupe: 'Suivi',
  process: '19',
  disponible: () => true,
  champs: () => [{ cle: 'texte', libelle: 'Note', type: 'zone', obligatoire: true }],
  appliquer: (v, ctx) => [evenement(ctx, 'note', '19', { canal: 'crm', details: { texte: texte(v.texte) } })],
}

const actionAppelSortant: DefinitionAction = {
  id: 'appel_sortant',
  libelle: 'Appel sortant',
  groupe: 'Suivi',
  process: '19',
  disponible: () => true,
  champs: () => [
    { cle: 'objet', libelle: 'Objet de l\'appel', type: 'texte', obligatoire: true },
    { cle: 'abouti', libelle: 'Appel abouti', type: 'case', defaut: true },
  ],
  appliquer: (v, ctx) => [evenement(ctx, 'appel_sortant', '19', { canal: 'telephone', details: { objet: texte(v.objet), abouti: Boolean(v.abouti) } })],
}

/** Changement de consentement (journal des consentements, process 01 et 19). */
export function changerConsentement(ctx: ContexteAction, type: TypeConsentement, valeur: boolean): Changement[] {
  return [inserer('consentements', { id: ctx.nouvelId(), contact_id: ctx.donnees.contact.id, type, valeur, date: ctx.maintenant })]
}

/** Mise à jour des notes libres de la fiche. */
export function modifierNotes(ctx: ContexteAction, notes: string): Changement[] {
  return [modifier('contacts', ctx.donnees.contact.id, { notes: notes.trim() || null })]
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export const ACTIONS: DefinitionAction[] = [
  actionAppel,
  actionVisite,
  actionDemandeEcrite,
  actionDemande,
  actionReponse,
  actionReponseRelance,
  actionRdvAccepte,
  actionRdvRealise,
  actionRdvNonHonore,
  actionDevis,
  actionRelanceDevis,
  actionQuestion,
  actionListeAttente,
  actionRefus,
  actionReservation,
  actionPassation,
  actionAppelBienvenue,
  actionGroupe,
  actionMessageGroupe,
  actionSolde,
  actionMiseEnDemeure,
  actionHesiteDates,
  actionConfirmation('brise_glace'),
  actionBriseGlace,
  actionSatisfaction,
  actionPassageVoyageur,
  actionConfirmation('retour'),
  actionSoliaperoRetour,
  actionEnquete,
  actionSouscription,
  actionDecisionAbonnement,
  actionParticipation,
  actionResiliation,
  actionClicBienvenue,
  actionClicNewsletter,
  actionInteraction,
  actionProgramme,
  actionCoordonneeVerifiee,
  actionCoordonneeInvalide,
  actionPerdu,
  actionNote,
  actionAppelSortant,
]

export function action(id: string): DefinitionAction {
  const trouvee = ACTIONS.find((a) => a.id === id)
  if (!trouvee) throw new Error(`Action inconnue : ${id}`)
  return trouvee
}

/** Actions proposées sur la fiche (la transition générique « demande » est réservée au pipeline). */
export function actionsDisponibles(ctx: ContexteAction): DefinitionAction[] {
  return ACTIONS.filter((a) => a.id !== 'demande' && a.disponible(ctx))
}

/** Valeurs par défaut des champs d'une action. */
export function valeursParDefaut(champs: Champ[]): Valeurs {
  return Object.fromEntries(champs.map((c) => [c.cle, c.defaut ?? (c.type === 'case' ? false : '')]))
}

/** Contrôle des champs obligatoires (process 19 : statuts et champs obligatoires contrôlés à la saisie). */
export function verifierAction(definition: DefinitionAction, valeurs: Valeurs, ctx: ContexteAction): string[] {
  const erreurs: string[] = []
  for (const champ of definition.champs(ctx)) {
    if (!champ.obligatoire) continue
    const valeur = valeurs[champ.cle]
    if (valeur === undefined || valeur === '' || (champ.type === 'case' && valeur !== true)) {
      erreurs.push(`${champ.libelle} : champ obligatoire.`)
    } else if (champ.type === 'choix' && !champ.options.some((o) => o.valeur === valeur)) {
      erreurs.push(`${champ.libelle} : choix non valide.`)
    }
  }
  if (erreurs.length === 0 && definition.verifier) erreurs.push(...definition.verifier(valeurs, ctx))
  return erreurs
}

/** Vérifie puis applique une action : renvoie les erreurs, ou les changements à enregistrer. */
export function executerAction(
  definition: DefinitionAction,
  valeurs: Valeurs,
  ctx: ContexteAction,
): { erreurs: string[]; changements: Changement[] } {
  if (!definition.disponible(ctx)) {
    return { erreurs: [`L'action « ${definition.libelle} » n'est pas possible pour un contact au statut ${LIBELLES_STATUT[ctx.donnees.contact.statut]}.`], changements: [] }
  }
  const erreurs = verifierAction(definition, valeurs, ctx)
  return erreurs.length > 0 ? { erreurs, changements: [] } : { erreurs: [], changements: definition.appliquer(valeurs, ctx) }
}
