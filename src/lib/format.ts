// Formats d'affichage imposés par CLAUDE.md : dates en 30/11/2026, montants en 1 490 €.
import { jour, jourSemaine } from '../domain/dates'

const ESPACE_INSECABLE = ' '

export function formatDate(valeur: string | null | undefined): string {
  if (!valeur) return ''
  const [a, m, j] = jour(valeur).split('-')
  return `${j}/${m}/${a}`
}

export function formatDateHeure(valeur: string | null | undefined): string {
  if (!valeur) return ''
  const heure = valeur.length > 10 ? valeur.slice(11, 16).replace(':', ' h ') : ''
  return heure ? `${formatDate(valeur)} à ${heure}` : formatDate(valeur)
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

export function formatDateLongue(valeur: string): string {
  return `${JOURS[jourSemaine(valeur)]} ${formatDate(valeur)}`
}

/** 1490 donne « 1 490 € », 1162.5 donne « 1 162,50 € ». */
export function formatMontant(montant: number | null | undefined): string {
  if (montant === null || montant === undefined) return ''
  const entier = Number.isInteger(montant)
  const [partieEntiere, decimales] = Math.abs(montant).toFixed(entier ? 0 : 2).split('.')
  const groupes = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_INSECABLE)
  const signe = montant < 0 ? '-' : ''
  return `${signe}${groupes}${decimales ? ',' + decimales : ''}${ESPACE_INSECABLE}€`
}

/** Points avec virgule décimale : 7.5 donne « 7,5 ». */
export function formatPoints(points: number): string {
  const arrondi = Math.round(points * 100) / 100
  return String(arrondi).replace('.', ',')
}
