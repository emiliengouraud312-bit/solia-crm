// Création d'un événement du journal : le code critère est toujours calculé, jamais saisi.
import { critereDeLEvenement } from './criteres'
import type { Canal, Evenement, Horodatage, TypeEvenement } from './types'

export function nouvelEvenement(
  contactId: string,
  date: Horodatage,
  type: TypeEvenement,
  options: { canal?: Canal | null; process?: string | null; auteur?: string | null; details?: Record<string, unknown>; id?: string } = {},
): Evenement {
  const evenement: Evenement = {
    id: options.id ?? crypto.randomUUID(),
    contact_id: contactId,
    date,
    type,
    code_critere: null,
    canal: options.canal ?? null,
    process: options.process ?? null,
    auteur_id: options.auteur ?? null,
    details: options.details ?? {},
    simule: false,
  }
  return { ...evenement, code_critere: critereDeLEvenement(evenement) }
}

/** Horodatage « maintenant » à la date de référence (l'heure réelle, le jour de référence). */
export function maintenantA(dateReference: string): Horodatage {
  const heure = new Date().toTimeString().slice(0, 5)
  return `${dateReference}T${heure}`
}
