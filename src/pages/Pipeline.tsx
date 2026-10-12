// Pipeline (cahier des charges, section 3.3) : une colonne par statut, des cartes déplaçables.
// Déplacer une carte ouvre le formulaire de l'action qui fait la transition, avec les champs
// obligatoires du nouveau statut (process 19). Une transition impossible est expliquée.
import { useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router'
import { BadgeCible, Score } from '../components/Badges'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { FormulaireAction } from '../components/FormulaireAction'
import { IconeRecherche } from '../components/Icones'
import { useToast } from '../components/Toast'
import { action, type DefinitionAction } from '../domain/actions'
import { ecartJours, estPasse } from '../domain/dates'
import { LIBELLES_CIBLE, LIBELLES_STATUT, ORDRE_STATUTS } from '../domain/libelles'
import { estAmbassadeur } from '../domain/parcours'
import { actionDeTransition, raisonTransitionImpossible, reservationCourante } from '../domain/statuts'
import type { Cible, Contact, Statut } from '../domain/types'
import { formatDate } from '../lib/format'
import { useContexteAction } from '../lib/useContexteAction'
import { useScores } from '../lib/useScores'
import { useCRM } from '../store/StoreContext'

const normaliser = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Pipeline() {
  const { base, dateReference } = useCRM()
  const { scores, donnees } = useScores()
  const obtenirContexte = useContexteAction()
  const toast = useToast()
  const [recherche, setRecherche] = useState('')
  const [cible, setCible] = useState<Cible | ''>('')
  const [referente, setReferente] = useState('')
  const [survol, setSurvol] = useState<Statut | null>(null)
  const [transition, setTransition] = useState<{ contact: Contact; vers: Statut; definition: DefinitionAction } | null>(null)

  const colonnes = useMemo(() => {
    const texte = normaliser(recherche.trim())
    const contacts = base.contacts.filter(
      (c) =>
        estPasse(c.date_creation, dateReference) &&
        (!texte || normaliser(`${c.prenom} ${c.nom}`).includes(texte)) &&
        (!cible || c.cible === cible) &&
        (!referente || c.referente_id === referente),
    )
    return ORDRE_STATUTS.map((statut) => ({
      statut,
      cartes: contacts
        .filter((c) => c.statut === statut)
        .map((c) => {
          const d = donnees(c.id)
          const derniere = d.evenements.filter((e) => e.type !== 'statut' && estPasse(e.date, dateReference)).reduce<string | null>((m, e) => (!m || e.date > m ? e.date : m), null)
          const reservation = reservationCourante(d, dateReference)
          const departVise = base.departs.find((x) => x.id === (reservation?.depart_id ?? c.envie_depart_id))
          return { contact: c, score: scores.get(c.id), derniere, departVise, ambassadeur: estAmbassadeur(d, dateReference) }
        })
        .sort((a, b) => (b.score?.score ?? -1) - (a.score?.score ?? -1)),
    }))
  }, [base, dateReference, recherche, cible, referente, scores, donnees])

  function deposer(e: DragEvent, vers: Statut) {
    e.preventDefault()
    setSurvol(null)
    const contact = base.contacts.find((c) => c.id === e.dataTransfer.getData('text/plain'))
    if (!contact || contact.statut === vers) return
    const idAction = actionDeTransition(contact.statut, vers)
    if (!idAction) {
      toast(raisonTransitionImpossible(contact.statut, vers), 'erreur')
      return
    }
    const definition = action(idAction)
    const ctx = obtenirContexte(contact.id)
    if (!definition.disponible(ctx)) {
      const explication = definition.verifier?.({}, ctx)[0]
      toast(explication ?? `${LIBELLES_STATUT[vers]} : transition impossible pour ${contact.prenom} ${contact.nom} à cette date.`, 'erreur')
      return
    }
    setTransition({ contact, vers, definition })
  }

  return (
    <>
      <EnTeteEcran titre="Pipeline" sousTitre="Faites glisser une carte pour changer le statut" />

      <div className="carte mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="libelle text-bordeaux/70">Recherche</span>
          <span className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <IconeRecherche />
            </span>
            <input className="champ pl-9" placeholder="Prénom ou nom" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="libelle text-bordeaux/70">Cible</span>
          <select className="champ w-auto" value={cible} onChange={(e) => setCible(e.target.value as Cible | '')}>
            <option value="">Toutes</option>
            {Object.entries(LIBELLES_CIBLE).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="libelle text-bordeaux/70">Référente</span>
          <select className="champ w-auto" value={referente} onChange={(e) => setReferente(e.target.value)}>
            <option value="">Toutes</option>
            {base.equipe
              .filter((m) => m.cible_referente)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.prenom}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {colonnes.map(({ statut, cartes }) => (
          <section
            key={statut}
            onDragOver={(e) => {
              e.preventDefault()
              setSurvol(statut)
            }}
            onDragLeave={() => setSurvol((s) => (s === statut ? null : s))}
            onDrop={(e) => deposer(e, statut)}
            className={`flex max-h-[calc(100vh-250px)] w-60 shrink-0 flex-col rounded-xl border bg-beige-fonce/40 transition ${
              survol === statut ? 'border-rose bg-rose-clair/50' : 'border-beige-fonce'
            }`}
          >
            <header className="flex items-center justify-between px-3 py-2.5">
              <h2 className="libelle text-[11px] text-bordeaux">{LIBELLES_STATUT[statut]}</h2>
              <span className="rounded-full bg-white px-2 text-xs text-neutral-600">{cartes.length}</span>
            </header>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {cartes.map(({ contact, score, derniere, departVise, ambassadeur }) => (
                <article
                  key={contact.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', contact.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="cursor-grab rounded-lg border border-beige-fonce bg-white p-2.5 shadow-sm active:cursor-grabbing"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <Link to={`/contacts/${contact.id}`} className="font-medium leading-tight text-bordeaux hover:text-rose" draggable={false}>
                      {contact.prenom} {contact.nom}
                    </Link>
                    <BadgeCible cible={contact.cible} />
                  </div>
                  {score && (
                    <div className="mb-1 scale-90 origin-left">
                      <Score resultat={score} />
                    </div>
                  )}
                  {departVise && (
                    <p className="truncate text-xs text-neutral-600" title={`${departVise.offre} du ${formatDate(departVise.date_depart)}`}>
                      {departVise.offre} · {formatDate(departVise.date_depart)}
                    </p>
                  )}
                  <p className="mt-0.5 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>{derniere ? `Dernière action il y a ${ecartJours(derniere, dateReference)} j` : 'Aucune action'}</span>
                    {ambassadeur && <span className="libelle rounded bg-orange px-1 text-[8px] text-white">Ambassadeur</span>}
                  </p>
                </article>
              ))}
              {cartes.length === 0 && <p className="px-1 py-4 text-center text-xs text-neutral-400">Aucune fiche</p>}
            </div>
          </section>
        ))}
      </div>

      {transition && (
        <FormulaireAction
          definition={transition.definition}
          contexte={() => obtenirContexte(transition.contact.id)}
          titre={`Passage en ${LIBELLES_STATUT[transition.vers]}`}
          onFermer={() => setTransition(null)}
        />
      )}
    </>
  )
}
