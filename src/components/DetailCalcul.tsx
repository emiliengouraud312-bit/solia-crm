// Détail du calcul d'un score : chaque critère, ses points, sa date, sa dégressivité et les plafonds.
// C'est la preuve demandée par le jury : rien n'est affiché que le calcul n'utilise pas.
import type { LigneDetail, ScoreResult } from '../domain/scoring'
import { formatDate, formatPoints } from '../lib/format'
import { BadgePalier } from './Badges'

const NOMS_BLOCS: Record<string, string> = {
  profil: 'Profil',
  origine: 'Origine (un seul critère, le plus fort)',
  digital: 'Engagement digital',
  intention: 'Intention',
  comportement: 'Comportement (origine + digital + intention)',
  negatif: 'Points négatifs actifs',
  avant: 'Avant le voyage',
  pendant: 'Pendant le voyage',
  apres: 'Après le voyage',
  fidelite: 'Fidélité',
}

export function DetailCalcul({ resultat }: { resultat: ScoreResult }) {
  return resultat.type === 'conversion' ? <DetailConversion resultat={resultat} /> : <DetailEngagement resultat={resultat} />
}

function Total({ resultat, formule }: { resultat: ScoreResult; formule: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-beige p-3">
      <p className="text-neutral-700">{formule}</p>
      <p className="flex items-center gap-2">
        <span className="text-2xl font-semibold text-bordeaux">{resultat.score ?? 'En attente'}</span>
        {resultat.score !== null && <span className="text-neutral-500">/ 100</span>}
        <BadgePalier palier={resultat.palier} />
      </p>
    </div>
  )
}

function DetailConversion({ resultat }: { resultat: ScoreResult }) {
  const plafond = (bloc: string) => resultat.plafonds.find((p) => p.bloc === bloc)
  const profil = plafond('profil')
  const comportement = plafond('comportement')
  const negatif = plafond('negatif')
  return (
    <div>
      {['profil', 'origine', 'digital', 'intention', 'negatif'].map((bloc) => {
        const lignes = resultat.lignes.filter((l) => l.bloc === bloc)
        const p = plafond(bloc)
        return (
          <section key={bloc} className="mb-3">
            <h4 className="libelle mb-1 flex justify-between text-bordeaux">
              <span>{NOMS_BLOCS[bloc]}</span>
              {p && (
                <span className="text-neutral-500">
                  {formatPoints(p.brut)} pt
                  {p.plafond !== null && p.brut > p.plafond ? ` plafonné à ${p.plafond}` : ''}
                </span>
              )}
            </h4>
            <TableLignes lignes={lignes} avecDegressivite={bloc !== 'profil'} vide={bloc === 'negatif' ? 'Aucun point négatif actif' : 'Aucun critère'} />
          </section>
        )
      })}
      <Total
        resultat={resultat}
        formule={`Profil ${formatPoints(profil?.retenu ?? 0)} (max 30) + comportement ${formatPoints(comportement?.retenu ?? 0)} (max 70) ${
          (negatif?.retenu ?? 0) < 0 ? `${formatPoints(negatif?.retenu ?? 0).replace('-', '- ')} ` : ''
        }= ${formatPoints((profil?.retenu ?? 0) + (comportement?.retenu ?? 0) + (negatif?.retenu ?? 0))}, arrondi et borné entre 0 et 100`}
      />
      {resultat.fige && (
        <p className="mt-2 text-xs text-neutral-500">
          {resultat.fige.raison} : score calculé au {formatDate(resultat.fige.date)} et figé depuis.
        </p>
      )}
    </div>
  )
}

function DetailEngagement({ resultat }: { resultat: ScoreResult }) {
  const blocs = resultat.plafonds.filter((p) => p.bloc !== 'negatif')
  const obtenus = blocs.reduce((s, p) => s + p.retenu, 0)
  const atteignables = blocs.reduce((s, p) => s + (p.atteignable_retenu ?? 0), 0)
  const negatifs = resultat.plafonds.find((p) => p.bloc === 'negatif')?.retenu ?? 0
  return (
    <div>
      {blocs.map((p) => (
        <section key={p.bloc} className="mb-3">
          <h4 className="libelle mb-1 flex justify-between text-bordeaux">
            <span>{NOMS_BLOCS[p.bloc]}</span>
            <span className="text-neutral-500">
              {formatPoints(p.retenu)} obtenus sur {formatPoints(p.atteignable_retenu ?? 0)} atteignables (plafond {p.plafond})
            </span>
          </h4>
          <TableEngagement lignes={resultat.lignes.filter((l) => l.bloc === p.bloc)} />
        </section>
      ))}
      <section className="mb-3">
        <h4 className="libelle mb-1 text-bordeaux">{NOMS_BLOCS.negatif}</h4>
        <TableLignes lignes={resultat.lignes.filter((l) => l.bloc === 'negatif')} avecDegressivite={false} vide="Aucun point négatif actif" />
      </section>
      <Total
        resultat={resultat}
        formule={
          atteignables === 0
            ? 'Aucun critère encore atteignable : le score est en attente.'
            : `(${formatPoints(obtenus)} obtenus ${negatifs < 0 ? `- ${formatPoints(-negatifs)} ` : ''}) ÷ ${formatPoints(atteignables)} atteignables × 100`
        }
      />
      {resultat.fige && (
        <p className="mt-2 text-xs text-neutral-500">
          {resultat.fige.raison} : score figé au {formatDate(resultat.fige.date)}.
        </p>
      )}
    </div>
  )
}

function TableLignes({ lignes, avecDegressivite, vide }: { lignes: LigneDetail[]; avecDegressivite: boolean; vide: string }) {
  if (lignes.length === 0) return <p className="px-2 py-1 text-xs text-neutral-400">{vide}</p>
  return (
    <table className="w-full text-left text-[13px]">
      <tbody>
        {lignes.map((l, i) => (
          <tr key={`${l.code}-${i}`} className="border-t border-beige">
            <td className="w-12 px-2 py-1 font-semibold text-bordeaux">{l.code}</td>
            <td className="px-2 py-1">
              {l.libelle}
              <span className="block text-xs text-neutral-500">{l.preuve}</span>
            </td>
            <td className="w-24 px-2 py-1 text-neutral-600">{l.date ? formatDate(l.date) : ''}</td>
            {avecDegressivite && (
              <td className="w-36 px-2 py-1 text-xs text-neutral-500">
                {l.age_jours !== null ? `il y a ${l.age_jours} j` : ''}
                {l.coefficient !== 1 ? ` · ${formatPoints(l.points_bruts)} × ${l.coefficient * 100} %` : ''}
              </td>
            )}
            <td className={`w-14 px-2 py-1 text-right font-semibold ${l.points < 0 ? 'text-rose-fonce' : 'text-bordeaux'}`}>
              {l.points > 0 ? '+' : ''}
              {formatPoints(l.points)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TableEngagement({ lignes }: { lignes: LigneDetail[] }) {
  return (
    <table className="w-full text-left text-[13px]">
      <tbody>
        {lignes.map((l) => (
          <tr key={l.code} className={`border-t border-beige ${l.etat === 'non_atteignable' ? 'text-neutral-400' : ''}`}>
            <td className="w-12 px-2 py-1 font-semibold">{l.code}</td>
            <td className="px-2 py-1">
              {l.libelle}
              <span className="block text-xs text-neutral-500">{l.preuve}</span>
            </td>
            <td className="w-40 px-2 py-1 text-xs">
              {l.etat === 'non_atteignable'
                ? l.atteignable_des
                  ? `Atteignable le ${formatDate(l.atteignable_des)}`
                  : 'Pas encore atteignable'
                : l.etat === 'obtenu'
                  ? 'Obtenu'
                  : 'Atteignable, non obtenu'}
            </td>
            <td className="w-16 px-2 py-1 text-right font-semibold">
              {l.etat === 'non_atteignable' ? '' : `${formatPoints(l.points)} / ${l.points_bruts}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
