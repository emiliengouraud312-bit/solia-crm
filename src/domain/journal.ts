// Journal d'un contact : événements, consentements, présences aux activités et messages simulés,
// du plus récent au plus ancien, avec des libellés lisibles.
import { formatDate, formatMontant } from '../lib/format'
import { estPasse } from './dates'
import { LIBELLES_CANAL, LIBELLES_STATUT, libelleEvenement } from './libelles'
import type { DonneesContact, Planning } from './scoring'
import type { Canal, DateISO, Evenement, Horodatage, Statut, TypeEvenement } from './types'

export type SourceJournal = 'evenement' | 'consentement' | 'participation' | 'message'

export interface ElementJournal {
  id: string
  date: Horodatage
  source: SourceJournal
  type: TypeEvenement | 'consentement' | 'participation' | 'message'
  libelle: string
  /** Libellé court pour les pastilles de la frise. */
  libelleCourt: string
  canal: string | null
  process: string | null
  auteur_id: string | null
  /** Détails en clair (voyage, durée, question, montant...). */
  details: string[]
  details_bruts: Record<string, unknown>
}

const LIBELLES_COURTS: Partial<Record<TypeEvenement, string>> = {
  origine: 'origine',
  coordonnee_verifiee: 'coordonnée vérifiée',
  coordonnee_invalide: 'coordonnée invalide',
  dates_confirmees: 'dates confirmées',
  budget_confirme: 'budget confirmé',
  clic_bienvenue: 'clic bienvenue',
  clic_newsletter: 'clic newsletter',
  interaction_sociale: 'commentaire ou DM',
  telechargement_programme: 'programme',
  demande_ecrite: 'demande écrite',
  appel_entrant: 'appel entrant',
  visite_agence: 'visite agence',
  reponse_personnelle: 'réponse',
  reponse_relance: 'réponse relance',
  rdv_accepte: 'RDV accepté',
  rdv_realise: 'découverte',
  rdv_non_honore: 'RDV manqué',
  accord_devis: 'accord devis',
  devis_envoye: 'devis',
  relance_devis_aboutie: 'relance devis',
  question_modalites: 'question',
  liste_attente: 'liste d\'attente',
  devis_expire: 'devis expiré',
  refus: 'refus',
  reservation: 'réservation',
  fiche_passation: 'passation',
  appel_bienvenue: 'appel bienvenue',
  ajout_groupe: 'groupe WhatsApp',
  solde: 'solde',
  mise_en_demeure: 'mise en demeure',
  presence_soliapero: 'Soli\'apéro',
  satisfaction_chaud: 'satisfaction',
  enquete: 'enquête',
  souscription: 'abonnement',
  resiliation: 'résiliation',
  parrainage: 'parrainage',
  reclamation: 'réclamation',
  avis: 'avis',
  annulation: 'annulation',
  report: 'report',
  note: 'note',
  appel_sortant: 'appel sortant',
  message_envoye: 'message',
}

const MOYENS: Record<string, string> = {
  carte: 'carte bancaire',
  virement: 'virement',
  cheque: 'chèque',
  cheques_vacances: 'chèques-vacances ANCV',
}

/** Détails d'un événement, en clair. Les clés techniques (identifiants) ne sont pas affichées. */
function detailsEnClair(details: Record<string, unknown>): string[] {
  const lignes: string[] = []
  const d = details
  const date = (v: unknown) => formatDate(String(v))
  if (d.voyage) lignes.push(`Voyage : ${String(d.voyage)}`)
  if (d.offre && !d.voyage) lignes.push(`Offre : ${String(d.offre)}`)
  if (d.duree_minutes) lignes.push(`Durée : ${String(d.duree_minutes)} min`)
  if (d.question) lignes.push(`Question : ${String(d.question)}`)
  if (d.date_rdv) lignes.push(`Rendez-vous le ${date(d.date_rdv)}`)
  if (d.du && d.au) lignes.push(`Disponible du ${date(d.du)} au ${date(d.au)}`)
  if (d.budget !== undefined) lignes.push(`Budget : ${formatMontant(Number(d.budget))}`)
  if (d.montant !== undefined) lignes.push(`Montant : ${formatMontant(Number(d.montant))}`)
  if (d.valable_jusqu_au) lignes.push(`Valable jusqu'au ${date(d.valable_jusqu_au)}`)
  if (d.acompte !== undefined) lignes.push(`Acompte : ${formatMontant(Number(d.acompte))}`)
  if (d.moyen_paiement) lignes.push(`Paiement : ${MOYENS[String(d.moyen_paiement)] ?? String(d.moyen_paiement)}`)
  if (d.echeance_solde) lignes.push(`Solde de ${formatMontant(Number(d.solde))} dû le ${date(d.echeance_solde)}${d.totalite_exigible ? ' (totalité exigible)' : ''}`)
  if (d.totalite_a_la_signature) lignes.push('Totalité réglée à la signature')
  if (d.proposition) lignes.push(`Proposition : ${String(d.proposition)}`)
  if (d.ressenti) lignes.push(`Ressenti : ${String(d.ressenti)}`)
  if (d.note !== undefined && typeof d.note !== 'number') lignes.push(String(d.note))
  if (typeof d.note === 'number') lignes.push(`Note : ${d.note}/10`)
  if (d.nps !== undefined) lignes.push(`Recommandation : ${String(d.nps)}/10`)
  if (d.texte) lignes.push(String(d.texte))
  if (d.motif) lignes.push(`Motif : ${String(d.motif)}`)
  if (d.objet) lignes.push(`Objet : ${String(d.objet)}${d.abouti === false ? ' (sans réponse)' : ''}`)
  if (d.parrain_mentionne) lignes.push(`Parrain mentionné : ${String(d.parrain_mentionne)}`)
  if (d.filleul) lignes.push(`Filleul : ${String(d.filleul)}`)
  if (d.groupe) lignes.push(`Groupe : ${String(d.groupe)}`)
  if (d.album_remis !== undefined) lignes.push(`Album remis : ${d.album_remis ? 'oui' : 'non'}`)
  if (d.pourcentage_retenu !== undefined) {
    lignes.push(`Barème : ${String(d.pourcentage_retenu)} % retenus (${formatMontant(Number(d.montant_retenu))}), remboursement de ${formatMontant(Number(d.montant_rembourse))}`)
  }
  if (d.coordonnee) lignes.push(`Coordonnée : ${d.coordonnee === 'email' ? 'e-mail' : 'téléphone'}`)
  if (d.raison) lignes.push(String(d.raison))
  if (d.lien) lignes.push(`Lien : ${String(d.lien)}`)
  if (d.message) lignes.push(`Modèle ${String(d.message)}`)
  return lignes
}

function libelleStatut(e: Evenement): string {
  const vers = e.details.vers as Statut
  return `Passage en ${LIBELLES_STATUT[vers] ?? String(vers)}`
}

export function journalDuContact(donnees: DonneesContact, planning: Planning, dateReference: DateISO): ElementJournal[] {
  const passe = (date: string) => estPasse(date, dateReference)
  const elements: ElementJournal[] = []

  for (const e of donnees.evenements.filter((x) => passe(x.date))) {
    elements.push({
      id: e.id,
      date: e.date,
      source: 'evenement',
      type: e.type,
      libelle: e.type === 'statut' ? libelleStatut(e) : libelleEvenement(e),
      libelleCourt: e.type === 'statut' ? libelleStatut(e) : (LIBELLES_COURTS[e.type] ?? libelleEvenement(e)),
      canal: e.canal ? LIBELLES_CANAL[e.canal as Canal] : null,
      process: e.process,
      auteur_id: e.auteur_id,
      details: detailsEnClair(e.details),
      details_bruts: e.details,
    })
  }

  const noms = { newsletter: 'newsletter', whatsapp: 'WhatsApp', droit_image: 'droit à l\'image' }
  for (const c of donnees.consentements.filter((x) => passe(x.date))) {
    elements.push({
      id: c.id,
      date: c.date,
      source: 'consentement',
      type: 'consentement',
      libelle: `Consentement ${noms[c.type]} : ${c.valeur ? 'oui' : 'non'}`,
      libelleCourt: `${noms[c.type]} ${c.valeur ? 'oui' : 'non'}`,
      canal: null,
      process: '01',
      auteur_id: null,
      details: [],
      details_bruts: { type: c.type, valeur: c.valeur },
    })
  }

  for (const p of donnees.participations) {
    const activite = planning.activites.find((a) => a.id === p.activite_id)
    if (!activite || !passe(activite.date) || p.present === null) continue
    elements.push({
      id: p.id,
      date: `${activite.date}T${activite.heure}`,
      source: 'participation',
      type: 'participation',
      libelle: `${p.present ? 'Présent' : 'Absent'} à « ${activite.titre} »${activite.ouverte_a_tous ? ' (ouverte à tous)' : ''}`,
      libelleCourt: p.present ? 'activité' : 'absent activité',
      canal: null,
      process: activite.ouverte_a_tous ? '14' : '13',
      auteur_id: activite.animatrice_id,
      details: [`Lieu : ${activite.lieu}`],
      details_bruts: { activite_id: activite.id, present: p.present },
    })
  }

  for (const m of donnees.messages.filter((x) => passe(x.date))) {
    elements.push({
      id: m.id,
      date: m.date,
      source: 'message',
      type: 'message',
      libelle: `Message ${m.message_code} envoyé (simulation)`,
      libelleCourt: m.message_code,
      canal: m.canal,
      process: null,
      auteur_id: null,
      details: m.objet_rendu ? [`Objet : ${m.objet_rendu}`] : [],
      details_bruts: { message_code: m.message_code },
    })
  }

  return elements.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
