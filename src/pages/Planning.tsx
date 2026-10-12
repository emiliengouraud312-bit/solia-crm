// Planning interne (cahier des charges, section 3.5) : départs (couleur de la cible) et activités
// hebdomadaires, en calendrier mensuel ou en liste. C'est la source de tous les automatismes.
import { useState } from 'react'
import { Link } from 'react-router'
import { BadgeCible } from '../components/Badges'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { ajouterJours, ajouterMois, estPasse, jour, jourSemaine, numeroJour } from '../domain/dates'
import { LIBELLES_CIBLE } from '../domain/libelles'
import { placesRestantes } from '../domain/planning'
import type { Activite, Cible, Depart } from '../domain/types'
import { formatDate, formatMontant } from '../lib/format'
import { useCRM } from '../store/StoreContext'

export const COULEUR_CIBLE: Record<Cible, string> = {
  senior: 'bg-orange text-white',
  parent_solo: 'bg-bordeaux text-white',
  celibataire: 'bg-rose text-white',
}

const COULEUR_CIBLE_CLAIRE: Record<Cible, string> = {
  senior: 'bg-orange-clair text-[#A65300]',
  parent_solo: 'bg-[#EEDFE4] text-bordeaux',
  celibataire: 'bg-rose-clair text-rose-fonce',
}

const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export function Planning() {
  const { dateReference } = useCRM()
  const [vue, setVue] = useState<'calendrier' | 'liste'>('calendrier')
  const [mois, setMois] = useState(`${dateReference.slice(0, 7)}-01`)
  const [cible, setCible] = useState<Cible | ''>('')

  return (
    <>
      <EnTeteEcran
        titre="Planning"
        sousTitre="Départs et activités"
        actions={
          <div className="flex rounded-lg border border-beige-fonce bg-white p-0.5">
            {(['calendrier', 'liste'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVue(v)}
                className={`rounded-md px-3 py-1 text-sm ${vue === v ? 'bg-bordeaux text-white' : 'text-bordeaux hover:bg-beige'}`}
              >
                {v === 'calendrier' ? 'Calendrier' : 'Liste'}
              </button>
            ))}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="libelle text-[10px] text-bordeaux/70">Cible</span>
        {(['', 'senior', 'parent_solo', 'celibataire'] as const).map((c) => (
          <button
            key={c || 'toutes'}
            type="button"
            onClick={() => setCible(c)}
            className={`rounded-full border px-3 py-1 text-xs ${cible === c ? 'border-rose bg-rose text-white' : 'border-beige-fonce bg-white text-neutral-700 hover:border-rose'}`}
          >
            {c ? LIBELLES_CIBLE[c] : 'Toutes'}
          </button>
        ))}
      </div>
      {vue === 'calendrier' ? <Calendrier mois={mois} setMois={setMois} cible={cible} /> : <Liste cible={cible} />}
    </>
  )
}

function Calendrier({ mois, setMois, cible }: { mois: string; setMois: (m: string) => void; cible: Cible | '' }) {
  const { base, dateReference } = useCRM()
  const departs = base.departs.filter((d) => !cible || d.cible === cible)
  const activites = base.activites.filter((a) => !cible || a.cible === cible || a.ouverte_a_tous)
  // Grille du lundi précédant le 1er au dimanche suivant la fin du mois.
  const debut = ajouterJours(mois, -((jourSemaine(mois) + 6) % 7))
  const finMois = ajouterJours(ajouterMois(mois, 1), -1)
  const fin = ajouterJours(finMois, (7 - jourSemaine(finMois)) % 7)
  const jours: string[] = []
  for (let j = debut; numeroJour(j) <= numeroJour(fin); j = ajouterJours(j, 1)) jours.push(j)
  const [annee, numMois] = mois.split('-').map(Number)

  return (
    <section className="carte p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" className="bouton-secondaire" onClick={() => setMois(ajouterMois(mois, -1))}>
          ‹ Mois précédent
        </button>
        <div className="text-center">
          <h2 className="font-label text-lg uppercase tracking-wide text-bordeaux">
            {NOMS_MOIS[numMois - 1]} {annee}
          </h2>
          {mois.slice(0, 7) !== dateReference.slice(0, 7) && (
            <button type="button" className="text-xs text-rose hover:underline" onClick={() => setMois(`${dateReference.slice(0, 7)}-01`)}>
              Revenir au mois de la date de référence
            </button>
          )}
        </div>
        <button type="button" className="bouton-secondaire" onClick={() => setMois(ajouterMois(mois, 1))}>
          Mois suivant ›
        </button>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-beige-fonce text-xs">
        {JOURS_COURTS.map((j) => (
          <div key={j} className="libelle border-b border-beige-fonce bg-beige px-2 py-1.5 text-[10px] text-bordeaux/70">
            {j}
          </div>
        ))}
        {jours.map((j) => {
          const dansLeMois = j.slice(0, 7) === mois.slice(0, 7)
          const estRef = j === dateReference
          const enCours = departs.filter((d) => numeroJour(d.date_depart) <= numeroJour(j) && numeroJour(j) <= numeroJour(d.date_retour))
          const soirees = departs.flatMap((d) => [
            ...(jour(d.soliapero_brise_glace) === j ? [{ d, libelle: 'Soli\'apéro brise-glace' }] : []),
            ...(jour(d.soliapero_retour) === j ? [{ d, libelle: 'Soli\'apéro retour' }] : []),
          ])
          const duJour = activites.filter((a) => a.date === j)
          return (
            <div key={j} className={`min-h-[104px] border-b border-r border-beige p-1 ${dansLeMois ? 'bg-white' : 'bg-beige/40 text-neutral-400'}`}>
              <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${estRef ? 'bg-rose font-semibold text-white' : ''}`}>
                {Number(j.slice(8))}
              </div>
              <div className="space-y-0.5">
                {enCours.map((d) => {
                  const premier = d.date_depart === j || jourSemaine(j) === 1
                  return (
                    <Link
                      key={d.id}
                      to={`/planning/departs/${d.id}`}
                      title={`${d.offre} du ${formatDate(d.date_depart)} au ${formatDate(d.date_retour)}`}
                      className={`block truncate rounded px-1 py-0.5 text-[11px] font-medium ${COULEUR_CIBLE[d.cible]} ${dansLeMois ? '' : 'opacity-50'}`}
                    >
                      {premier ? (d.date_depart === j ? `Départ ${d.offre}` : d.offre) : ' '}
                    </Link>
                  )
                })}
                {soirees.map(({ d, libelle }) => (
                  <Link
                    key={`${d.id}${libelle}`}
                    to={`/planning/departs/${d.id}`}
                    className={`block truncate rounded border border-orange px-1 py-0.5 text-[11px] text-[#A65300] hover:bg-orange-clair ${dansLeMois ? '' : 'opacity-50'}`}
                    title={`${libelle} de ${d.offre}`}
                  >
                    {libelle} · {d.offre}
                  </Link>
                ))}
                {duJour.map((a) => (
                  <Link
                    key={a.id}
                    to={`/planning/activites/${a.id}`}
                    className={`block truncate rounded px-1 py-0.5 text-[11px] ${COULEUR_CIBLE_CLAIRE[a.cible]} ${dansLeMois ? '' : 'opacity-50'}`}
                    title={`${a.heure.replace(':', ' h ')} ${a.titre}${a.ouverte_a_tous ? ' (ouverte à tous)' : ''}`}
                  >
                    {a.heure.replace(':', ' h ')} {a.titre}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        {(['senior', 'parent_solo', 'celibataire'] as const).map((c) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span className={`h-3 w-3 rounded ${COULEUR_CIBLE[c]}`} /> {LIBELLES_CIBLE[c]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-orange" /> Soli'apéro
        </span>
        <span>Les activités sont en couleur claire ; la première de chaque mois est ouverte à tous.</span>
      </p>
    </section>
  )
}

function Liste({ cible }: { cible: Cible | '' }) {
  const { base, dateReference } = useCRM()
  const [passes, setPasses] = useState(false)
  const garder = (date: string) => (passes ? estPasse(date, dateReference) : !estPasse(date, ajouterJours(dateReference, -1)))
  const departs = base.departs.filter((d) => (!cible || d.cible === cible) && garder(d.date_retour))
  const activites = base.activites.filter((a) => (!cible || a.cible === cible) && garder(a.date))
  const lignes: ({ type: 'depart'; date: string; d: Depart } | { type: 'activite'; date: string; a: Activite })[] = [
    ...departs.map((d) => ({ type: 'depart' as const, date: d.date_depart, d })),
    ...activites.map((a) => ({ type: 'activite' as const, date: a.date, a })),
  ].sort((x, y) => (x.date === y.date ? 0 : (x.date < y.date) !== passes ? -1 : 1))

  return (
    <section className="carte p-4">
      <div className="mb-3 flex gap-2">
        {[false, true].map((p) => (
          <button
            key={String(p)}
            type="button"
            onClick={() => setPasses(p)}
            className={`rounded-full border px-3 py-1 text-xs ${passes === p ? 'border-rose bg-rose text-white' : 'border-beige-fonce text-neutral-700 hover:border-rose'}`}
          >
            {p ? 'Passés' : 'À venir et en cours'}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="libelle text-[10px] text-bordeaux/70">
            <tr>
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Départ ou activité</th>
              <th className="py-2 pr-3 font-medium">Cible</th>
              <th className="py-2 pr-3 font-medium">Remplissage</th>
              <th className="py-2 pr-3 font-medium">Repères</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) =>
              l.type === 'depart' ? (
                <LigneDepart key={l.d.id} d={l.d} />
              ) : (
                <tr key={l.a.id} className="border-t border-beige">
                  <td className="whitespace-nowrap py-2 pr-3 text-neutral-600">
                    {formatDate(l.a.date)} à {l.a.heure.replace(':', ' h ')}
                  </td>
                  <td className="py-2 pr-3">
                    <Link to={`/planning/activites/${l.a.id}`} className="hover:text-rose">
                      {l.a.titre}
                    </Link>
                    <span className="block text-xs text-neutral-500">
                      Activité · {l.a.lieu} · {l.a.ouverte_a_tous ? 'ouverte à tous' : 'réservée aux abonnés'}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <BadgeCible cible={l.a.cible} />
                  </td>
                  <td className="py-2 pr-3 text-neutral-600">
                    {base.participations.filter((p) => p.activite_id === l.a.id && p.inscrit).length} inscrits sur {l.a.capacite}
                  </td>
                  <td className="py-2 pr-3 text-neutral-500" />
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function LigneDepart({ d }: { d: Depart }) {
  const { base, dateReference } = useCRM()
  const restantes = placesRestantes(d, base.reservations, dateReference)
  const reservees = d.places_max - restantes
  return (
    <tr className="border-t border-beige">
      <td className="whitespace-nowrap py-2 pr-3 text-neutral-600">
        {formatDate(d.date_depart)} au {formatDate(d.date_retour)}
      </td>
      <td className="py-2 pr-3">
        <Link to={`/planning/departs/${d.id}`} className="font-medium text-bordeaux hover:text-rose">
          {d.offre}
        </Link>
        <span className="block text-xs text-neutral-500">Départ · {formatMontant(d.prix_ttc)} · animatrice {base.equipe.find((m) => m.id === d.animatrice_id)?.prenom}</span>
      </td>
      <td className="py-2 pr-3">
        <BadgeCible cible={d.cible} />
      </td>
      <td className="py-2 pr-3">
        <JaugeRemplissage reservees={reservees} places={d.places_max} />
      </td>
      <td className="py-2 pr-3 text-xs text-neutral-500">
        Brise-glace {formatDate(d.soliapero_brise_glace)} · solde au {formatDate(d.echeance_solde)}
      </td>
    </tr>
  )
}

export function JaugeRemplissage({ reservees, places }: { reservees: number; places: number }) {
  const taux = places > 0 ? Math.round((reservees / places) * 100) : 0
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2 w-24 overflow-hidden rounded-full bg-beige-fonce">
        <span className={`block h-full rounded-full ${taux >= 100 ? 'bg-bordeaux' : taux >= 70 ? 'bg-rose' : 'bg-orange'}`} style={{ width: `${Math.min(100, taux)}%` }} />
      </span>
      <span className="whitespace-nowrap text-neutral-700">
        {reservees}/{places} {taux >= 100 ? '(complet)' : ''}
      </span>
    </span>
  )
}
