// Fiche contact, écran central de la démo (cahier des charges, section 3.4) : en-tête, les deux jauges
// avec le détail du calcul, la frise du parcours avec le PIN, les actions rapides et les onglets.
import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { DetailCalcul } from '../components/DetailCalcul'
import { ActionsRapides } from '../components/fiche/ActionsRapides'
import { EnTeteFiche } from '../components/fiche/EnTeteFiche'
import { FriseParcours } from '../components/fiche/FriseParcours'
import { Jauge } from '../components/fiche/Jauge'
import { OngletsFiche } from '../components/fiche/OngletsFiche'
import { PanneauLateral } from '../components/PanneauLateral'
import { estPasse } from '../domain/dates'
import { journalDuContact } from '../domain/journal'
import { calculerParcours, estAmbassadeur, pointsParEvenement } from '../domain/parcours'
import { computeConversion, computeEngagement, reservationDeReference, type ScoreResult } from '../domain/scoring'
import { champsManquants } from '../domain/statuts'
import { formatDate } from '../lib/format'
import { useContexteAction } from '../lib/useContexteAction'
import { useScores } from '../lib/useScores'
import { useCRM } from '../store/StoreContext'

export function FicheContact() {
  const { id = '' } = useParams()
  const { base, dateReference } = useCRM()
  const { donnees, planning } = useScores()
  const obtenirContexte = useContexteAction()
  const [voyageChoisi, setVoyageChoisi] = useState<string | null>(null)
  const [detail, setDetail] = useState<ScoreResult | null>(null)
  const contact = base.contacts.find((c) => c.id === id)
  const contexte = useCallback(() => obtenirContexte(id), [obtenirContexte, id])

  const vue = useMemo(() => {
    if (!contact) return null
    const d = donnees(contact.id)
    const aReserve = d.reservations.some((r) => estPasse(r.date_reservation, dateReference))
    const conversion = computeConversion(d, planning, dateReference)
    const engagement = aReserve ? computeEngagement(d, planning, dateReference) : null
    const parcours = calculerParcours(d, planning, dateReference, voyageChoisi)
    const journal = journalDuContact(d, planning, dateReference)
    const reservationEngagement = reservationDeReference(d.reservations, planning.departs, dateReference)
    const points = pointsParEvenement(d.evenements, conversion, engagement, reservationEngagement, d.reservations)
    const abonnementActif = d.abonnements.some(
      (a) => a.decision === 'abonne' && a.date_debut && estPasse(a.date_debut, dateReference) && (!a.date_fin || !estPasse(a.date_fin, dateReference)),
    )
    return { d, aReserve, conversion, engagement, parcours, journal, points, abonnementActif }
  }, [contact, donnees, planning, dateReference, voyageChoisi])

  if (!contact || !vue) {
    return (
      <div className="carte p-6">
        <p className="mb-3">Ce contact n'existe pas.</p>
        <Link to="/contacts" className="bouton-secondaire">
          Retour aux contacts
        </Link>
      </div>
    )
  }

  const nomsEquipe = new Map(base.equipe.map((m) => [m.id, m.prenom]))
  const libelleVoyage = (reservationId: string) => {
    const r = base.reservations.find((x) => x.id === reservationId)
    const d = base.departs.find((x) => x.id === r?.depart_id)
    return d ? `${d.offre} du ${formatDate(d.date_depart)}` : ''
  }

  if (!estPasse(contact.date_creation, dateReference)) {
    return (
      <>
        <Link to="/contacts" className="mb-4 inline-block text-sm text-bordeaux hover:text-rose">
          ‹ Retour aux contacts
        </Link>
        <div className="carte p-6 text-neutral-700">
          La fiche de {contact.prenom} {contact.nom} est créée le {formatDate(contact.date_creation)}, après la date de référence du {formatDate(dateReference)}.
        </div>
      </>
    )
  }

  return (
    <>
      <Link to="/contacts" className="mb-4 inline-block text-sm text-bordeaux hover:text-rose">
        ‹ Retour aux contacts
      </Link>
      <div className="space-y-5">
        <EnTeteFiche
          contact={contact}
          dateReference={dateReference}
          referente={base.equipe.find((m) => m.id === contact.referente_id)}
          parrain={base.contacts.find((c) => c.id === contact.parrain_id)}
          envie={base.departs.find((x) => x.id === contact.envie_depart_id)}
          ambassadeur={estAmbassadeur(vue.d, dateReference)}
          abonnementActif={vue.abonnementActif}
          manquants={champsManquants(vue.d, dateReference)}
          grise={vue.parcours.grise}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Jauge
            titre={vue.aReserve ? 'Score à la réservation' : 'Score de conversion'}
            resultat={vue.conversion}
            onDetail={() => setDetail(vue.conversion)}
          />
          <Jauge
            titre="Score d'engagement"
            resultat={vue.engagement}
            inactif={!vue.engagement}
            messageInactif="Il démarre au passage en Réservé."
            onDetail={vue.engagement ? () => setDetail(vue.engagement) : undefined}
          />
        </div>

        <FriseParcours
          contactId={contact.id}
          parcours={vue.parcours}
          journal={vue.journal}
          points={vue.points}
          nomsEquipe={nomsEquipe}
          libelleVoyage={libelleVoyage}
          onChoisirVoyage={(reservationId) => setVoyageChoisi(reservationId === vue.parcours.voyages[0]?.id ? null : reservationId)}
        />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <OngletsFiche donnees={vue.d} journal={vue.journal} points={vue.points} nomsEquipe={nomsEquipe} contexte={contexte} />
          <div className="xl:sticky xl:top-20">
            <ActionsRapides contexte={contexte} />
          </div>
        </div>
      </div>

      {detail && (
        <PanneauLateral
          titre={detail.type === 'conversion' ? (vue.aReserve ? 'Score à la réservation' : 'Score de conversion') : 'Score d\'engagement'}
          sousTitre={`${contact.prenom} ${contact.nom} · calcul au ${formatDate(detail.date_calcul)}`}
          onFermer={() => setDetail(null)}
        >
          <DetailCalcul resultat={detail.type === 'conversion' ? vue.conversion : (vue.engagement ?? detail)} />
          <p className="mt-4 text-xs text-neutral-500">
            Règle de preuve : un critère ne compte que s'il existe une donnée datée qui le prouve. Poids, plafonds et dégressivité : data/scoring-rules.json.
          </p>
        </PanneauLateral>
      )}
    </>
  )
}
