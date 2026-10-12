// Tableau de bord. En phase 3 : « Ma journée » (tâches du jour puis en retard pour l'utilisateur connecté),
// ce que le moteur d'automatismes a fait à la date de référence, et les prochains départs.
// Les chiffres clés et les indicateurs des process arrivent en phase 4.
import { Link } from 'react-router'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { ListeTaches } from '../components/taches/ListeTaches'
import { jour, numeroJour } from '../domain/dates'
import { etatTache } from '../domain/taches'
import { placesRestantes } from '../domain/planning'
import { formatDate, formatDateLongue } from '../lib/format'
import { useCRM } from '../store/StoreContext'
import { JaugeRemplissage } from './Planning'

export function Accueil() {
  const { base, dateReference, utilisateurId } = useCRM()
  const utilisateur = base.equipe.find((m) => m.id === utilisateurId)
  const mesTaches = base.taches.filter((t) => t.responsable_id === utilisateurId)
  const duJour = mesTaches.filter((t) => etatTache(t, dateReference) === 'aujourdhui').sort((a, b) => (a.echeance < b.echeance ? -1 : 1))
  const enRetard = mesTaches.filter((t) => etatTache(t, dateReference) === 'en_retard').sort((a, b) => (a.echeance < b.echeance ? -1 : 1))
  const prochaines = mesTaches.filter((t) => etatTache(t, dateReference) === 'a_venir').sort((a, b) => (a.echeance < b.echeance ? -1 : 1)).slice(0, 3)
  const prochainsDeparts = base.departs.filter((d) => numeroJour(d.date_depart) >= numeroJour(dateReference)).slice(0, 3)

  // Ce que le moteur a fait à la date de référence.
  const messagesAuto = base.messages_envoyes.filter((m) => jour(m.date) === dateReference && m.regle_id && !m.tache_id)
  const tachesCreees = base.taches.filter((t) => jour(t.date_declenchement) === dateReference)
  const enRetardEquipe = base.taches.filter((t) => etatTache(t, dateReference) === 'en_retard').length

  return (
    <>
      <EnTeteEcran titre={`Bonjour ${utilisateur?.prenom ?? ''}`} sousTitre={`Tableau de bord · ${formatDateLongue(dateReference)}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="carte p-5 lg:col-span-2">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="libelle text-bordeaux">Ma journée</h2>
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
        <div className="space-y-6">
          <section className="carte p-5">
            <h2 className="libelle mb-2 text-bordeaux">Automatismes du jour</h2>
            <ul className="space-y-1 text-[13px] text-neutral-700">
              <li>
                <span className="font-semibold text-bordeaux">{messagesAuto.length}</span> message{messagesAuto.length > 1 ? 's' : ''} automatique{messagesAuto.length > 1 ? 's' : ''} (simulé{messagesAuto.length > 1 ? 's' : ''})
              </li>
              <li>
                <span className="font-semibold text-bordeaux">{tachesCreees.length}</span> tâche{tachesCreees.length > 1 ? 's' : ''} déclenchée{tachesCreees.length > 1 ? 's' : ''} par les process
              </li>
              <li>
                <span className="font-semibold text-rose">{enRetardEquipe}</span> tâche{enRetardEquipe > 1 ? 's' : ''} en retard dans l'équipe
              </li>
            </ul>
            <p className="mt-2 text-xs text-neutral-500">Avancez la date de référence (+1 jour, +7 jours) pour voir le moteur travailler.</p>
          </section>
          <section className="carte p-5">
            <h2 className="libelle mb-3 text-bordeaux">Prochains départs</h2>
            <ul className="space-y-3">
              {prochainsDeparts.map((depart) => (
                <li key={depart.id}>
                  <Link to={`/planning/departs/${depart.id}`} className="font-medium text-bordeaux hover:text-rose">
                    {depart.offre}
                  </Link>
                  <span className="block text-xs text-neutral-500">
                    {formatDate(depart.date_depart)} · brise-glace le {formatDate(depart.soliapero_brise_glace)}
                  </span>
                  <JaugeRemplissage reservees={depart.places_max - placesRestantes(depart, base.reservations, dateReference)} places={depart.places_max} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
