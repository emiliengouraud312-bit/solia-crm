// Rendu des 41 modèles de messages (data/messages.json). Les variables sont remplies depuis la fiche,
// la réservation et le planning ; une variable sans valeur s'affiche entre crochets ([lien_enquete]),
// jamais vide (cahier des charges, section 7). Aucun message n'est réellement envoyé.
import { formatDate, formatMontant } from '../lib/format'
import { ajouterJours, estPasse, jour, numeroJour } from './dates'
import { LIBELLES_CANAL_PREFERE } from './libelles'
import { placesRestantes } from './planning'
import { MESSAGES } from './referentiel'
import type { Activite, Base, Cible, Contact, Depart, Devis, Enquete, Horodatage, MessageEnvoye, ModeleMessage, Reservation } from './types'

export interface ContexteMessage {
  base: Base
  contact: Contact
  /** Date d'envoi : sert à choisir la prochaine activité, les prochains départs... */
  date: Horodatage
  reservation?: Reservation | null
  depart?: Depart | null
  devis?: Devis | null
  activite?: Activite | null
  enquete?: Enquete | null
  filleul?: Contact | null
}

export function modeleMessage(code: string): ModeleMessage {
  const modele = MESSAGES.find((m) => m.code === code)
  if (!modele) throw new Error(`Modèle de message inconnu : ${code}`)
  return modele
}

const heure = (h: string) => h.slice(11, 16).replace(':', ' h ')

const NOMS_CANAL_CIBLE: Record<Cible, string> = {
  senior: 'Abonnés seniors',
  parent_solo: 'Abonnés parents solos',
  celibataire: 'Abonnés célibataires',
}

const LIEUX_RENCONTRE: Record<Contact['origine'], string> = {
  stand: 'sur notre stand',
  agence: 'à l\'agence',
  partenaire: 'chez notre partenaire',
  flyer_qr: 'après avoir découvert notre flyer',
  site: 'sur notre site',
  reseau_social: 'sur nos réseaux sociaux',
  parrainage: 'grâce à votre parrain',
  appel_entrant: 'au téléphone',
}

/** Toutes les variables connues pour ce contexte (null : inconnue, affichée entre crochets). */
export function variablesMessage(ctx: ContexteMessage, code?: string): Record<string, string | null> {
  const { base, contact } = ctx
  const date = jour(ctx.date)
  const reservation = ctx.reservation ?? null
  const depart = ctx.depart ?? (reservation ? base.departs.find((d) => d.id === reservation.depart_id) : null) ?? base.departs.find((d) => d.id === ctx.devis?.depart_id) ?? null
  const offre = depart ? base.offres.find((o) => o.id === depart.offre_id) : undefined
  const envie = base.departs.find((d) => d.id === contact.envie_depart_id)
  const offreEnvie = envie ? base.offres.find((o) => o.id === envie.offre_id) : undefined
  const referente = base.equipe.find((m) => m.id === contact.referente_id)
  const parrain = base.contacts.find((c) => c.id === contact.parrain_id)

  const apres = (d: string) => numeroJour(d) > numeroJour(date)
  const activitesCible = base.activites.filter((a) => a.cible === contact.cible).sort((a, b) => (a.date < b.date ? -1 : 1))
  const prochaineActivite = activitesCible.find((a) => apres(a.date))
  // Prochain événement ouvert à tous, de préférence celui de sa tribu.
  const ouverts = base.activites.filter((a) => a.ouverte_a_tous && apres(a.date)).sort((a, b) => (a.date < b.date ? -1 : 1))
  const prochainOuvert = ouverts.find((a) => a.cible === contact.cible) ?? ouverts[0]
  const departsCible = base.departs.filter((d) => d.cible === contact.cible && apres(d.date_depart)).sort((a, b) => (a.date_depart < b.date_depart ? -1 : 1))
  const autreDepart = departsCible.find((d) => d.id !== depart?.id && d.offre_id === depart?.offre_id) ?? departsCible.find((d) => d.id !== depart?.id)
  const mois = date.slice(0, 7)
  const activitesDuMois = activitesCible.filter((a) => a.date.startsWith(mois) && !estPasse(a.date, ajouterJours(date, -1)))
  const temoignage = base.enquetes
    .filter((e) => (e.nps ?? 0) >= 9 && e.commentaire && estPasse(e.date, date))
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  const compagnon = reservation?.binome?.split(' ')[0] ?? null
  const ligneActivite = (a: Activite) => `${formatDate(a.date)} à ${a.heure.replace(':', ' h ')} : ${a.titre} (${a.lieu})`
  const derniereActivite = ctx.activite ?? null
  const suivanteActivite = derniereActivite ? activitesCible.find((a) => a.date > derniereActivite.date && apres(a.date)) : prochaineActivite
  const filleul = ctx.filleul ?? null
  const reservationFilleul = filleul ? base.reservations.find((r) => r.contact_id === filleul.id) : undefined
  const departFilleul = reservationFilleul ? base.departs.find((d) => d.id === reservationFilleul.depart_id) : undefined
  const enRetour = code === 'M20' || code === 'M21'

  return {
    prenom: contact.prenom,
    nom: contact.nom,
    prenom_referente: referente?.prenom ?? null,
    telephone_referente: null,
    lieu_rencontre: contact.origine === 'parrainage' && parrain ? `grâce à ${parrain.prenom}` : LIEUX_RENCONTRE[contact.origine],
    envie: offreEnvie ? `découvrir ${offreEnvie.destination}` : null,
    offre: depart?.offre ?? null,
    destination: offre?.destination ?? null,
    date_depart: depart ? formatDate(depart.date_depart) : null,
    date_retour: depart ? formatDate(depart.date_retour) : null,
    places_max: depart ? String(depart.places_max) : null,
    places_restantes: depart ? String(Math.max(0, placesRestantes(depart, base.reservations, date))) : null,
    montant: ctx.devis ? formatMontant(ctx.devis.montant).replace(/ €$/, '') : null,
    date_fin_validite: ctx.devis ? formatDate(ctx.devis.date_fin_validite) : null,
    montant_acompte: reservation ? formatMontant(reservation.acompte_montant).replace(/ €$/, '') : null,
    montant_solde: reservation ? formatMontant(reservation.solde_montant).replace(/ €$/, '') : null,
    date_echeance_solde: reservation ? formatDate(reservation.solde_echeance) : null,
    date_soliapero: depart ? formatDate(depart.soliapero_brise_glace) : null,
    date_soliapero_retour: depart ? formatDate(depart.soliapero_retour) : null,
    heure_soliapero: depart ? heure(enRetour ? depart.soliapero_retour : depart.soliapero_brise_glace) : null,
    heure_rdv: null,
    lieu_rdv: null,
    autre_date_depart: autreDepart ? `${formatDate(autreDepart.date_depart)} (${autreDepart.offre})` : null,
    date_evenement: prochainOuvert ? formatDate(prochainOuvert.date) : null,
    element_concret: (() => {
      const cible = envie && apres(envie.date_depart) ? envie : departsCible[0]
      if (!cible) return null
      return `notre prochain départ ${cible.offre} a lieu le ${formatDate(cible.date_depart)}, et il reste ${Math.max(0, placesRestantes(cible, base.reservations, date))} places.`
    })(),
    code_parrain: contact.code_parrain,
    recompense: null,
    nom_canal_cible: NOMS_CANAL_CIBLE[contact.cible],
    programme_du_mois: activitesDuMois.length > 0 ? activitesDuMois.map((a) => `${a.titre} le ${formatDate(a.date)}`).join(', ') : null,
    liste_activites_du_mois: activitesDuMois.length > 0 ? activitesDuMois.map((a) => `- ${ligneActivite(a)}`).join('\n') : null,
    liste_prochains_departs:
      departsCible.length > 0
        ? departsCible
            .slice(0, 3)
            .map((d) => `- ${d.offre} du ${formatDate(d.date_depart)} au ${formatDate(d.date_retour)} (${formatMontant(d.prix_ttc)})`)
            .join('\n')
        : null,
    temoignage: temoignage?.commentaire ?? null,
    activite: derniereActivite?.titre ?? null,
    date_activite: derniereActivite ? formatDate(derniereActivite.date) : null,
    heure_activite: derniereActivite ? derniereActivite.heure.replace(':', ' h ') : null,
    prenom_compagnon_voyage: compagnon,
    prochaine_activite: suivanteActivite?.titre ?? null,
    date_prochaine_activite: suivanteActivite ? formatDate(suivanteActivite.date) : null,
    prochaine_offre: departsCible[0]?.offre ?? null,
    prochaine_date_depart: departsCible[0] ? formatDate(departsCible[0].date_depart) : null,
    prenom_filleul: filleul?.prenom ?? null,
    offre_filleul: departFilleul?.offre ?? null,
    detail_voyage: depart?.offre ?? null,
    offre_speciale: null,
    nouvelle_date_depart: reservation?.report_utilise && depart ? formatDate(depart.date_depart) : null,
    ajustement_prix: null,
    date_reception: reservation?.annulation_date ? formatDate(reservation.annulation_date) : null,
    pourcentage_retenu:
      reservation?.montant_retenu !== null && reservation?.montant_retenu !== undefined && depart
        ? String(Math.round((reservation.montant_retenu / depart.prix_ttc) * 100))
        : null,
    montant_retenu: reservation?.montant_retenu != null ? formatMontant(reservation.montant_retenu).replace(/ €$/, '') : null,
    montant_rembourse: reservation?.montant_rembourse != null ? formatMontant(reservation.montant_rembourse).replace(/ €$/, '') : null,
    numero_reclamation: null,
    solution: null,
    // Les liens ne sont pas inventés : ils restent entre crochets.
    lien_offres_cible: null,
    lien_devis: null,
    lien_programme: null,
    lien_photos: null,
    lien_programme_activites: null,
    lien_enquete: null,
    lien_avis_google: null,
    lien_desinscription: null,
    lien_offre: null,
    lien_enquete_abonnement: null,
  }
}

/** Remplace chaque {{variable}} par sa valeur, ou par [variable] si elle est inconnue. */
export function rendreTexte(texte: string, variables: Record<string, string | null>): string {
  return texte.replace(/\{\{(\w+)\}\}/g, (_, nom: string) => variables[nom] ?? `[${nom}]`)
}

/** Canal d'envoi réel du message selon le modèle, le canal préféré et le consentement WhatsApp. */
export function canalDuMessage(modele: ModeleMessage, contact: Contact, whatsappAccorde: boolean): string {
  const prefere = contact.canal_prefere === 'whatsapp' && !whatsappAccorde ? 'email' : contact.canal_prefere
  if (modele.canal.startsWith('canal préféré')) return LIBELLES_CANAL_PREFERE[prefere]
  if (modele.canal.startsWith('whatsapp ou email')) return prefere === 'whatsapp' ? 'WhatsApp' : 'E-mail'
  if (modele.canal === 'email et whatsapp') return whatsappAccorde ? 'E-mail et WhatsApp' : 'E-mail'
  if (modele.canal.startsWith('whatsapp (groupe')) return 'WhatsApp (groupe du voyage)'
  if (modele.canal === 'sms') return 'SMS'
  if (modele.canal.startsWith('email')) return modele.canal.replace('email', 'E-mail')
  return modele.canal.charAt(0).toUpperCase() + modele.canal.slice(1)
}

export interface MessageRendu {
  code: string
  nom: string
  objet: string | null
  corps: string
  canal: string
  expediteur: string
  /** Variables restées entre crochets. */
  manquantes: string[]
}

export function rendreMessage(code: string, ctx: ContexteMessage): MessageRendu {
  const modele = modeleMessage(code)
  const variables = variablesMessage(ctx, code)
  const whatsapp = ctx.base.consentements
    .filter((c) => c.contact_id === ctx.contact.id && c.type === 'whatsapp' && estPasse(c.date, jour(ctx.date)))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .pop()?.valeur ?? false
  const expediteur =
    modele.expediteur === 'référente' ? (ctx.base.equipe.find((m) => m.id === ctx.contact.referente_id)?.prenom ?? 'La référente') : modele.expediteur
  const utilisees = [...(modele.objet ?? '').matchAll(/\{\{(\w+)\}\}/g), ...modele.corps.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])
  return {
    code,
    nom: modele.nom,
    objet: modele.objet ? rendreTexte(modele.objet, variables) : null,
    corps: rendreTexte(modele.corps, variables),
    canal: canalDuMessage(modele, ctx.contact, whatsapp),
    expediteur,
    manquantes: [...new Set(utilisees.filter((v) => variables[v] === null || variables[v] === undefined))],
  }
}

/** Message simulé prêt à être enregistré (messages_envoyes). */
export function messageEnvoye(
  ctx: ContexteMessage,
  code: string,
  options: { id: string; regle_id?: string | null; tache_id?: string | null; cle_unicite?: string | null },
): MessageEnvoye {
  const rendu = rendreMessage(code, ctx)
  return {
    id: options.id,
    contact_id: ctx.contact.id,
    message_code: code,
    canal: rendu.canal,
    expediteur: rendu.expediteur,
    date: ctx.date,
    objet_rendu: rendu.objet,
    corps_rendu: rendu.corps,
    simule: true,
    regle_id: options.regle_id ?? null,
    tache_id: options.tache_id ?? null,
    cle_unicite: options.cle_unicite ?? null,
  }
}
