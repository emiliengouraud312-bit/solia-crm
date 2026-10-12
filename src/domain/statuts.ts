// Statuts et transitions (cahier des charges, section 5 ; process 19) : quelles transitions
// sont possibles, par quelle action, et quels champs obligatoires chaque statut demande.
import { estPasse } from './dates'
import { LIBELLES_STATUT } from './libelles'
import type { DonneesContact } from './scoring'
import type { DateISO, Reservation, Statut } from './types'

/** Pour chaque statut de départ, les statuts d'arrivée possibles et l'action qui fait la transition. */
export const TRANSITIONS: Record<Statut, Partial<Record<Statut, string>>> = {
  contact: { prospect: 'demande', perdu: 'perdu' },
  prospect: { devis_envoye: 'devis', reserve: 'reservation', perdu: 'perdu' },
  devis_envoye: { reserve: 'reservation', perdu: 'perdu' },
  reserve: { solde: 'solde', voyageur: 'passage_voyageur' },
  solde: { voyageur: 'passage_voyageur' },
  voyageur: { abonne: 'souscription', reserve: 'reservation' },
  abonne: { ancien_abonne: 'resiliation', reserve: 'reservation' },
  ancien_abonne: { abonne: 'souscription', reserve: 'reservation' },
  perdu: { prospect: 'demande' },
}

export function actionDeTransition(de: Statut, vers: Statut): string | null {
  return TRANSITIONS[de][vers] ?? null
}

/** Explication en clair quand une transition n'est pas possible. */
export function raisonTransitionImpossible(de: Statut, vers: Statut): string {
  if (de === vers) return 'Le contact a déjà ce statut.'
  if (vers === 'contact') return 'Le statut Contact est donné à la création de la fiche (process 01).'
  if (vers === 'voyageur') return 'Le passage en Voyageur se fait au retour du voyage (process 09), depuis Réservé ou Soldé.'
  if ((de === 'reserve' || de === 'solde') && vers === 'perdu') {
    return 'Un client réservé ne devient pas Perdu : une annulation suit le process 18 (barème des CGV), prévu en phase 5.'
  }
  const possibles = Object.keys(TRANSITIONS[de]).map((s) => LIBELLES_STATUT[s as Statut])
  return `Depuis ${LIBELLES_STATUT[de]}, on peut passer en : ${possibles.join(', ') || 'aucun autre statut'}.`
}

/** Réservation sur laquelle portent les actions du voyage : la plus récente qui n'est pas annulée. */
export function reservationCourante(donnees: DonneesContact, dateReference: DateISO): Reservation | null {
  return (
    donnees.reservations
      .filter((r) => r.statut !== 'annulee' && estPasse(r.date_reservation, dateReference))
      .sort((a, b) => (a.date_reservation < b.date_reservation ? 1 : -1))[0] ?? null
  )
}

/** Champs obligatoires du statut actuel qui ne sont pas renseignés (indicateur « fiches complètes », process 19). */
export function champsManquants(donnees: DonneesContact, dateReference: DateISO): string[] {
  const { contact } = donnees
  const manquants: string[] = []
  const consentement = (type: 'newsletter' | 'whatsapp') =>
    donnees.consentements.some((c) => c.type === type && estPasse(c.date, dateReference))

  // Statut Contact (process 01), valable pour toutes les fiches.
  if (!contact.prenom || !contact.nom) manquants.push('Identité')
  if (!contact.email && !contact.telephone) manquants.push('Téléphone ou e-mail')
  if (contact.origine === 'parrainage' && !contact.parrain_id) manquants.push('Parrain')
  if (!consentement('newsletter')) manquants.push('Consentement newsletter')
  if (!consentement('whatsapp')) manquants.push('Consentement WhatsApp')

  const reservation = reservationCourante(donnees, dateReference)
  switch (contact.statut) {
    case 'prospect': {
      const demande = donnees.evenements.find(
        (e) => ['demande_ecrite', 'appel_entrant', 'visite_agence'].includes(e.type) && estPasse(e.date, dateReference),
      )
      if (!demande) manquants.push('Demande (date, heure et canal)')
      if (!demande?.details.depart_id && !contact.envie_depart_id) manquants.push('Voyage concerné')
      break
    }
    case 'devis_envoye':
      if (!donnees.devis.some((d) => d.statut === 'envoye' && estPasse(d.date_envoi, dateReference))) {
        manquants.push('Devis (offre, départ, montant, fin de validité)')
      }
      break
    case 'reserve':
    case 'solde':
      if (!reservation) {
        manquants.push('Réservation (acompte, moyen de paiement, solde dû, échéance)')
      } else {
        if (!donnees.fiches.some((f) => f.reservation_id === reservation.id && f.remplie_le)) manquants.push('Fiche de passation')
        if (contact.statut === 'solde' && !reservation.solde_date) manquants.push('Date et montant du solde')
      }
      break
    case 'abonne':
      if (!donnees.abonnements.some((a) => a.decision === 'abonne' && a.date_debut && !a.date_fin)) {
        manquants.push('Date de souscription et formule')
      }
      break
    case 'ancien_abonne':
      if (!donnees.abonnements.some((a) => a.motif_resiliation)) manquants.push('Motif de résiliation')
      break
    case 'perdu':
      if (!contact.motif_perte) manquants.push('Motif de perte')
      break
  }
  return manquants
}
