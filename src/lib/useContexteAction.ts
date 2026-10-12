// Contexte d'exécution des actions rapides pour un contact : base, données, date, auteur.
import { useCallback } from 'react'
import type { ContexteAction } from '../domain/actions'
import { maintenantA } from '../domain/evenements'
import { useCRM } from '../store/StoreContext'
import { useScores } from './useScores'

export function useContexteAction() {
  const { base, dateReference, utilisateurId } = useCRM()
  const { donnees } = useScores()
  return useCallback(
    (contactId: string): ContexteAction => ({
      base,
      donnees: donnees(contactId),
      dateReference,
      maintenant: maintenantA(dateReference),
      auteur: utilisateurId,
      nouvelId: () => crypto.randomUUID(),
    }),
    [base, donnees, dateReference, utilisateurId],
  )
}
