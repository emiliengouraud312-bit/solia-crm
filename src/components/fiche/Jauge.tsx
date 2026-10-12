// Jauge circulaire d'un score sur 100, avec son palier. Un clic ouvre le détail du calcul.
import type { ScoreResult } from '../../domain/scoring'
import { formatDate } from '../../lib/format'
import { BadgePalier } from '../Badges'

const COULEUR_PALIER: Record<string, string> = {
  Froid: '#B9A3AA',
  'Tiède': '#FFB25E',
  Chaud: '#FF8911',
  'Prêt à réserver': '#E83C71',
  Distant: '#B9A3AA',
  'Engagé': '#F07FA0',
  'Fidèle': '#8A4A5E',
  Ambassadeur: '#5A1A2E',
}

export function Jauge({
  titre,
  resultat,
  inactif,
  messageInactif,
  onDetail,
}: {
  titre: string
  resultat: ScoreResult | null
  inactif?: boolean
  messageInactif?: string
  onDetail?: () => void
}) {
  const rayon = 42
  const circonference = 2 * Math.PI * rayon
  const score = resultat?.score ?? null
  const part = score === null || inactif ? 0 : score / 100
  const couleur = resultat ? (COULEUR_PALIER[resultat.palier] ?? '#E83C71') : '#E5D6CE'

  const contenu = (
    <>
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={rayon} fill="none" stroke="#F3E3D9" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={rayon}
          fill="none"
          stroke={couleur}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={circonference * (1 - part)}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s' }}
        />
      </svg>
      <div className="min-w-0 text-left">
        <p className="libelle mb-1 text-bordeaux/80">{titre}</p>
        {inactif ? (
          <p className="text-sm text-neutral-500">{messageInactif}</p>
        ) : (
          <>
            <p className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tabular-nums text-bordeaux">{score ?? '…'}</span>
              {score !== null && <span className="text-neutral-400">/ 100</span>}
            </p>
            {resultat && <BadgePalier palier={resultat.palier} />}
            <p className="mt-1 text-xs text-neutral-500">
              {resultat?.fige ? `${resultat.fige.raison}, figé le ${formatDate(resultat.fige.date)}` : 'Voir le détail du calcul'}
            </p>
          </>
        )}
      </div>
    </>
  )

  return inactif || !onDetail ? (
    <div className="carte flex items-center gap-4 p-4 opacity-70">{contenu}</div>
  ) : (
    <button type="button" onClick={onDetail} className="carte flex items-center gap-4 p-4 text-left transition hover:border-rose hover:shadow-md" title="Ouvrir le détail du calcul">
      {contenu}
    </button>
  )
}
