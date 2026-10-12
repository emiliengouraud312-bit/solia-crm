// Alertes affichées sur la fiche contact : abonné sans activité (R54, R55), solde en retard (process 06),
// tâches en retard.
import { ecartJours, estPasse, numeroJour } from './dates'
import type { DonneesContact } from './scoring'
import { etatTache } from './taches'
import type { Activite, DateISO } from './types'

export interface Alerte {
  niveau: 'attention' | 'urgent'
  texte: string
}

export function alertesContact(donnees: DonneesContact, activites: Activite[], dateReference: DateISO): Alerte[] {
  const alertes: Alerte[] = []
  const passe = (date: string | null | undefined): date is string => Boolean(date) && estPasse(date as string, dateReference)

  // Abonné sans activité depuis 30 jours (alerte) ou 60 jours (prendre des nouvelles, critère M4).
  const abonnement = donnees.abonnements.find((a) => a.decision === 'abonne' && passe(a.date_debut) && !(a.date_fin && passe(a.date_fin)))
  if (abonnement?.date_debut) {
    const dates = new Map(activites.map((a) => [a.id, a.date]))
    const derniere = donnees.participations
      .filter((p) => p.present === true)
      .map((p) => dates.get(p.activite_id))
      .filter((d): d is string => passe(d) && d >= (abonnement.date_debut as string))
      .sort()
      .pop()
    const depuis = derniere ?? abonnement.date_debut
    const jours = ecartJours(depuis, dateReference)
    if (jours >= 60) alertes.push({ niveau: 'urgent', texte: `Abonné sans activité depuis ${jours} jours : prendre des nouvelles sans parler d'abonnement (R55)` })
    else if (jours >= 30) alertes.push({ niveau: 'attention', texte: `Abonné sans activité depuis ${jours} jours : proposer une activité (R54)` })
  }

  // Solde non réglé à l'échéance.
  for (const r of donnees.reservations) {
    if (r.statut === 'annulee' || !passe(r.date_reservation) || passe(r.solde_date)) continue
    if (numeroJour(dateReference) <= numeroJour(r.solde_echeance)) continue
    alertes.push({
      niveau: 'urgent',
      texte: passe(r.mise_en_demeure_date)
        ? `Solde en retard (échéance du ${r.solde_echeance.split('-').reverse().join('/')}), mise en demeure envoyée le ${r.mise_en_demeure_date.split('-').reverse().join('/')}`
        : `Solde en retard depuis le ${r.solde_echeance.split('-').reverse().join('/')} : mise en demeure à envoyer (R22)`,
    })
  }

  const enRetard = donnees.taches.filter((t) => etatTache(t, dateReference) === 'en_retard').length
  if (enRetard > 0) alertes.push({ niveau: 'attention', texte: `${enRetard} tâche${enRetard > 1 ? 's' : ''} en retard` })
  return alertes
}
