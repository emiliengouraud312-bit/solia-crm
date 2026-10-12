// Lectures du planning interne : places restantes, départs ouverts, réservations actives.
import { estPasse, numeroJour } from './dates'
import type { DateISO, Depart, Reservation } from './types'

/** Une réservation compte à une date si elle est déjà faite et pas encore annulée. */
export function reservationActive(reservation: Reservation, dateReference: DateISO): boolean {
  if (!estPasse(reservation.date_reservation, dateReference)) return false
  if (reservation.statut === 'annulee') {
    return Boolean(reservation.annulation_date) && !estPasse(reservation.annulation_date as string, dateReference)
  }
  return true
}

/** Places restantes sur un départ à une date (en ignorant éventuellement un contact). */
export function placesRestantes(
  depart: Depart,
  reservations: Reservation[],
  dateReference: DateISO,
  contactIgnore?: string,
): number {
  const prises = reservations.filter(
    (r) => r.depart_id === depart.id && r.contact_id !== contactIgnore && reservationActive(r, dateReference),
  ).length
  return depart.places_max - prises
}

/** Départ ouvert : il n'est pas encore parti et il reste des places. */
export function departOuvert(
  depart: Depart,
  reservations: Reservation[],
  dateReference: DateISO,
  contactIgnore?: string,
): boolean {
  return (
    numeroJour(depart.date_depart) > numeroJour(dateReference) &&
    placesRestantes(depart, reservations, dateReference, contactIgnore) > 0
  )
}
