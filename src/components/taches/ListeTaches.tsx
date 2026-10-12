// Liste de tâches : échéance (en retard, aujourd'hui), titre, contact ou départ, process et règle,
// responsable, modèle de message, et bouton « Fait ».
import { useState } from 'react'
import { Link } from 'react-router'
import { NOMS_PROCESS } from '../../domain/libelles'
import { etatTache } from '../../domain/taches'
import type { Tache } from '../../domain/types'
import { formatDate, formatDateHeure } from '../../lib/format'
import { useCRM } from '../../store/StoreContext'
import { TerminerTache } from './TerminerTache'

const STYLE_ETAT = {
  en_retard: 'bg-rose text-white',
  aujourdhui: 'bg-orange text-white',
  a_venir: 'bg-beige-fonce text-bordeaux',
  fait: 'bg-white text-neutral-500 border border-beige-fonce',
  annulee: 'bg-white text-neutral-400 border border-beige-fonce',
}

const LIBELLE_ETAT = { en_retard: 'En retard', aujourdhui: 'Aujourd\'hui', a_venir: 'À venir', fait: 'Fait', annulee: 'Annulée' }

export function ListeTaches({ taches, sansContact = false, vide }: { taches: Tache[]; sansContact?: boolean; vide?: string }) {
  const { base, dateReference } = useCRM()
  const [ouverte, setOuverte] = useState<Tache | null>(null)
  const noms = new Map(base.equipe.map((m) => [m.id, m.prenom]))
  const contacts = new Map(base.contacts.map((c) => [c.id, c]))
  const departs = new Map(base.departs.map((d) => [d.id, d]))

  if (taches.length === 0) {
    return <p className="rounded-lg bg-beige/60 px-4 py-6 text-center text-neutral-500">{vide ?? 'Aucune tâche.'}</p>
  }
  return (
    <>
      <ul className="divide-y divide-beige">
        {taches.map((t) => {
          const etat = etatTache(t, dateReference)
          const contact = t.contact_id ? contacts.get(t.contact_id) : undefined
          const depart = t.depart_id ? departs.get(t.depart_id) : undefined
          return (
            <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
              <span className={`libelle w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-[9px] ${STYLE_ETAT[etat]}`}>{LIBELLE_ETAT[etat]}</span>
              <span className="min-w-0 flex-1">
                <span className={`block ${etat === 'fait' || etat === 'annulee' ? 'text-neutral-500' : 'font-medium text-bordeaux'}`}>{t.titre}</span>
                <span className="block text-xs text-neutral-500">
                  {!sansContact && contact && (
                    <>
                      <Link to={`/contacts/${contact.id}`} className="font-medium text-neutral-700 hover:text-rose">
                        {contact.prenom} {contact.nom}
                      </Link>
                      {' · '}
                    </>
                  )}
                  {!contact && depart && (
                    <>
                      <Link to={`/planning/departs/${depart.id}`} className="font-medium text-neutral-700 hover:text-rose">
                        Départ {depart.offre} du {formatDate(depart.date_depart)}
                      </Link>
                      {' · '}
                    </>
                  )}
                  <span title={NOMS_PROCESS[t.process]}>Process {t.process}</span> · {t.regle_id}
                  {t.message_code && <> · modèle {t.message_code}</>}
                  {' · '}
                  {t.responsable_id ? noms.get(t.responsable_id) : 'Automatique'}
                  {etat === 'fait' && t.fait_le && ` · fait le ${formatDateHeure(t.fait_le)}${t.fait_par ? ` par ${noms.get(t.fait_par)}` : ''}`}
                  {etat === 'annulee' && t.motif_annulation && ` · annulée : ${t.motif_annulation.toLowerCase()}`}
                </span>
              </span>
              <span className="w-36 shrink-0 text-right text-[13px] text-neutral-600">{formatDateHeure(t.echeance)}</span>
              <span className="w-20 shrink-0 text-right">
                {(etat === 'en_retard' || etat === 'aujourdhui' || etat === 'a_venir') && (
                  <button type="button" className="bouton-principal px-2.5 py-1 text-xs" onClick={() => setOuverte(t)}>
                    Fait
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {ouverte && <TerminerTache tache={ouverte} onFermer={() => setOuverte(null)} />}
    </>
  )
}
