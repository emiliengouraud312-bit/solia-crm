// Écran Tâches (cahier des charges, section 3.6) : les tâches créées par le moteur d'automatismes,
// filtrables par responsable, par échéance et par process.
import { useMemo, useState } from 'react'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { ListeTaches } from '../components/taches/ListeTaches'
import { ecartJours } from '../domain/dates'
import { NOMS_PROCESS } from '../domain/libelles'
import { etatTache } from '../domain/taches'
import type { Tache } from '../domain/types'
import { formatDate } from '../lib/format'
import { useCRM } from '../store/StoreContext'

type Periode = 'en_retard' | 'aujourdhui' | 'semaine' | 'a_faire' | 'terminees'

const PERIODES: [Periode, string][] = [
  ['en_retard', 'En retard'],
  ['aujourdhui', 'Aujourd\'hui'],
  ['semaine', 'Cette semaine'],
  ['a_faire', 'Toutes à faire'],
  ['terminees', 'Faites et annulées'],
]

export function Taches() {
  const { base, dateReference, utilisateurId } = useCRM()
  const [qui, setQui] = useState<string>('moi')
  const [periode, setPeriode] = useState<Periode>('semaine')
  const [process, setProcess] = useState('')

  const responsable = qui === 'moi' ? utilisateurId : qui === 'equipe' ? null : qui
  const dansPeriode = (t: Tache, p: Periode) => {
    const etat = etatTache(t, dateReference)
    if (p === 'terminees') return etat === 'fait' || etat === 'annulee'
    if (p === 'en_retard') return etat === 'en_retard'
    if (p === 'aujourdhui') return etat === 'aujourdhui'
    // Cette semaine : en retard, du jour, et à échéance dans les 7 prochains jours.
    if (p === 'semaine') return etat === 'en_retard' || etat === 'aujourdhui' || (etat === 'a_venir' && ecartJours(dateReference, t.echeance) < 7)
    return etat === 'en_retard' || etat === 'aujourdhui' || etat === 'a_venir'
  }

  const candidates = useMemo(
    () => base.taches.filter((t) => (responsable === null || t.responsable_id === responsable) && (!process || t.process === process)),
    [base.taches, responsable, process],
  )
  const liste = candidates
    .filter((t) => dansPeriode(t, periode))
    .sort((a, b) => (periode === 'terminees' ? ((b.fait_le ?? b.annulee_le ?? '') < (a.fait_le ?? a.annulee_le ?? '') ? -1 : 1) : a.echeance < b.echeance ? -1 : 1))
  const compte = (p: Periode) => candidates.filter((t) => dansPeriode(t, p)).length
  const processPresents = [...new Set(base.taches.map((t) => t.process))].sort()

  return (
    <>
      <EnTeteEcran titre="Tâches" sousTitre={`Au ${formatDate(dateReference)}`} />
      <section className="carte mb-4 flex flex-wrap items-end gap-4 p-4">
        <label className="flex flex-col gap-1">
          <span className="libelle text-[10px] text-bordeaux/70">Responsable</span>
          <select className="champ w-48" value={qui} onChange={(e) => setQui(e.target.value)}>
            <option value="moi">À moi ({base.equipe.find((m) => m.id === utilisateurId)?.prenom})</option>
            <option value="equipe">Toute l'équipe</option>
            {base.equipe.map((m) => (
              <option key={m.id} value={m.id}>
                {m.prenom}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="libelle text-[10px] text-bordeaux/70">Process</span>
          <select className="champ w-72" value={process} onChange={(e) => setProcess(e.target.value)}>
            <option value="">Tous les process</option>
            {processPresents.map((p) => (
              <option key={p} value={p}>
                {p} · {NOMS_PROCESS[p]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {PERIODES.map(([code, libelle]) => (
            <button
              key={code}
              type="button"
              onClick={() => setPeriode(code)}
              className={`rounded-full border px-3 py-1.5 text-xs ${periode === code ? 'border-rose bg-rose text-white' : 'border-beige-fonce bg-white text-neutral-700 hover:border-rose'}`}
            >
              {libelle} <span className={periode === code ? 'text-white/80' : 'text-neutral-400'}>{compte(code)}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="carte px-4 py-2">
        <ListeTaches
          taches={liste}
          vide={
            periode === 'en_retard'
              ? 'Aucune tâche en retard : bravo !'
              : 'Aucune tâche pour ces filtres. Avancez la date de référence pour voir le moteur en créer de nouvelles.'
          }
        />
      </section>
    </>
  )
}
