// Formulaire d'une action rapide ou d'une transition du pipeline : les champs viennent de la définition
// de l'action (src/domain/actions.ts), les champs obligatoires sont contrôlés avant l'enregistrement.
import { useMemo, useState, type FormEvent } from 'react'
import { executerAction, valeursParDefaut, type Champ, type ContexteAction, type DefinitionAction, type Valeurs } from '../domain/actions'
import { pointsDuCritere } from '../domain/criteres'
import { LIBELLES_STATUT } from '../domain/libelles'
import { formatDate } from '../lib/format'
import { useCRM } from '../store/StoreContext'
import { useToast } from './Toast'

export function BadgeCritere({ code }: { code: string }) {
  const points = pointsDuCritere(code)
  if (points === null) return null
  return (
    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${points < 0 ? 'bg-rose-clair text-rose-fonce' : 'bg-orange-clair text-[#A65300]'}`}>
      {code} {points > 0 ? '+' : ''}
      {points}
    </span>
  )
}

export function FormulaireAction({
  definition,
  contexte,
  onFermer,
  titre,
}: {
  definition: DefinitionAction
  contexte: () => ContexteAction
  onFermer: () => void
  /** Titre affiché à la place du libellé de l'action (transition du pipeline). */
  titre?: string
}) {
  const { appliquer, dateReference } = useCRM()
  const toast = useToast()
  const ctx = useMemo(contexte, [contexte])
  const champs = useMemo(() => definition.champs(ctx), [definition, ctx])
  const [valeurs, setValeurs] = useState<Valeurs>(() => valeursParDefaut(champs))
  const [erreurs, setErreurs] = useState<string[]>([])
  const { contact } = ctx.donnees
  const resume = definition.resume?.(valeurs, ctx)

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    // Le contexte est reconstruit au moment de l'enregistrement : l'heure de l'action est l'heure réelle.
    const resultat = executerAction(definition, valeurs, contexte())
    setErreurs(resultat.erreurs)
    if (resultat.erreurs.length > 0) return
    await appliquer(resultat.changements)
    toast(`${definition.libelle} : enregistré pour ${contact.prenom} ${contact.nom}.`)
    onFermer()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-bordeaux/40 p-6" role="dialog" aria-modal="true" onClick={onFermer}>
      <form onSubmit={enregistrer} className="carte mt-10 w-full max-w-xl animate-apparition p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="libelle mb-1 flex flex-wrap items-center gap-2 text-orange">
              <span>Process {definition.process}</span>
              {definition.critere && <BadgeCritere code={definition.critere} />}
            </p>
            <h2 className="font-titre text-3xl text-bordeaux">{titre ?? definition.libelle}</h2>
            <p className="mt-1 text-neutral-600">
              {contact.prenom} {contact.nom} · daté du {formatDate(dateReference)}
              {definition.statutVise && contact.statut !== definition.statutVise ? ` · passe en ${LIBELLES_STATUT[definition.statutVise]}` : ''}
            </p>
          </div>
          <button type="button" className="bouton-secondaire" onClick={onFermer}>
            Fermer
          </button>
        </div>

        {erreurs.length > 0 && (
          <ul className="mb-4 list-inside list-disc rounded-lg border border-rose bg-rose-clair/60 p-3 text-rose-fonce">
            {erreurs.map((erreur) => (
              <li key={erreur}>{erreur}</li>
            ))}
          </ul>
        )}

        <div className="grid gap-4">
          {champs.length === 0 && <p className="text-neutral-600">Aucune information à saisir : confirmez pour enregistrer.</p>}
          {champs.map((champ) => (
            <ChampFormulaire key={champ.cle} champ={champ} valeur={valeurs[champ.cle]} onChange={(v) => setValeurs((x) => ({ ...x, [champ.cle]: v }))} />
          ))}
        </div>

        {resume && <p className="mt-4 rounded-lg bg-beige px-3 py-2 text-sm text-bordeaux">{resume}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="bouton-secondaire" onClick={onFermer}>
            Annuler
          </button>
          <button type="submit" className="bouton-principal">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}

function ChampFormulaire({ champ, valeur, onChange }: { champ: Champ; valeur: Valeurs[string]; onChange: (v: string | boolean) => void }) {
  if (champ.type === 'case') {
    return (
      <label className="flex items-start gap-2 text-neutral-700">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-rose" checked={valeur === true} onChange={(e) => onChange(e.target.checked)} />
        <span>
          {champ.libelle}
          {champ.aide && <span className="block text-xs text-neutral-500">{champ.aide}</span>}
        </span>
      </label>
    )
  }
  const texte = valeur === undefined ? '' : String(valeur)
  return (
    <label className="flex flex-col gap-1">
      <span className="libelle text-bordeaux/80">
        {champ.libelle}
        {champ.obligatoire && <span className="text-rose"> *</span>}
      </span>
      {champ.type === 'choix' && champ.options.length <= 2 ? (
        <span className="flex gap-5 py-1">
          {champ.options.map((o) => (
            <label key={o.valeur} className="flex items-center gap-1.5 text-neutral-700">
              <input type="radio" className="accent-rose" checked={texte === o.valeur} onChange={() => onChange(o.valeur)} />
              {o.libelle}
            </label>
          ))}
        </span>
      ) : champ.type === 'choix' ? (
        <select className="champ" value={texte} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choisir</option>
          {champ.options.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.libelle}
            </option>
          ))}
        </select>
      ) : champ.type === 'zone' ? (
        <textarea className="champ min-h-[70px]" value={texte} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          className="champ"
          type={champ.type === 'nombre' ? 'number' : champ.type === 'date' ? 'date' : 'text'}
          min={champ.type === 'nombre' ? champ.min : undefined}
          max={champ.type === 'nombre' ? champ.max : undefined}
          value={texte}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {champ.aide && <span className="text-xs text-neutral-500">{champ.aide}</span>}
      {champ.type === 'choix' && champ.options.length === 0 && <span className="text-xs text-rose-fonce">Aucun choix possible pour ce contact.</span>}
    </label>
  )
}
