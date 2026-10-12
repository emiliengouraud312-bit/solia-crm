// Aperçu de la fiche contact (phase 1) : identité et détail du calcul des scores.
// La fiche complète (frise du PIN, onglets, actions rapides) arrive en phase 2.
import { Link, useParams } from 'react-router'
import { BadgeCible, BadgePalier, BadgeStatut } from '../components/Badges'
import { DetailCalcul } from '../components/DetailCalcul'
import { PinSolia } from '../components/PinSolia'
import { age } from '../domain/dates'
import { LIBELLES_CANAL_PREFERE, LIBELLES_ORIGINE, STATUTS_CONVERSION } from '../domain/libelles'
import { computeConversion, computeEngagement } from '../domain/scoring'
import { formatDate, formatMontant } from '../lib/format'
import { useScores } from '../lib/useScores'
import { useCRM } from '../store/StoreContext'

export function FicheContact() {
  const { id } = useParams()
  const { base, dateReference } = useCRM()
  const { donnees, planning } = useScores()
  const contact = base.contacts.find((c) => c.id === id)

  if (!contact) {
    return (
      <div className="carte p-6">
        <p className="mb-3">Ce contact n'existe pas.</p>
        <Link to="/contacts" className="bouton-secondaire">
          Retour aux contacts
        </Link>
      </div>
    )
  }

  const d = donnees(contact.id)
  const conversion = computeConversion(d, planning, dateReference)
  const aReserve = d.reservations.length > 0
  const engagement = aReserve ? computeEngagement(d, planning, dateReference) : null
  const referente = base.equipe.find((m) => m.id === contact.referente_id)
  const parrain = base.contacts.find((c) => c.id === contact.parrain_id)
  const envie = base.departs.find((x) => x.id === contact.envie_depart_id)
  const grise = contact.statut === 'perdu' || contact.statut === 'ancien_abonne'

  return (
    <>
      <Link to="/contacts" className="mb-4 inline-block text-sm text-bordeaux hover:text-rose">
        ‹ Retour aux contacts
      </Link>
      <div className="carte mb-6 flex flex-wrap items-start gap-5 p-5">
        <PinSolia taille={44} grise={grise} />
        <div className="min-w-[260px] flex-1">
          <p className="libelle mb-1 text-orange">Fiche contact</p>
          <h1 className="font-titre text-4xl text-bordeaux">
            {contact.prenom} {contact.nom}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BadgeCible cible={contact.cible} />
            <BadgeStatut statut={contact.statut} />
            {contact.ambassadeur && <span className="libelle rounded bg-orange px-1.5 py-0.5 text-[10px] text-white">Ambassadeur</span>}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-neutral-500">Référente</dt>
          <dd>{referente?.prenom}</dd>
          <dt className="text-neutral-500">Origine</dt>
          <dd>
            {LIBELLES_ORIGINE[contact.origine]}
            {parrain ? ` (parrain : ${parrain.prenom} ${parrain.nom})` : ''}
          </dd>
          <dt className="text-neutral-500">Canal préféré</dt>
          <dd>{LIBELLES_CANAL_PREFERE[contact.canal_prefere]}</dd>
          <dt className="text-neutral-500">Fiche créée le</dt>
          <dd>{formatDate(contact.date_creation)}</dd>
          {contact.date_naissance && (
            <>
              <dt className="text-neutral-500">Âge</dt>
              <dd>{age(contact.date_naissance, dateReference)} ans</dd>
            </>
          )}
          {contact.ville && (
            <>
              <dt className="text-neutral-500">Ville</dt>
              <dd>{contact.ville}</dd>
            </>
          )}
          {envie && (
            <>
              <dt className="text-neutral-500">Envie</dt>
              <dd>
                {envie.offre} du {formatDate(envie.date_depart)} ({formatMontant(envie.prix_ttc)})
              </dd>
            </>
          )}
          {contact.motif_perte && (
            <>
              <dt className="text-neutral-500">Motif de perte</dt>
              <dd>{contact.motif_perte}</dd>
            </>
          )}
        </dl>
      </div>

      <p className="mb-4 rounded-lg border border-orange/40 bg-orange-clair/50 px-4 py-2 text-sm text-bordeaux">
        Aperçu de la phase 1 : la frise du parcours avec le PIN, le journal, les onglets et les actions rapides arrivent en phase 2.
      </p>

      <div className={`grid gap-6 ${engagement ? 'xl:grid-cols-2' : ''}`}>
        <section className={`carte p-5 ${STATUTS_CONVERSION.includes(contact.statut) && !aReserve ? 'ring-2 ring-rose/30' : ''}`}>
          <h2 className="libelle mb-3 flex items-center justify-between text-bordeaux">
            <span>{aReserve ? 'Score à la réservation (conversion)' : 'Score de conversion'}</span>
            <BadgePalier palier={conversion.palier} />
          </h2>
          <DetailCalcul resultat={conversion} />
        </section>
        {engagement && (
          <section className="carte p-5 ring-2 ring-rose/30">
            <h2 className="libelle mb-3 flex items-center justify-between text-bordeaux">
              <span>Score d'engagement</span>
              <BadgePalier palier={engagement.palier} />
            </h2>
            <DetailCalcul resultat={engagement} />
          </section>
        )}
      </div>
    </>
  )
}
