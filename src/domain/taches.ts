// Tâches du moteur d'automatismes : état à la date de référence, destinataires du message associé,
// et clôture (« Fait ») avec l'envoi simulé du message rendu.
import { inserer, modifier, type Changement } from '../store/DataStore'
import { jour, numeroJour } from './dates'
import { messageEnvoye, rendreMessage, type ContexteMessage, type MessageRendu } from './messages'
import { reservationActive } from './planning'
import type { Base, Contact, DateISO, Horodatage, Tache } from './types'

export type EtatTache = 'en_retard' | 'aujourdhui' | 'a_venir' | 'fait' | 'annulee'

/** Une tâche à faire est en retard si son échéance est passée, du jour si elle tombe à la date de référence. */
export function etatTache(tache: Tache, dateReference: DateISO): EtatTache {
  if (tache.statut === 'fait') return 'fait'
  if (tache.statut === 'annulee') return 'annulee'
  const ecart = numeroJour(tache.echeance) - numeroJour(dateReference)
  return ecart < 0 ? 'en_retard' : ecart === 0 ? 'aujourdhui' : 'a_venir'
}

/**
 * Destinataires du message d'une tâche : le contact, ou pour une tâche de départ les voyageurs du groupe
 * (R29 : photo de groupe dans le groupe WhatsApp ; R40 : les présents au Soli'apéro retour).
 */
export function destinataires(base: Base, tache: Tache): Contact[] {
  if (tache.contact_id) {
    const contact = base.contacts.find((c) => c.id === tache.contact_id)
    return contact ? [contact] : []
  }
  if (!tache.depart_id || !tache.message_code) return []
  const depart = base.departs.find((d) => d.id === tache.depart_id)
  if (!depart) return []
  const reservations = base.reservations.filter(
    (r) => r.depart_id === depart.id && reservationActive(r, jour(depart.soliapero_brise_glace)) && (tache.regle_id !== 'R40' || r.present_retour === true),
  )
  const ids = new Set(reservations.map((r) => r.contact_id))
  return base.contacts.filter((c) => ids.has(c.id))
}

/** Contexte de rendu du message d'une tâche pour un destinataire. */
export function contexteTache(base: Base, tache: Tache, contact: Contact, date: Horodatage): ContexteMessage {
  const reservation =
    base.reservations.find((r) => r.id === tache.reservation_id && r.contact_id === contact.id) ??
    (tache.depart_id ? base.reservations.find((r) => r.depart_id === tache.depart_id && r.contact_id === contact.id) : undefined) ??
    null
  const depart = base.departs.find((d) => d.id === (tache.depart_id ?? reservation?.depart_id)) ?? null
  const devis = base.devis.filter((d) => d.contact_id === contact.id).sort((a, b) => (a.date_envoi < b.date_envoi ? 1 : -1))[0] ?? null
  const activite = base.activites.find((a) => a.id === tache.activite_id) ?? null
  // R60 : la tâche du parrain porte la réservation du filleul.
  const reservationFilleul = tache.regle_id === 'R60' ? base.reservations.find((r) => r.id === tache.reservation_id) : undefined
  const filleul = reservationFilleul ? (base.contacts.find((c) => c.id === reservationFilleul.contact_id) ?? null) : null
  return { base, contact, date, reservation: filleul ? null : reservation, depart: filleul ? null : depart, devis, activite, filleul }
}

/** Aperçu du message d'une tâche (rendu sur le premier destinataire). */
export function apercuTache(base: Base, tache: Tache, date: Horodatage): { rendu: MessageRendu; destinataires: Contact[] } | null {
  if (!tache.message_code) return null
  const liste = destinataires(base, tache)
  if (liste.length === 0) return null
  return { rendu: rendreMessage(tache.message_code, contexteTache(base, tache, liste[0], date)), destinataires: liste }
}

/**
 * « Fait » : la tâche est close à la date donnée, et si un modèle est associé, le message rendu
 * est tracé (envoi simulé) pour chaque destinataire. Il rejoint alors le journal du contact.
 */
export function terminerTache(
  base: Base,
  tache: Tache,
  options: { date: Horodatage; auteur: string | null; nouvelId: () => string; envoyer?: boolean },
): Changement[] {
  const changements: Changement[] = [modifier('taches', tache.id, { statut: 'fait', fait_le: options.date, fait_par: options.auteur })]
  if (options.envoyer !== false && tache.message_code) {
    for (const contact of destinataires(base, tache)) {
      changements.push(
        inserer(
          'messages_envoyes',
          messageEnvoye(contexteTache(base, tache, contact, options.date), tache.message_code, {
            id: options.nouvelId(),
            regle_id: tache.regle_id,
            tache_id: tache.id,
          }),
        ),
      )
    }
  }
  return changements
}

