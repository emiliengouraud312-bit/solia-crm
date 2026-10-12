// Fiche départ (cahier des charges, section 3.5) : l'offre, les dates, le remplissage, la liste d'attente,
// les Soli'apéros, l'échéance du solde, et la liste des voyageurs avec la saisie des présences.
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { BadgeCible } from '../components/Badges'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { ListeTaches } from '../components/taches/ListeTaches'
import { useToast } from '../components/Toast'
import { presenceSoliapero } from '../domain/actions'
import { ajouterJours, estPasse, numeroJour } from '../domain/dates'
import { maintenantA } from '../domain/evenements'
import { placesRestantes, reservationActive } from '../domain/planning'
import { referentePourCible } from '../domain/referentiel'
import type { Reservation } from '../domain/types'
import { formatDate, formatDateHeure, formatMontant } from '../lib/format'
import { useCRM } from '../store/StoreContext'
import { JaugeRemplissage } from './Planning'

export function FicheDepart() {
  const { id = '' } = useParams()
  const { base, dateReference, appliquer, utilisateurId } = useCRM()
  const toast = useToast()
  const depart = base.departs.find((d) => d.id === id)
  if (!depart) {
    return (
      <div className="carte p-6">
        <p className="mb-3">Ce départ n'existe pas.</p>
        <Link to="/planning" className="bouton-secondaire">
          Retour au planning
        </Link>
      </div>
    )
  }

  const prenom = (membre: string) => base.equipe.find((m) => m.id === membre)?.prenom ?? ''
  const contacts = new Map(base.contacts.map((c) => [c.id, c]))
  const toutes = base.reservations.filter((r) => r.depart_id === depart.id && estPasse(r.date_reservation, dateReference))
  const voyageurs = toutes.filter((r) => reservationActive(r, dateReference)).sort((a, b) => {
    const ca = contacts.get(a.contact_id)
    const cb = contacts.get(b.contact_id)
    return `${ca?.nom}${ca?.prenom}`.localeCompare(`${cb?.nom}${cb?.prenom}`)
  })
  const annulees = toutes.filter((r) => !reservationActive(r, dateReference))
  const restantes = placesRestantes(depart, base.reservations, dateReference)
  const attente = base.liste_attente.filter((l) => l.depart_id === depart.id && estPasse(l.date, dateReference))
  const taches = base.taches.filter((t) => t.depart_id === depart.id && !t.contact_id).sort((a, b) => (a.echeance < b.echeance ? -1 : 1))
  const briseGlacePasse = estPasse(depart.soliapero_brise_glace, dateReference)
  const retourPasse = estPasse(depart.soliapero_retour, dateReference)

  async function saisirPresence(r: Reservation, moment: 'brise_glace' | 'retour', present: boolean) {
    const resume = await appliquer(
      presenceSoliapero(r, moment, present, { maintenant: maintenantA(dateReference), auteur: utilisateurId, nouvelId: () => crypto.randomUUID() }),
    )
    const contact = contacts.get(r.contact_id)
    toast(`${contact?.prenom} ${contact?.nom} : ${present ? 'présent(e)' : 'absent(e)'} au Soli'apéro ${moment === 'brise_glace' ? 'brise-glace' : 'retour'}.${resume ? ` ${resume}` : ''}`)
  }

  const etatSolde = (r: Reservation) => {
    if (r.solde_date && estPasse(r.solde_date, dateReference)) return { texte: `Soldé le ${formatDate(r.solde_date)}`, alerte: false }
    if (r.mise_en_demeure_date && estPasse(r.mise_en_demeure_date, dateReference)) return { texte: `Mise en demeure le ${formatDate(r.mise_en_demeure_date)}`, alerte: true }
    if (numeroJour(dateReference) > numeroJour(r.solde_echeance)) return { texte: `En retard (échéance ${formatDate(r.solde_echeance)})`, alerte: true }
    return { texte: `${formatMontant(r.solde_montant)} avant le ${formatDate(r.solde_echeance)}`, alerte: false }
  }

  const Presence = ({ r, moment }: { r: Reservation; moment: 'brise_glace' | 'retour' }) => {
    const valeur = moment === 'brise_glace' ? r.present_brise_glace : r.present_retour
    const confirme = moment === 'brise_glace' ? r.brise_glace_confirme_le : r.retour_confirme_le
    const passe = moment === 'brise_glace' ? briseGlacePasse : retourPasse
    if (!passe) {
      const invitation = moment === 'brise_glace' ? ajouterJours(depart.date_depart, -21) : ajouterJours(depart.date_retour, 2)
      const texte = confirme && estPasse(confirme, dateReference)
        ? `Confirmé le ${formatDate(confirme)}`
        : estPasse(invitation, dateReference)
          ? 'Invité, pas encore confirmé'
          : `Invitation le ${formatDate(invitation)}`
      return <span className="text-xs text-neutral-500">{texte}</span>
    }
    return (
      <span className="inline-flex gap-1">
        {[true, false].map((present) => (
          <button
            key={String(present)}
            type="button"
            onClick={() => valeur !== present && saisirPresence(r, moment, present)}
            className={`rounded-md border px-2 py-0.5 text-xs ${
              valeur === present ? (present ? 'border-bordeaux bg-bordeaux text-white' : 'border-rose bg-rose text-white') : 'border-beige-fonce text-neutral-600 hover:border-rose'
            }`}
          >
            {present ? 'Présent' : 'Absent'}
          </button>
        ))}
      </span>
    )
  }

  return (
    <>
      <EnTeteEcran
        titre={depart.offre}
        sousTitre={`Départ du ${formatDate(depart.date_depart)} au ${formatDate(depart.date_retour)}`}
        actions={
          <Link to="/planning" className="bouton-secondaire">
            Retour au planning
          </Link>
        }
      />
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <section className="carte p-4 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3">
            <Info libelle="Cible">
              <BadgeCible cible={depart.cible} />
            </Info>
            <Info libelle="Prix TTC">{formatMontant(depart.prix_ttc)}</Info>
            <Info libelle="Remplissage">
              <JaugeRemplissage reservees={depart.places_max - restantes} places={depart.places_max} />
            </Info>
            <Info libelle="Places">
              {depart.places_max} au maximum, {Math.max(0, restantes)} restante{restantes > 1 ? 's' : ''}
            </Info>
            <Info libelle="Liste d'attente">{attente.length === 0 ? 'Personne' : `${attente.length} personne${attente.length > 1 ? 's' : ''}`}</Info>
            <Info libelle="Échéance du solde">{formatDate(depart.echeance_solde)} (J-60)</Info>
            <Info libelle="Soli'apéro brise-glace">{formatDateHeure(depart.soliapero_brise_glace)}</Info>
            <Info libelle="Soli'apéro retour">{formatDateHeure(depart.soliapero_retour)}</Info>
            <Info libelle="Équipe">
              Animatrice {prenom(depart.animatrice_id)}, référente {prenom(referentePourCible(depart.cible))}
            </Info>
          </dl>
        </section>
        <section className="carte p-4">
          <h2 className="libelle mb-2 text-bordeaux">Liste d'attente</h2>
          {attente.length === 0 ? (
            <p className="text-neutral-500">Aucune inscription.</p>
          ) : (
            <ol className="list-inside list-decimal space-y-1">
              {attente.map((l) => {
                const c = contacts.get(l.contact_id)
                return (
                  <li key={l.id}>
                    <Link to={`/contacts/${l.contact_id}`} className="hover:text-rose">
                      {c?.prenom} {c?.nom}
                    </Link>
                    <span className="text-xs text-neutral-500"> · depuis le {formatDate(l.date)}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>

      <section className="carte mb-4 p-4">
        <h2 className="libelle mb-3 text-bordeaux">Voyageurs ({voyageurs.length})</h2>
        {voyageurs.length === 0 ? (
          <p className="text-neutral-500">Aucune réservation à cette date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead className="libelle text-[10px] text-bordeaux/70">
                <tr>
                  <th className="py-2 pr-3 font-medium">Voyageur</th>
                  <th className="py-2 pr-3 font-medium">Réservé le</th>
                  <th className="py-2 pr-3 font-medium">Solde</th>
                  <th className="py-2 pr-3 font-medium">Brise-glace</th>
                  <th className="py-2 pr-3 font-medium">Binôme de chambre</th>
                  <th className="py-2 pr-3 font-medium">Soirée retour</th>
                </tr>
              </thead>
              <tbody>
                {voyageurs.map((r) => {
                  const c = contacts.get(r.contact_id)
                  const solde = etatSolde(r)
                  return (
                    <tr key={r.id} className="border-t border-beige">
                      <td className="py-2 pr-3">
                        <Link to={`/contacts/${r.contact_id}`} className="font-medium text-bordeaux hover:text-rose">
                          {c?.prenom} {c?.nom}
                        </Link>
                        {r.hesite_dates && <span className="block text-xs text-orange">Hésite sur ses dates</span>}
                      </td>
                      <td className="py-2 pr-3 text-neutral-600">{formatDate(r.date_reservation)}</td>
                      <td className={`py-2 pr-3 ${solde.alerte ? 'font-medium text-rose-fonce' : 'text-neutral-700'}`}>{solde.texte}</td>
                      <td className="py-2 pr-3">
                        <Presence r={r} moment="brise_glace" />
                      </td>
                      <td className="py-2 pr-3 text-neutral-700">{r.binome ?? ''}</td>
                      <td className="py-2 pr-3">
                        <Presence r={r} moment="retour" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {annulees.length > 0 && (
          <p className="mt-3 text-xs text-neutral-500">
            Annulation{annulees.length > 1 ? 's' : ''} :{' '}
            {annulees.map((r) => `${contacts.get(r.contact_id)?.prenom} ${contacts.get(r.contact_id)?.nom} (le ${formatDate(r.annulation_date)})`).join(', ')}
          </p>
        )}
      </section>

      <section className="carte px-4 py-3">
        <h2 className="libelle mb-1 text-bordeaux">Tâches du départ</h2>
        <ListeTaches taches={taches} vide="Aucune tâche de départ à cette date (préparation et animation des Soli'apéros, point mi-séjour, satisfaction à chaud)." />
      </section>
    </>
  )
}

function Info({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div>
      <dt className="libelle mb-0.5 text-[10px] text-bordeaux/70">{libelle}</dt>
      <dd className="text-neutral-800">{children}</dd>
    </div>
  )
}
