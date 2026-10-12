// Scores de tous les contacts à la date de référence, recalculés quand la base ou la date change.
import { useMemo } from 'react'
import { indexerBase, planningDe } from '../domain/donneesContact'
import { scorePrincipal, type ScoreResult } from '../domain/scoring'
import { useCRM } from '../store/StoreContext'

export function useScores() {
  const { base, dateReference } = useCRM()
  return useMemo(() => {
    const donnees = indexerBase(base)
    const planning = planningDe(base)
    const scores = new Map<string, ScoreResult>()
    for (const contact of base.contacts) {
      scores.set(contact.id, scorePrincipal(donnees(contact.id), planning, dateReference))
    }
    return { scores, donnees, planning }
  }, [base, dateReference])
}
