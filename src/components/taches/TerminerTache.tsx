// « Fait » sur une tâche (cahier des charges, section 3.6) : si la tâche se réalise par une action de la fiche
// (réponse, devis, solde...), le formulaire de l'action s'ouvre ; si un modèle de message est associé, le message
// rendu s'affiche avant validation (« Envoyer, simulation ») ; sinon la tâche est simplement marquée faite.
import { useCallback, useMemo } from 'react'
import { action } from '../../domain/actions'
import { maintenantA } from '../../domain/evenements'
import { NOMS_PROCESS } from '../../domain/libelles'
import { apercuTache, terminerTache } from '../../domain/taches'
import type { Tache } from '../../domain/types'
import { formatDateHeure } from '../../lib/format'
import { useContexteAction } from '../../lib/useContexteAction'
import { useCRM } from '../../store/StoreContext'
import { FormulaireAction } from '../FormulaireAction'
import { useToast } from '../Toast'
import { ApercuMessage } from './ApercuMessage'

export function TerminerTache({ tache, onFermer }: { tache: Tache; onFermer: () => void }) {
  const { base, dateReference, utilisateurId, appliquer } = useCRM()
  const contexteAction = useContexteAction()
  const toast = useToast()
  const contexte = useCallback(() => contexteAction(tache.contact_id as string), [contexteAction, tache.contact_id])
  const definition = tache.action_id && tache.contact_id ? action(tache.action_id) : null
  const actionPossible = definition ? definition.disponible(contexte()) : false
  const apercu = useMemo(() => apercuTache(base, tache, maintenantA(dateReference)), [base, tache, dateReference])

  if (definition && actionPossible) {
    return <FormulaireAction definition={definition} contexte={contexte} onFermer={onFermer} titre={tache.titre} />
  }

  async function valider() {
    const changements = terminerTache(base, tache, {
      date: maintenantA(dateReference),
      auteur: utilisateurId,
      nouvelId: () => crypto.randomUUID(),
    })
    const resume = await appliquer(changements)
    const envoi = apercu
      ? ` Message ${tache.message_code} tracé dans le journal de ${apercu.destinataires.length > 1 ? `${apercu.destinataires.length} voyageurs` : `${apercu.destinataires[0].prenom} ${apercu.destinataires[0].nom}`} (simulation).`
      : ''
    toast(`Tâche faite.${envoi}${resume ? ` ${resume}` : ''}`)
    onFermer()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-bordeaux/40 p-6" role="dialog" aria-modal="true" onClick={onFermer}>
      <div className="carte mt-10 w-full max-w-2xl animate-apparition p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="libelle mb-1 text-orange">
              Process {tache.process} · {NOMS_PROCESS[tache.process]} · {tache.regle_id}
            </p>
            <h2 className="font-titre text-3xl text-bordeaux">{tache.titre}</h2>
            <p className="mt-1 text-neutral-600">Échéance : {formatDateHeure(tache.echeance)}</p>
          </div>
          <button type="button" className="bouton-secondaire" onClick={onFermer}>
            Fermer
          </button>
        </div>
        {definition && !actionPossible && (
          <p className="mb-4 rounded-lg bg-beige px-3 py-2 text-neutral-700">
            L'action « {definition.libelle} » n'est plus proposée pour ce contact à cette date : la tâche peut être marquée faite.
          </p>
        )}
        {apercu ? (
          <ApercuMessage rendu={apercu.rendu} destinataires={apercu.destinataires} />
        ) : (
          <p className="text-neutral-700">Aucun message associé : la tâche sera marquée faite le {formatDateHeure(maintenantA(dateReference))}.</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="bouton-secondaire" onClick={onFermer}>
            Annuler
          </button>
          <button type="button" className="bouton-principal" onClick={valider}>
            {apercu ? 'Envoyer (simulation)' : 'Marquer comme fait'}
          </button>
        </div>
      </div>
    </div>
  )
}
