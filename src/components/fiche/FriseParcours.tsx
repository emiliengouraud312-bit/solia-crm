// La frise du parcours client, signature visuelle du CRM (cahier des charges, section 4) :
// 7 phases, 24 jalons, le PIN Solia sur l'étape actuelle, et sous la frise les événements
// du journal rangés par phase, avec leurs points.
import { useEffect, useRef, useState } from 'react'
import type { ElementJournal } from '../../domain/journal'
import { phaseDeLEvenement, type CodePhase, type Parcours, type PointsEvenement } from '../../domain/parcours'
import { formatDate, formatDateHeure, formatPoints } from '../../lib/format'
import { PinSolia } from '../PinSolia'

const NOMBRE_JALONS = 24
const position = (indice: number) => ((indice + 0.5) / NOMBRE_JALONS) * 100
const jourMois = (date: string) => formatDate(date).slice(0, 5)

export function FriseParcours({
  contactId,
  parcours,
  journal,
  points,
  nomsEquipe,
  libelleVoyage,
  onChoisirVoyage,
}: {
  contactId: string
  parcours: Parcours
  journal: ElementJournal[]
  points: Map<string, PointsEvenement[]>
  nomsEquipe: Map<string, string>
  libelleVoyage: (reservationId: string) => string
  onChoisirVoyage: (reservationId: string) => void
}) {
  const { actuel, grise, mention } = parcours
  const indice = actuel?.indice ?? -1

  // Le PIN saute quand une action le fait avancer (même contact, même voyage).
  const precedent = useRef<{ cle: string; indice: number } | null>(null)
  const [saut, setSaut] = useState(0)
  const cle = `${contactId}:${parcours.reservation?.id ?? ''}`
  useEffect(() => {
    if (precedent.current?.cle === cle && indice > precedent.current.indice) setSaut((n) => n + 1)
    precedent.current = { cle, indice }
  }, [cle, indice])

  // Pastilles : les éléments du journal qui appartiennent au voyage affiché, rangés par phase.
  const idsVoyage = new Set(parcours.evenements.map((e) => e.id))
  const dates = parcours.evenements.map((e) => e.date).sort()
  const voyageEnCours = !parcours.reservation || parcours.reservation.id === parcours.voyages[0]?.id
  const dansLeVoyage = (date: string) =>
    parcours.voyages.length <= 1 || ((dates[0] ?? '') <= date && (voyageEnCours || date <= (dates[dates.length - 1] ?? '')))
  const elements = journal.filter((el) => (el.source === 'evenement' ? idsVoyage.has(el.id) : dansLeVoyage(el.date)))
  const parPhase = new Map<CodePhase, ElementJournal[]>()
  for (const el of [...elements].reverse()) {
    if (el.source === 'consentement' && !points.has(el.id)) continue
    const phase = phaseDeLEvenement(el, parcours)
    if (!phase) continue
    parPhase.set(phase, [...(parPhase.get(phase) ?? []), el])
  }

  return (
    <section className="carte p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="libelle mb-1 text-bordeaux">Parcours client</h2>
          {actuel ? (
            <p className="text-neutral-700">
              Étape actuelle : <strong className="text-bordeaux">{actuel.libelle}</strong> ({parcours.phases.find((p) => p.code === actuel.phase)?.libelle}) depuis le{' '}
              {formatDate(actuel.date)}
            </p>
          ) : (
            <p className="text-neutral-500">La fiche n'existe pas encore à cette date.</p>
          )}
          {mention && <p className="mt-1 font-medium text-rose-fonce">{mention}</p>}
        </div>
        {parcours.voyages.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="libelle text-bordeaux/70">Voyage</span>
            <select className="champ w-auto" value={parcours.reservation?.id ?? ''} onChange={(e) => onChoisirVoyage(e.target.value)} disabled={parcours.voyages.length < 2}>
              {parcours.voyages.map((r, i) => (
                <option key={r.id} value={r.id}>
                  {i === 0 ? 'Dernier voyage : ' : 'Voyage précédent : '}
                  {libelleVoyage(r.id)}
                  {r.statut === 'annulee' ? ' (annulé)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px] px-8">
          {/* Phases */}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${NOMBRE_JALONS}, minmax(0, 1fr))` }}>
            {parcours.phases.map((phase, i) => {
              const atteinte = phase.jalons.some((j) => j.atteint)
              const courante = actuel?.phase === phase.code
              return (
                <div
                  key={phase.code}
                  style={{ gridColumn: `span ${phase.jalons.length}` }}
                  className={`border-l border-beige-fonce px-2 pb-2 first:border-l-0 ${i % 2 ? 'bg-beige/50' : ''}`}
                  title={`Points ${phase.points} du parcours client · process ${phase.process}`}
                >
                  <p className={`libelle text-[11px] ${courante ? 'text-rose' : atteinte ? 'text-bordeaux' : 'text-neutral-400'}`}>{phase.libelle}</p>
                  <p className="text-[10px] text-neutral-400">Process {phase.process}</p>
                </div>
              )
            })}
          </div>

          {/* Ligne des jalons et PIN */}
          <div className="relative h-[146px]">
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${NOMBRE_JALONS}, minmax(0, 1fr))` }}>
              {parcours.phases.map((phase, i) => (
                <div key={phase.code} style={{ gridColumn: `span ${phase.jalons.length}` }} className={`border-l border-beige-fonce first:border-l-0 ${i % 2 ? 'bg-beige/50' : ''}`} />
              ))}
            </div>
            <div className="absolute left-0 right-0 top-[46px] h-[3px] rounded bg-beige-fonce" />
            {indice >= 0 && (
              <div
                className={`absolute left-0 top-[46px] h-[3px] rounded ${grise ? 'bg-neutral-300' : 'bg-rose'}`}
                style={{ width: `${position(indice)}%`, transition: 'width 0.9s ease' }}
              />
            )}
            {parcours.jalons.map((jalon) => {
              const estActuel = jalon.indice === indice
              const ligne2 = jalon.indice % 2 === 1
              return (
                <div key={jalon.code}>
                  <span
                    className={`absolute top-[41px] h-[13px] w-[13px] -translate-x-1/2 rounded-full border-2 ${
                      jalon.atteint ? (grise ? 'border-neutral-400 bg-neutral-300' : 'border-rose bg-rose') : 'border-neutral-300 bg-white'
                    } ${estActuel && !grise ? 'ring-4 ring-rose/25' : ''}`}
                    style={{ left: `${position(jalon.indice)}%` }}
                    title={`${jalon.libelle}${jalon.date ? ` : ${formatDateHeure(jalon.date)}` : ' : à venir'}${jalon.detail ? ` (${jalon.detail})` : ''}`}
                  />
                  {ligne2 && <span className="absolute top-[56px] h-[40px] w-px bg-beige-fonce" style={{ left: `${position(jalon.indice)}%` }} />}
                  <div
                    className="absolute -translate-x-1/2 text-center leading-tight"
                    style={{ left: `${position(jalon.indice)}%`, top: ligne2 ? 99 : 58, width: `${190 / NOMBRE_JALONS}%` }}
                  >
                    <p className={`text-[10.5px] ${jalon.atteint ? (estActuel ? 'font-semibold text-rose' : 'text-bordeaux') : 'text-neutral-400'}`}>{jalon.libelle}</p>
                    {jalon.date && jalon.atteint && <p className="text-[10px] text-neutral-500">{jourMois(jalon.date)}</p>}
                  </div>
                </div>
              )
            })}
            {actuel && (
              <div
                className="absolute top-[6px] z-10 -translate-x-1/2"
                style={{ left: `${position(indice)}%`, transition: 'left 0.9s cubic-bezier(0.34, 1.3, 0.64, 1)' }}
                title={`Étape actuelle : ${actuel.libelle} depuis le ${formatDate(actuel.date)}`}
              >
                <div key={saut} className={saut > 0 ? 'animate-saut' : ''}>
                  <PinSolia taille={30} grise={grise} />
                </div>
              </div>
            )}
          </div>

          {/* Pastilles du journal, rangées par phase */}
          <div className="grid border-t border-beige-fonce pt-2" style={{ gridTemplateColumns: `repeat(${NOMBRE_JALONS}, minmax(0, 1fr))` }}>
            {parcours.phases.map((phase) => {
              const liste = parPhase.get(phase.code) ?? []
              const visibles = liste.slice(-6)
              const caches = liste.length - visibles.length
              return (
                <div key={phase.code} style={{ gridColumn: `span ${phase.jalons.length}` }} className="flex flex-col gap-1 px-1">
                  {caches > 0 && (
                    <span className="text-center text-[10px] text-neutral-500" title={liste.slice(0, caches).map((el) => `${jourMois(el.date)} ${el.libelle}`).join('\n')}>
                      + {caches} plus ancien(s)
                    </span>
                  )}
                  {visibles.map((el) => (
                    <Pastille key={el.id} element={el} points={points.get(el.id) ?? []} auteur={el.auteur_id ? nomsEquipe.get(el.auteur_id) : undefined} />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function Pastille({ element, points, auteur }: { element: ElementJournal; points: PointsEvenement[]; auteur?: string }) {
  const total = points.reduce((s, p) => s + p.points, 0)
  const infobulle = [
    `${element.libelle}`,
    `${formatDateHeure(element.date)}${element.canal ? ` · ${element.canal}` : ''}${element.process ? ` · process ${element.process}` : ''}`,
    auteur ? `Par ${auteur}` : element.source === 'evenement' ? 'Automatique' : '',
    ...points.map((p) => `${p.code} : ${p.points > 0 ? '+' : ''}${formatPoints(p.points)} point(s) ${p.score === 'conversion' ? 'de conversion' : 'd\'engagement'}`),
    ...element.details,
  ]
    .filter(Boolean)
    .join('\n')
  return (
    <span
      title={infobulle}
      className={`block cursor-help rounded-md border px-1.5 py-0.5 text-[10px] leading-tight ${
        points.length > 0 ? (total < 0 ? 'border-rose/40 bg-rose-clair/60' : 'border-orange/40 bg-orange-clair/60') : 'border-beige-fonce bg-white'
      }`}
    >
      <span className="flex items-center justify-between gap-1">
        <span className="text-neutral-500">{jourMois(element.date)}</span>
        {points.length > 0 && (
          <span className={`font-semibold ${total < 0 ? 'text-rose-fonce' : 'text-bordeaux'}`}>
            {total > 0 ? '+' : ''}
            {formatPoints(total)}
          </span>
        )}
      </span>
      <span className="block truncate text-neutral-700">{element.libelleCourt}</span>
    </span>
  )
}
