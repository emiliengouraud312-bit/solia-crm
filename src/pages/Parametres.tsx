import { EnTeteEcran } from '../components/EnTeteEcran'
import { DATE_DEMO } from '../domain/referentiel'
import { LIBELLES_CIBLE } from '../domain/libelles'
import { formatDate } from '../lib/format'
import { useCRM } from '../store/StoreContext'

export function Parametres() {
  const { base, dateReference, changerDateReference, reinitialiser, store } = useCRM()

  async function reinitialiserDemo() {
    const message =
      store.mode === 'supabase'
        ? 'Remettre les données de démonstration à leur état d\'origine, pour toute l\'équipe ? Toutes les saisies seront effacées.'
        : 'Remettre toutes les données de démonstration à leur état d\'origine ?'
    if (window.confirm(message)) {
      await reinitialiser()
    }
  }

  return (
    <>
      <EnTeteEcran titre="Paramètres" sousTitre="Réglages du CRM" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="carte p-5">
          <h2 className="libelle mb-3 text-bordeaux">Date de référence</h2>
          <p className="mb-3 text-neutral-700">
            Tout le CRM raisonne par rapport à cette date : scores, échéances, tâches dues et messages automatiques.
            Date de démonstration : {formatDate(DATE_DEMO)}.
          </p>
          <input
            type="date"
            className="champ w-auto"
            value={dateReference}
            onChange={(e) => e.target.value && changerDateReference(e.target.value)}
          />
        </section>
        <section className="carte p-5">
          <h2 className="libelle mb-3 text-bordeaux">Données de démonstration</h2>
          <p className="mb-3 text-neutral-700">
            Mode actuel : {store.mode === 'local' ? 'données locales (dans ce navigateur)' : 'Supabase (partagé)'}.
            La réinitialisation remet le jeu de démo d'origine et la date au {formatDate(DATE_DEMO)}.
          </p>
          <button className="bouton-principal" onClick={reinitialiserDemo}>
            Réinitialiser la démo
          </button>
        </section>
        <section className="carte p-5 lg:col-span-2">
          <h2 className="libelle mb-3 text-bordeaux">Équipe</h2>
          <table className="w-full text-left">
            <thead className="libelle text-bordeaux/70">
              <tr>
                <th className="py-2 pr-4 font-medium">Prénom</th>
                <th className="py-2 pr-4 font-medium">Fonction</th>
                <th className="py-2 pr-4 font-medium">Référente de</th>
                <th className="py-2 font-medium">E-mail de démo</th>
              </tr>
            </thead>
            <tbody>
              {base.equipe.map((membre) => (
                <tr key={membre.id} className="border-t border-beige-fonce">
                  <td className="py-2 pr-4 font-medium text-bordeaux">{membre.prenom}</td>
                  <td className="py-2 pr-4">{membre.fonction}</td>
                  <td className="py-2 pr-4">{membre.cible_referente ? LIBELLES_CIBLE[membre.cible_referente] : ''}</td>
                  <td className="py-2">{membre.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  )
}
