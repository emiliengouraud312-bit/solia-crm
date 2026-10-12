import { Link } from 'react-router'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { PinSolia } from '../components/PinSolia'
import { numeroJour } from '../domain/dates'
import { formatDate } from '../lib/format'
import { useCRM } from '../store/StoreContext'

export function Accueil() {
  const { base, dateReference, utilisateurId } = useCRM()
  const utilisateur = base.equipe.find((m) => m.id === utilisateurId)
  const prochainsDeparts = base.departs
    .filter((d) => numeroJour(d.date_depart) >= numeroJour(dateReference))
    .slice(0, 3)

  return (
    <>
      <EnTeteEcran titre={`Bonjour ${utilisateur?.prenom ?? ''}`} sousTitre="Tableau de bord" />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="carte flex items-start gap-4 p-5 lg:col-span-2">
          <PinSolia taille={40} />
          <div>
            <h2 className="libelle mb-2 text-bordeaux">Le carnet de bord de l'équipe Solia</h2>
            <p className="text-neutral-700">
              Suivez chaque client de la première rencontre au parrainage. Les chiffres clés, « Ma journée » et les
              indicateurs des process arrivent sur cet écran en phase 4.
            </p>
            <Link to="/contacts" className="bouton-principal mt-4">
              Voir les contacts
            </Link>
          </div>
        </section>
        <section className="carte p-5">
          <h2 className="libelle mb-3 text-bordeaux">Prochains départs</h2>
          <ul className="space-y-2">
            {prochainsDeparts.map((depart) => (
              <li key={depart.id} className="flex justify-between gap-2">
                <span className="font-medium text-bordeaux">{depart.offre}</span>
                <span className="text-neutral-600">{formatDate(depart.date_depart)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
