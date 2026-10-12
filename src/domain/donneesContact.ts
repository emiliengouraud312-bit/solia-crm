// Prépare, pour chaque contact, les données dont le scoring a besoin (DonneesContact).
// L'index évite de reparcourir toutes les tables pour chaque contact.
import type { DonneesContact, Planning } from './scoring'
import type { Base } from './types'

function grouper<T>(lignes: T[], cle: (ligne: T) => string): Map<string, T[]> {
  const groupes = new Map<string, T[]>()
  for (const ligne of lignes) {
    const k = cle(ligne)
    const groupe = groupes.get(k)
    if (groupe) groupe.push(ligne)
    else groupes.set(k, [ligne])
  }
  return groupes
}

export function planningDe(base: Base): Planning {
  return { departs: base.departs, activites: base.activites, reservations: base.reservations }
}

/** Renvoie une fonction qui donne les données d'un contact à partir de son identifiant. */
export function indexerBase(base: Base): (contactId: string) => DonneesContact {
  const contacts = new Map(base.contacts.map((c) => [c.id, c]))
  const evenements = grouper(base.evenements, (e) => e.contact_id)
  const consentements = grouper(base.consentements, (c) => c.contact_id)
  const participations = grouper(base.participations, (p) => p.contact_id)
  const reservations = grouper(base.reservations, (r) => r.contact_id)
  const enquetes = grouper(base.enquetes, (e) => e.contact_id)
  const abonnements = grouper(base.abonnements, (a) => a.contact_id)
  const reclamations = grouper(base.reclamations, (r) => r.contact_id)
  const avis = grouper(base.avis, (a) => a.contact_id)
  const filleuls = grouper(base.parrainages, (p) => p.parrain_id)

  return (contactId: string) => {
    const contact = contacts.get(contactId)
    if (!contact) throw new Error(`Contact inconnu : ${contactId}`)
    return {
      contact,
      evenements: evenements.get(contactId) ?? [],
      consentements: consentements.get(contactId) ?? [],
      participations: participations.get(contactId) ?? [],
      reservations: reservations.get(contactId) ?? [],
      enquetes: enquetes.get(contactId) ?? [],
      abonnements: abonnements.get(contactId) ?? [],
      reclamations: reclamations.get(contactId) ?? [],
      avis: avis.get(contactId) ?? [],
      filleuls: (filleuls.get(contactId) ?? []).map((p) => {
        const premiere = (reservations.get(p.filleul_id) ?? [])
          .map((r) => r.acompte_date)
          .sort()[0]
        return { filleul_id: p.filleul_id, acompte_date: premiere ?? null }
      }),
    }
  }
}
