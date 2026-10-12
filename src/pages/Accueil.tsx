// Tableau de bord (cahier des charges, section 3.1) : chiffres clés, « Ma journée », prochains départs,
// répartition par palier et indicateurs des process (section 9), avec leur définition au survol.
import { useMemo } from 'react'
import { Link } from 'react-router'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { ListeTaches } from '../components/taches/ListeTaches'
import { jour, numeroJour } from '../domain/dates'
import {
  calculerIndicateurs,
  chiffresCles,
  PALIERS_CONVERSION,
  PALIERS_ENGAGEMENT,
  PERIODE_JOURS,
  pourcentage,
  prochainsDeparts,
  repartitionPaliers,
  type Indicateur,
} from '../domain/indicateurs'
import { placesRestantes, reservationActive } from '../domain/planning'
import { etatTache } from '../domain/taches'
import { formatDate, formatDateLongue } from '../lib/format'
import { useScores } from '../lib/useScores'
import { useCRM } from '../store/StoreContext'
import { JaugeRemplissage } from './Planning'

/** Du plus bas au plus haut palier : beige neutre, orange, rose, bordeaux (couleurs de la charte). */
const RAMPE_PALIERS = ['#AE978A', '#FF8911', '#E83C71', '#5A1A2E']
/** Texte lisible sur chaque teinte (bordeaux sur les teintes claires, blanc sur les foncées). */
const TEXTE_PALIERS = ['#43121F', '#43121F', '#FFFFFF', '#FFFFFF']

export function Accueil() {
  const { base, dateReference, utilisateurId } = useCRM()
  const { scores } = useScores()
  const utilisateur = base.equipe.find((m) => m.id === utilisateurId)
  const chiffres = useMemo(() => chiffresCles(base, dateReference, scores), [base, dateReference, scores])
  const paliers = useMemo(() => repartitionPaliers(base, dateReference, scores), [base, dateReference, scores])
  const indicateurs = useMemo(() => calculerIndicateurs(base, dateReference), [base, dateReference])
  const cle = indicateurs.find((i) => i.cle)

  return (
    <>
      <EnTeteEcran titre={`Bonjour ${utilisateur?.prenom ?? ''}`} sousTitre={`Tableau de bord · ${formatDateLongue(dateReference)}`} />

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Chiffres clés">
        <Tuile libelle="Contacts actifs" valeur={chiffres.contactsActifs} aide="Fiches qui ne sont ni perdues ni d'anciens abonnés" lien="/contacts" />
        <Tuile libelle="Prospects chauds et prêts à réserver" valeur={chiffres.prospectsChauds} aide="Contacts sans réservation aux paliers Chaud ou Prêt à réserver" lien="/pipeline" />
        <Tuile libelle="Réservations du mois" valeur={chiffres.reservationsDuMois} aide={`Réservations enregistrées depuis le 1er du mois, jusqu'au ${formatDate(dateReference)}`} />
        <Tuile
          libelle="Remplissage des 3 prochains départs"
          valeur={pourcentage(chiffres.remplissageProchains.reservees, chiffres.remplissageProchains.places)}
          aide={`${chiffres.remplissageProchains.reservees} places réservées sur ${chiffres.remplissageProchains.places}`}
          lien="/planning"
        />
        <Tuile libelle="Abonnés actifs" valeur={chiffres.abonnesActifs} aide="Abonnements à 29 € par mois en cours" />
        <Tuile libelle="Tâches en retard" valeur={chiffres.tachesEnRetard} aide="Toute l'équipe, échéance dépassée" lien="/taches" alerte={chiffres.tachesEnRetard > 0} />
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <MaJournee utilisateurId={utilisateurId} />
        <div className="space-y-6">
          <ProchainsDeparts />
          <AutomatismesDuJour />
        </div>
      </div>

      <section className="carte mb-6 p-5">
        <h2 className="libelle mb-4 text-bordeaux">Répartition par palier</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <BarrePaliers titre="Contacts sans réservation, par palier de conversion" valeurs={paliers.conversion} ordre={PALIERS_CONVERSION} unite="contact" />
          <BarrePaliers titre="Clients, par palier d'engagement" valeurs={paliers.engagement} ordre={PALIERS_ENGAGEMENT} unite="client" />
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="libelle text-bordeaux">Indicateurs des process</h2>
          <p className="text-xs text-neutral-500">
            Calculés sur les {PERIODE_JOURS} jours qui précèdent le {formatDate(dateReference)}, sauf mention contraire. Survolez un indicateur pour sa définition.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cle && <CarteIndicateur indicateur={cle} />}
          {indicateurs
            .filter((i) => !i.cle)
            .map((i) => (
              <CarteIndicateur key={i.id} indicateur={i} />
            ))}
        </div>
      </section>
    </>
  )
}

function Tuile({ libelle, valeur, aide, lien, alerte = false }: { libelle: string; valeur: number | string; aide: string; lien?: string; alerte?: boolean }) {
  const contenu = (
    <>
      <span className="block text-xs leading-snug text-neutral-600">{libelle}</span>
      <span className={`mt-1 block text-3xl font-semibold ${alerte ? 'text-rose' : 'text-bordeaux'}`}>{valeur}</span>
      <span className="mt-1 block text-[11px] leading-snug text-neutral-500">{aide}</span>
    </>
  )
  return lien ? (
    <Link to={lien} className="carte block p-4 transition-colors hover:border-rose">
      {contenu}
    </Link>
  ) : (
    <div className="carte p-4">{contenu}</div>
  )
}

function MaJournee({ utilisateurId }: { utilisateurId: string }) {
  const { base, dateReference } = useCRM()
  // Un compte sans tâche (le jury) voit la journée de toute l'équipe.
  const equipe = !base.taches.some((t) => t.responsable_id === utilisateurId)
  const taches = base.taches.filter((t) => equipe || t.responsable_id === utilisateurId)
  const trier = (etat: string) => taches.filter((t) => etatTache(t, dateReference) === etat).sort((a, b) => (a.echeance < b.echeance ? -1 : 1))
  const duJour = trier('aujourdhui')
  const enRetard = trier('en_retard')
  const prochaines = trier('a_venir').slice(0, 3)
  return (
    <section className="carte p-5 lg:col-span-2">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="libelle text-bordeaux">{equipe ? 'La journée de l\'équipe' : 'Ma journée'}</h2>
        <Link to="/taches" className="text-xs text-rose hover:underline">
          Toutes les tâches
        </Link>
      </div>
      <p className="mb-3 text-[13px] text-neutral-600">
        {duJour.length} tâche{duJour.length > 1 ? 's' : ''} pour aujourd'hui, {enRetard.length} en retard.
      </p>
      {duJour.length + enRetard.length === 0 ? (
        <>
          <p className="mb-3 rounded-lg bg-beige/60 px-4 py-4 text-center text-neutral-600">Rien d'urgent aujourd'hui. Prochaines échéances :</p>
          <ListeTaches taches={prochaines} vide="Aucune tâche à venir." />
        </>
      ) : (
        <ListeTaches taches={[...duJour, ...enRetard]} />
      )}
    </section>
  )
}

function ProchainsDeparts() {
  const { base, dateReference } = useCRM()
  return (
    <section className="carte p-5">
      <h2 className="libelle mb-3 text-bordeaux">Prochains départs</h2>
      <ul className="space-y-4">
        {prochainsDeparts(base, dateReference).map((depart) => {
          const voyageurs = base.reservations.filter((r) => r.depart_id === depart.id && reservationActive(r, dateReference))
          const enAttente = voyageurs.filter((r) => !r.solde_date || numeroJour(r.solde_date) > numeroJour(dateReference))
          const enRetard = enAttente.filter((r) => numeroJour(r.solde_echeance) < numeroJour(dateReference))
          return (
            <li key={depart.id}>
              <Link to={`/planning/departs/${depart.id}`} className="font-medium text-bordeaux hover:text-rose">
                {depart.offre}
              </Link>
              <span className="block text-xs text-neutral-500">
                Départ le {formatDate(depart.date_depart)} · brise-glace le {formatDate(depart.soliapero_brise_glace)}
              </span>
              <JaugeRemplissage reservees={depart.places_max - placesRestantes(depart, base.reservations, dateReference)} places={depart.places_max} />
              <span className={`block text-xs ${enRetard.length > 0 ? 'font-medium text-rose-fonce' : 'text-neutral-500'}`}>
                {enAttente.length === 0
                  ? 'Tous les soldes sont réglés'
                  : `${enAttente.length} solde${enAttente.length > 1 ? 's' : ''} en attente${enRetard.length > 0 ? `, dont ${enRetard.length} en retard` : ''}`}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function AutomatismesDuJour() {
  const { base, dateReference } = useCRM()
  const messagesAuto = base.messages_envoyes.filter((m) => jour(m.date) === dateReference && m.regle_id && !m.tache_id).length
  const tachesCreees = base.taches.filter((t) => jour(t.date_declenchement) === dateReference).length
  return (
    <section className="carte p-5">
      <h2 className="libelle mb-2 text-bordeaux">Automatismes du jour</h2>
      <ul className="space-y-1 text-[13px] text-neutral-700">
        <li>
          <span className="font-semibold text-bordeaux">{messagesAuto}</span> message{messagesAuto > 1 ? 's' : ''} automatique{messagesAuto > 1 ? 's' : ''} (simulé{messagesAuto > 1 ? 's' : ''})
        </li>
        <li>
          <span className="font-semibold text-bordeaux">{tachesCreees}</span> tâche{tachesCreees > 1 ? 's' : ''} déclenchée{tachesCreees > 1 ? 's' : ''} par les process
        </li>
      </ul>
      <p className="mt-2 text-xs text-neutral-500">Avancez la date de référence (+1 jour, +7 jours) pour voir le moteur travailler.</p>
    </section>
  )
}

/** Barre empilée horizontale : une part par palier, du plus bas au plus haut, avec la légende chiffrée. */
function BarrePaliers({ titre, valeurs, ordre, unite }: { titre: string; valeurs: [string, number][]; ordre: string[]; unite: string }) {
  const total = valeurs.reduce((s, [, n]) => s + n, 0)
  const nombre = (n: number) => `${n} ${unite}${n > 1 ? 's' : ''}`
  return (
    <div>
      <h3 className="mb-2 text-[13px] font-medium text-neutral-800">
        {titre} <span className="font-normal text-neutral-500">({nombre(total)})</span>
      </h3>
      <div className="flex h-7 gap-0.5" role="img" aria-label={`${titre} : ${valeurs.map(([p, n]) => `${p} ${n}`).join(', ')}`}>
        {valeurs
          .filter(([, n]) => n > 0)
          .map(([palier, n]) => {
            const rang = ordre.indexOf(palier)
            const part = total > 0 ? n / total : 0
            return (
              <div
                key={palier}
                className="flex h-full items-center justify-center overflow-hidden rounded text-xs font-semibold first:rounded-l-md last:rounded-r-md"
                style={{ width: `${part * 100}%`, backgroundColor: RAMPE_PALIERS[rang], color: TEXTE_PALIERS[rang] }}
                title={`${palier} : ${nombre(n)} (${Math.round(part * 100)} %)`}
              >
                {part >= 0.08 ? n : ''}
              </div>
            )
          })}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700">
        {valeurs.map(([palier, n]) => (
          <li key={palier} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: RAMPE_PALIERS[ordre.indexOf(palier)] }} aria-hidden="true" />
            {palier} <span className="font-semibold text-neutral-800">{n}</span>
            <span className="text-neutral-500">({total > 0 ? Math.round((n / total) * 100) : 0} %)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Carte d'indicateur : process, nom, valeur, effectifs ; la définition apparaît au survol ou au focus. */
function CarteIndicateur({ indicateur }: { indicateur: Indicateur }) {
  const { cle, alerte } = indicateur
  return (
    <div
      tabIndex={0}
      className={`carte group relative p-4 outline-none focus:border-rose ${cle ? 'border-bordeaux bg-bordeaux text-beige md:col-span-2 xl:row-span-2' : ''} ${alerte ? 'border-rose' : ''}`}
    >
      <p className="libelle mb-1 text-[10px] text-orange">
        {indicateur.process === 'Lead scoring' ? 'Lead scoring' : `Process ${indicateur.process}`}
        {cle && ' · Indicateur clé'}
      </p>
      <h3 className={`text-[13px] font-medium leading-snug ${cle ? 'text-white' : 'text-neutral-800'}`}>{indicateur.nom}</h3>
      <p className={`mt-1 font-semibold ${cle ? 'text-6xl text-white' : 'text-2xl text-bordeaux'}`}>{indicateur.valeur}</p>
      <p className={`mt-1 text-xs leading-snug ${cle ? 'text-beige/80' : 'text-neutral-500'}`}>{indicateur.detail}</p>
      {cle && <p className="mt-4 text-[13px] leading-snug text-beige/90">{indicateur.definition}</p>}
      {alerte && <p className="mt-2 rounded-md bg-rose-clair px-2 py-1 text-xs font-medium text-rose-fonce">{alerte}</p>}
      {!cle && (
        <div
          role="tooltip"
          className="pointer-events-none absolute inset-x-2 top-full z-20 mt-1 hidden rounded-lg bg-bordeaux p-3 text-xs leading-snug text-beige shadow-lg group-hover:block group-focus:block"
        >
          {indicateur.definition}
        </div>
      )}
    </div>
  )
}
