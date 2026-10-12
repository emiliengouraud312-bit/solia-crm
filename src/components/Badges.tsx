// Pastilles de couleur : palier de score, cible, statut.
import { LIBELLES_CIBLE, LIBELLES_STATUT } from '../domain/libelles'
import type { ScoreResult } from '../domain/scoring'
import type { Cible, Statut } from '../domain/types'

const COULEURS_PALIER: Record<string, string> = {
  Froid: 'bg-beige-fonce text-bordeaux-clair',
  'Tiède': 'bg-orange-clair text-[#A65300]',
  Chaud: 'bg-orange text-white',
  'Prêt à réserver': 'bg-rose text-white',
  Distant: 'bg-beige-fonce text-bordeaux-clair',
  'Engagé': 'bg-rose-clair text-rose-fonce',
  'Fidèle': 'bg-bordeaux-clair text-white',
  Ambassadeur: 'bg-bordeaux text-white',
  'En attente': 'border border-beige-fonce bg-white text-neutral-500',
}

export function BadgePalier({ palier }: { palier: string }) {
  return (
    <span className={`libelle inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] ${COULEURS_PALIER[palier] ?? ''}`}>
      {palier}
    </span>
  )
}

/** Score sur 100 et palier, avec le type de score (conversion ou engagement). */
export function Score({ resultat }: { resultat: ScoreResult }) {
  const titre = `${resultat.type === 'conversion' ? 'Score de conversion' : 'Score d\'engagement'}${
    resultat.fige ? ` (${resultat.fige.raison.toLowerCase()}, figé le ${resultat.fige.date.split('-').reverse().join('/')})` : ''
  }`
  return (
    <span className="inline-flex items-center gap-2" title={titre}>
      <span className="w-7 text-right text-base font-semibold tabular-nums text-bordeaux">{resultat.score ?? ''}</span>
      <BadgePalier palier={resultat.palier} />
      <span className="libelle text-[9px] text-neutral-400">{resultat.type === 'conversion' ? 'conv.' : 'eng.'}</span>
    </span>
  )
}

// Une couleur de la charte par cible : orange, bordeaux, rose.
const COULEURS_CIBLE: Record<Cible, string> = {
  senior: 'bg-orange-clair text-[#A65300]',
  parent_solo: 'bg-[#EEDFE4] text-bordeaux',
  celibataire: 'bg-rose-clair text-rose-fonce',
}

export function BadgeCible({ cible }: { cible: Cible }) {
  return <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${COULEURS_CIBLE[cible]}`}>{LIBELLES_CIBLE[cible]}</span>
}

export function BadgeStatut({ statut }: { statut: Statut }) {
  const grise = statut === 'perdu' || statut === 'ancien_abonne'
  return (
    <span className={`whitespace-nowrap text-sm ${grise ? 'text-neutral-400' : 'text-neutral-800'}`}>{LIBELLES_STATUT[statut]}</span>
  )
}
