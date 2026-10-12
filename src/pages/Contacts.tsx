// Écran Contacts (cahier des charges, section 3.2) : tableau filtrable et triable,
// avec le score de chaque contact et son palier, recalculés à la date de référence.
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BadgeCible, BadgeStatut, Score } from '../components/Badges'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { IconePlus, IconeRecherche } from '../components/Icones'
import { NouveauContact } from '../components/NouveauContact'
import { estPasse } from '../domain/dates'
import { libelleEvenement, LIBELLES_CIBLE, LIBELLES_ORIGINE, LIBELLES_STATUT, ORDRE_STATUTS } from '../domain/libelles'
import { REGLES_SCORING } from '../domain/referentiel'
import type { Cible, Evenement, Origine, Statut, Tache } from '../domain/types'
import { formatDate } from '../lib/format'
import { useScores } from '../lib/useScores'
import { useCRM } from '../store/StoreContext'

type Colonne = 'nom' | 'cible' | 'statut' | 'referente' | 'score' | 'derniere' | 'prochaine'

const PALIERS = [
  ...REGLES_SCORING.conversion.paliers.map((p) => p.libelle),
  ...REGLES_SCORING.engagement.paliers.map((p) => p.libelle),
  'En attente',
]

function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function Contacts() {
  const { base, dateReference } = useCRM()
  const { scores } = useScores()
  const [recherche, setRecherche] = useState('')
  const [cible, setCible] = useState<Cible | ''>('')
  const [statut, setStatut] = useState<Statut | ''>('')
  const [palier, setPalier] = useState('')
  const [referente, setReferente] = useState('')
  const [origine, setOrigine] = useState<Origine | ''>('')
  const [tri, setTri] = useState<{ colonne: Colonne; sens: 1 | -1 }>({ colonne: 'derniere', sens: -1 })
  const [creation, setCreation] = useState(false)

  const prenomEquipe = (id: string | null) => base.equipe.find((m) => m.id === id)?.prenom ?? ''

  // Dernière action (événement le plus récent à la date de référence, hors simple changement de statut)
  // et prochaine tâche à faire.
  const lignes = useMemo(() => {
    const derniers = new Map<string, Evenement>()
    for (const e of base.evenements) {
      if (!estPasse(e.date, dateReference) || e.type === 'statut') continue
      const actuel = derniers.get(e.contact_id)
      if (!actuel || e.date >= actuel.date) derniers.set(e.contact_id, e)
    }
    const prochaines = new Map<string, Tache>()
    for (const t of base.taches) {
      if (t.statut !== 'a_faire' || !t.contact_id) continue
      const actuelle = prochaines.get(t.contact_id)
      if (!actuelle || t.echeance < actuelle.echeance) prochaines.set(t.contact_id, t)
    }
    return base.contacts
      .filter((c) => estPasse(c.date_creation, dateReference))
      .map((c) => ({ contact: c, score: scores.get(c.id), derniere: derniers.get(c.id), prochaine: prochaines.get(c.id) }))
  }, [base, dateReference, scores])

  const filtrees = useMemo(() => {
    const texte = normaliser(recherche.trim())
    const resultat = lignes.filter(
      ({ contact: c, score }) =>
        (!texte || normaliser(`${c.prenom} ${c.nom}`).includes(texte)) &&
        (!cible || c.cible === cible) &&
        (!statut || c.statut === statut) &&
        (!palier || score?.palier === palier) &&
        (!referente || c.referente_id === referente) &&
        (!origine || c.origine === origine),
    )
    const valeur = (l: (typeof lignes)[number]): string | number => {
      switch (tri.colonne) {
        case 'nom':
          return normaliser(`${l.contact.nom} ${l.contact.prenom}`)
        case 'cible':
          return l.contact.cible
        case 'statut':
          return ORDRE_STATUTS.indexOf(l.contact.statut)
        case 'referente':
          return prenomEquipe(l.contact.referente_id)
        case 'score':
          return l.score?.score ?? -1
        case 'derniere':
          return l.derniere?.date ?? ''
        case 'prochaine':
          return l.prochaine?.echeance ?? '9999'
      }
    }
    return [...resultat].sort((a, b) => {
      const [va, vb] = [valeur(a), valeur(b)]
      return va < vb ? -tri.sens : va > vb ? tri.sens : 0
    })
  }, [lignes, recherche, cible, statut, palier, referente, origine, tri])

  const trier = (colonne: Colonne) =>
    setTri((t) => (t.colonne === colonne ? { colonne, sens: t.sens === 1 ? -1 : 1 } : { colonne, sens: colonne === 'score' || colonne === 'derniere' ? -1 : 1 }))

  const filtresActifs = Boolean(recherche || cible || statut || palier || referente || origine)
  const reinitialiserFiltres = () => {
    setRecherche('')
    setCible('')
    setStatut('')
    setPalier('')
    setReferente('')
    setOrigine('')
  }

  const EnTete = ({ colonne, children, className = '' }: { colonne: Colonne; children: string; className?: string }) => (
    <th className={`px-3 py-2.5 font-medium ${className}`}>
      <button className="inline-flex items-center gap-1 hover:text-rose" onClick={() => trier(colonne)}>
        {children}
        <span className="text-[10px]">{tri.colonne === colonne ? (tri.sens === 1 ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  )

  return (
    <>
      <EnTeteEcran
        titre="Contacts"
        sousTitre={`${lignes.length} fiches au ${formatDate(dateReference)}`}
        actions={
          <button className="bouton-principal" onClick={() => setCreation(true)}>
            <IconePlus /> Nouveau contact
          </button>
        }
      />

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
        <Filtre libelle="Cible" valeur={cible} onChange={(v) => setCible(v as Cible | '')} options={Object.entries(LIBELLES_CIBLE)} />
        <Filtre libelle="Statut" valeur={statut} onChange={(v) => setStatut(v as Statut | '')} options={ORDRE_STATUTS.map((s) => [s, LIBELLES_STATUT[s]])} />
        <Filtre libelle="Palier" valeur={palier} onChange={setPalier} options={PALIERS.map((p) => [p, p])} />
        <Filtre
          libelle="Référente"
          valeur={referente}
          onChange={setReferente}
          options={base.equipe.filter((m) => m.cible_referente).map((m) => [m.id, m.prenom])}
        />
        <Filtre libelle="Origine" valeur={origine} onChange={(v) => setOrigine(v as Origine | '')} options={Object.entries(LIBELLES_ORIGINE)} />
        {filtresActifs && (
          <button className="bouton-secondaire" onClick={reinitialiserFiltres}>
            Effacer les filtres
          </button>
        )}
      </div>

      <div className="carte overflow-x-auto">
        <table className="w-full min-w-[960px] text-left">
          <thead className="libelle sticky top-0 border-b border-beige-fonce bg-beige/60 text-bordeaux/80">
            <tr>
              <EnTete colonne="nom">Nom</EnTete>
              <EnTete colonne="cible">Cible</EnTete>
              <EnTete colonne="statut">Statut</EnTete>
              <EnTete colonne="referente">Référente</EnTete>
              <EnTete colonne="score">Score et palier</EnTete>
              <EnTete colonne="derniere">Dernière action</EnTete>
              <EnTete colonne="prochaine">Prochaine tâche</EnTete>
            </tr>
          </thead>
          <tbody>
            {filtrees.map(({ contact: c, score, derniere, prochaine }) => (
              <tr key={c.id} className="border-b border-beige last:border-0 hover:bg-beige/50">
                <td className="px-3 py-2">
                  <Link to={`/contacts/${c.id}`} className="font-medium text-bordeaux hover:text-rose">
                    {c.prenom} {c.nom}
                  </Link>
                  {c.ambassadeur && <span className="libelle ml-2 rounded bg-orange px-1.5 py-0.5 text-[9px] text-white">Ambassadeur</span>}
                </td>
                <td className="px-3 py-2">
                  <BadgeCible cible={c.cible} />
                </td>
                <td className="px-3 py-2">
                  <BadgeStatut statut={c.statut} />
                </td>
                <td className="px-3 py-2 text-neutral-700">{prenomEquipe(c.referente_id)}</td>
                <td className="px-3 py-2">{score && <Score resultat={score} />}</td>
                <td className="px-3 py-2 text-neutral-700">
                  {derniere && (
                    <>
                      <span className="block leading-tight">{libelleEvenement(derniere)}</span>
                      <span className="text-xs text-neutral-500">{formatDate(derniere.date)}</span>
                    </>
                  )}
                </td>
                <td className="px-3 py-2 text-neutral-700">
                  {prochaine ? (
                    <>
                      <span className="block leading-tight">{prochaine.titre}</span>
                      <span className="text-xs text-neutral-500">{formatDate(prochaine.echeance)}</span>
                    </>
                  ) : (
                    <span className="text-neutral-400">Aucune</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrees.length === 0 && <p className="p-6 text-center text-neutral-500">Aucun contact ne correspond à ces filtres.</p>}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {filtrees.length} contact(s) affiché(s). Score de conversion (conv.) jusqu'à la réservation, score d'engagement (eng.) ensuite.
      </p>

      {creation && <NouveauContact onFermer={() => setCreation(false)} />}
    </>
  )
}

function Filtre({
  libelle,
  valeur,
  onChange,
  options,
}: {
  libelle: string
  valeur: string
  onChange: (valeur: string) => void
  options: [string, string][]
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="libelle text-bordeaux/70">{libelle}</span>
      <select className="champ w-auto" value={valeur} onChange={(e) => onChange(e.target.value)}>
        <option value="">Tous</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
