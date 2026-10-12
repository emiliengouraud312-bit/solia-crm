// Calculs de dates sans fuseau horaire : tout le CRM raisonne en jours calendaires.
import type { DateISO, Horodatage } from './types'

const MS_PAR_JOUR = 86_400_000

/** Partie date (AAAA-MM-JJ) d'une date ou d'un horodatage. */
export function jour(valeur: DateISO | Horodatage): DateISO {
  return valeur.slice(0, 10)
}

/** Numéro de jour absolu (jours depuis le 01/01/1970), pour comparer et soustraire. */
export function numeroJour(valeur: DateISO | Horodatage): number {
  const [a, m, j] = jour(valeur).split('-').map(Number)
  return Math.round(Date.UTC(a, m - 1, j) / MS_PAR_JOUR)
}

export function depuisNumeroJour(numero: number): DateISO {
  return new Date(numero * MS_PAR_JOUR).toISOString().slice(0, 10)
}

/** Ajoute (ou retire) un nombre de jours à une date. */
export function ajouterJours(valeur: DateISO | Horodatage, jours: number): DateISO {
  return depuisNumeroJour(numeroJour(valeur) + jours)
}

/** Nombre de jours entre deux dates (b moins a). */
export function ecartJours(a: DateISO | Horodatage, b: DateISO | Horodatage): number {
  return numeroJour(b) - numeroJour(a)
}

/** 0 dimanche, 1 lundi ... 6 samedi. */
export function jourSemaine(valeur: DateISO | Horodatage): number {
  return (numeroJour(valeur) + 4) % 7
}

/** Vrai si l'événement daté a eu lieu au plus tard le jour de référence. */
export function estPasse(valeur: DateISO | Horodatage, dateReference: DateISO): boolean {
  return numeroJour(valeur) <= numeroJour(dateReference)
}

export function horodatage(date: DateISO, heure = '09:00'): Horodatage {
  return `${date}T${heure}`
}

/** Âge en années révolues à une date donnée. */
export function age(dateNaissance: DateISO, dateReference: DateISO): number {
  const [an, mn, jn] = dateNaissance.split('-').map(Number)
  const [ar, mr, jr] = dateReference.split('-').map(Number)
  let resultat = ar - an
  if (mr < mn || (mr === mn && jr < jn)) resultat -= 1
  return resultat
}
