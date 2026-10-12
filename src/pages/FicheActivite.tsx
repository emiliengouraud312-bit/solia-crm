// Fiche activité (cahier des charges, section 3.5) : date, heure, cible, lieu, capacité, ouverture,
// inscrits et présents. La présence se saisit ici après l'activité.
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { BadgeCible, BadgeStatut } from '../components/Badges'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { useToast } from '../components/Toast'
import { estPasse } from '../domain/dates'
import { formatDate } from '../lib/format'
import { modifier } from '../store/DataStore'
import { useCRM } from '../store/StoreContext'

export function FicheActivite() {
  const { id = '' } = useParams()
  const { base, dateReference, appliquer } = useCRM()
  const toast = useToast()
  const activite = base.activites.find((a) => a.id === id)
  if (!activite) {
    return (
      <div className="carte p-6">
        <p className="mb-3">Cette activité n'existe pas.</p>
        <Link to="/planning" className="bouton-secondaire">
          Retour au planning
        </Link>
      </div>
    )
  }
  const contacts = new Map(base.contacts.map((c) => [c.id, c]))
  const participations = base.participations.filter((p) => p.activite_id === activite.id)
  const inscrits = participations.filter((p) => p.inscrit)
  const presents = participations.filter((p) => p.present === true)
  const passee = estPasse(activite.date, dateReference)
  const animatrice = base.equipe.find((m) => m.id === activite.animatrice_id)?.prenom

  async function presence(participationId: string, present: boolean, nom: string) {
    const resume = await appliquer([modifier('participations', participationId, { present })])
    toast(`${nom} : ${present ? 'présent(e)' : 'absent(e)'} à « ${activite?.titre} ».${resume ? ` ${resume}` : ''}`)
  }

  return (
    <>
      <EnTeteEcran
        titre={activite.titre}
        sousTitre={`Activité du ${formatDate(activite.date)} à ${activite.heure.replace(':', ' h ')}`}
        actions={
          <Link to="/planning" className="bouton-secondaire">
            Retour au planning
          </Link>
        }
      />
      <section className="carte mb-4 p-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3">
          <Info libelle="Cible">
            <BadgeCible cible={activite.cible} />
          </Info>
          <Info libelle="Lieu">{activite.lieu}</Info>
          <Info libelle="Ouverture">{activite.ouverte_a_tous ? 'Ouverte à tous (première activité du mois)' : 'Réservée aux abonnés'}</Info>
          <Info libelle="Capacité">{activite.capacite} places</Info>
          <Info libelle="Inscrits">
            {inscrits.length} sur {activite.capacite}
          </Info>
          <Info libelle="Présents">{passee ? presents.length : 'Après l\'activité'}</Info>
          <Info libelle="Animatrice">{animatrice}</Info>
        </dl>
      </section>
      <section className="carte p-4">
        <h2 className="libelle mb-3 text-bordeaux">Participants ({participations.length})</h2>
        {participations.length === 0 ? (
          <p className="text-neutral-500">Aucun inscrit pour l'instant.</p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="libelle text-[10px] text-bordeaux/70">
              <tr>
                <th className="py-2 pr-3 font-medium">Participant</th>
                <th className="py-2 pr-3 font-medium">Statut</th>
                <th className="py-2 pr-3 font-medium">Inscrit</th>
                <th className="py-2 pr-3 font-medium">Présence</th>
              </tr>
            </thead>
            <tbody>
              {participations.map((p) => {
                const c = contacts.get(p.contact_id)
                const nom = `${c?.prenom} ${c?.nom}`
                return (
                  <tr key={p.id} className="border-t border-beige">
                    <td className="py-2 pr-3">
                      <Link to={`/contacts/${p.contact_id}`} className="font-medium text-bordeaux hover:text-rose">
                        {nom}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{c && <BadgeStatut statut={c.statut} />}</td>
                    <td className="py-2 pr-3 text-neutral-600">{p.inscrit ? 'Oui' : 'Non'}</td>
                    <td className="py-2 pr-3">
                      {passee ? (
                        <span className="inline-flex gap-1">
                          {[true, false].map((present) => (
                            <button
                              key={String(present)}
                              type="button"
                              onClick={() => p.present !== present && presence(p.id, present, nom)}
                              className={`rounded-md border px-2 py-0.5 text-xs ${
                                p.present === present
                                  ? present
                                    ? 'border-bordeaux bg-bordeaux text-white'
                                    : 'border-rose bg-rose text-white'
                                  : 'border-beige-fonce text-neutral-600 hover:border-rose'
                              }`}
                            >
                              {present ? 'Présent' : 'Absent'}
                            </button>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-500">À venir</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
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
