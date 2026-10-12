// Le CRM se lit à la date de référence : le statut d'un contact est le dernier changement de statut
// du journal à cette date, une tâche n'existe qu'une fois déclenchée, un message qu'une fois envoyé.
// Avancer puis revenir au 30/11/2026 retrouve donc exactement l'état de la démo, sans rien effacer.
import { ajouterJours, estPasse } from './dates'
import type { Base, Contact, DateISO, Evenement, Statut, Tache } from './types'

/** Statut d'un contact à une date, d'après les changements de statut de son journal. */
export function statutALaDate(contact: Contact, evenements: Evenement[], date: DateISO): { statut: Statut; motif: string | null } {
  let statut: Statut = 'contact'
  let motif: string | null = null
  let derniere = ''
  for (const e of evenements) {
    if (e.type !== 'statut' || !estPasse(e.date, date) || e.date < derniere) continue
    derniere = e.date
    statut = e.details.vers as Statut
    motif = (e.details.motif as string | undefined) ?? null
  }
  // Toute fiche commence au statut Contact ; chaque changement de statut est tracé dans le journal.
  return { statut, motif: statut === 'perdu' ? (motif ?? contact.motif_perte) : null }
}

/** État d'une tâche à une date : faite, annulée ou à faire. */
export function statutTacheALaDate(tache: Tache, date: DateISO): Tache['statut'] {
  if (tache.fait_le && estPasse(tache.fait_le, date)) return 'fait'
  if (tache.statut === 'fait' && !tache.fait_le) return 'fait'
  if (tache.annulee_le && estPasse(tache.annulee_le, date)) return 'annulee'
  return 'a_faire'
}

/** La base telle qu'on la voit à la date de référence. */
export function vueALaDate(base: Base, date: DateISO): Base {
  const evenementsParContact = new Map<string, Evenement[]>()
  for (const e of base.evenements) {
    if (e.type !== 'statut') continue
    const liste = evenementsParContact.get(e.contact_id)
    if (liste) liste.push(e)
    else evenementsParContact.set(e.contact_id, [e])
  }
  const retours = new Map(base.departs.map((d) => [d.id, d.date_retour]))
  return {
    ...base,
    contacts: base.contacts.map((c) => {
      const { statut, motif } = statutALaDate(c, evenementsParContact.get(c.id) ?? [], date)
      return statut === c.statut && motif === c.motif_perte ? c : { ...c, statut, motif_perte: motif }
    }),
    taches: base.taches
      .filter((t) => estPasse(t.date_declenchement, date))
      .map((t) => {
        const statut = statutTacheALaDate(t, date)
        return statut === t.statut ? t : { ...t, statut }
      }),
    messages_envoyes: base.messages_envoyes.filter((m) => estPasse(m.date, date)),
    evenements: base.evenements.filter((e) => estPasse(e.date, date)),
    // Changements faits par le moteur à une date plus avancée : un devis n'expire qu'à J+30,
    // une réservation n'est « voyagée » qu'au retour.
    devis: base.devis.map((d) => (d.statut === 'expire' && !estPasse(ajouterJours(d.date_envoi, 30), date) ? { ...d, statut: 'envoye' } : d)),
    reservations: base.reservations.map((r) => {
      const retour = retours.get(r.depart_id)
      if (r.statut !== 'voyagee' || !retour || estPasse(retour, date)) return r
      return { ...r, statut: r.solde_date && estPasse(r.solde_date, date) ? 'soldee' : 'reservee' }
    }),
  }
}
