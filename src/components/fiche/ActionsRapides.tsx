// Actions rapides de la fiche (cahier des charges, section 3.4) : chaque action crée un événement daté
// et recalcule les scores. Seules les actions possibles pour le statut du contact sont proposées.
import { useState } from 'react'
import { actionsDisponibles, type ContexteAction, type DefinitionAction, type GroupeAction } from '../../domain/actions'
import type { Statut } from '../../domain/types'
import { formatDate } from '../../lib/format'
import { BadgeCritere, FormulaireAction } from '../FormulaireAction'

const ORDRE: GroupeAction[] = [
  'Considération',
  'Achat',
  'Avant le départ',
  'Pendant le séjour',
  'Après le voyage',
  'Loyauté',
  'Digital et coordonnées',
  'Suivi',
]

const GROUPES_PAR_STATUT: Record<Statut, GroupeAction[]> = {
  contact: ['Considération'],
  prospect: ['Considération', 'Achat'],
  devis_envoye: ['Achat', 'Considération'],
  perdu: ['Considération'],
  reserve: ['Achat', 'Avant le départ'],
  solde: ['Avant le départ', 'Pendant le séjour'],
  voyageur: ['Après le voyage', 'Loyauté'],
  abonne: ['Loyauté'],
  ancien_abonne: ['Loyauté'],
}

export function ActionsRapides({ contexte }: { contexte: () => ContexteAction }) {
  const ctx = contexte()
  const [ouverte, setOuverte] = useState<DefinitionAction | null>(null)
  const [ouvertures, setOuvertures] = useState<Partial<Record<GroupeAction, boolean>>>({})
  const disponibles = actionsDisponibles(ctx)
  // Pour un client, les groupes du voyage passent avant la considération ; après un devis, l'achat passe en tête.
  const client = ctx.donnees.reservations.length > 0
  const devisEnvoye = ctx.donnees.contact.statut === 'devis_envoye'
  const poids = (g: GroupeAction) =>
    (client && g === 'Considération') ? ORDRE.length : devisEnvoye && g === 'Achat' ? -1 : ORDRE.indexOf(g)
  const prioritaires = ORDRE.map((groupe) => ({ groupe, actions: disponibles.filter((a) => a.groupe === groupe) }))
    .filter((g) => g.actions.length > 0)
    .sort((a, b) => poids(a.groupe) - poids(b.groupe))
  // Le groupe qui correspond à l'étape du contact est ouvert par défaut.
  const parDefaut = GROUPES_PAR_STATUT[ctx.donnees.contact.statut]
  const estOuvert = (groupe: GroupeAction, rang: number) => ouvertures[groupe] ?? (parDefaut.includes(groupe) || (rang === 0 && !prioritaires.some((g) => parDefaut.includes(g.groupe))))
  const basculer = (groupe: GroupeAction, rang: number) => setOuvertures((o) => ({ ...o, [groupe]: !estOuvert(groupe, rang) }))

  return (
    <section className="carte p-4">
      <h2 className="libelle mb-1 text-bordeaux">Actions rapides</h2>
      <p className="mb-3 text-xs text-neutral-500">
        Chaque action crée un événement daté du {formatDate(ctx.dateReference)} et recalcule les scores.
      </p>
      <div className="space-y-2">
        {prioritaires.map(({ groupe, actions }, rang) => (
          <div key={groupe} className="rounded-lg border border-beige-fonce">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left"
              onClick={() => basculer(groupe, rang)}
              aria-expanded={estOuvert(groupe, rang)}
            >
              <span className="libelle text-[10px] text-bordeaux/80">{groupe}</span>
              <span className="text-xs text-neutral-400">
                {actions.length} {estOuvert(groupe, rang) ? '▴' : '▾'}
              </span>
            </button>
            {estOuvert(groupe, rang) && (
              <div className="flex flex-col gap-1 border-t border-beige-fonce p-2">
                {actions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setOuverte(a)}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-800 hover:bg-rose-clair/60"
                  >
                    <span>{a.libelle}</span>
                    {a.critere && <BadgeCritere code={a.critere} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {ouverte && <FormulaireAction definition={ouverte} contexte={contexte} onFermer={() => setOuverte(null)} />}
    </section>
  )
}
