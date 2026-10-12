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

/** Ajoute des jours ouvrés (sans samedi ni dimanche), en gardant l'heure. */
export function ajouterJoursOuvres(valeur: Horodatage, jours: number): Horodatage {
  let date = jour(valeur)
  let restants = jours
  while (restants > 0) {
    date = ajouterJours(date, 1)
    if (jourSemaine(date) !== 0 && jourSemaine(date) !== 6) restants -= 1
  }
  return valeur.length > 10 ? `${date}${valeur.slice(10)}` : date
}

/** Ajoute des mois calendaires (le 31 devient le dernier jour du mois si besoin). */
export function ajouterMois(valeur: DateISO, mois: number): DateISO {
  const [a, m, j] = jour(valeur).split('-').map(Number)
  const total = a * 12 + (m - 1) + mois
  const annee = Math.floor(total / 12)
  const moisCible = (total % 12) + 1
  const dernierJour = new Date(Date.UTC(annee, moisCible, 0)).getUTCDate()
  return `${annee}-${String(moisCible).padStart(2, '0')}-${String(Math.min(j, dernierJour)).padStart(2, '0')}`
}

/** Décale un horodatage de quelques minutes (sans changer de jour au-delà de 23 h 59). */
export function plusMinutes(valeur: Horodatage, minutes: number): Horodatage {
  const date = jour(valeur)
  const [h, m] = (valeur.slice(11, 16) || '00:00').split(':').map(Number)
  const total = Math.max(0, Math.min(h * 60 + m + minutes, 23 * 60 + 59))
  return `${date}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
