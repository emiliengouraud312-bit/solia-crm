// Bandeau du haut : la date de référence (tout le CRM se recalcule quand elle change)
// et l'utilisateur connecté.
import { ajouterJours } from '../domain/dates'
import { DATE_DEMO } from '../domain/referentiel'
import { formatDate, formatDateLongue } from '../lib/format'
import { useCRM } from '../store/StoreContext'

export function BandeauDate() {
  const { base, dateReference, changerDateReference, utilisateurId, changerUtilisateur } = useCRM()
  const estDateDemo = dateReference === DATE_DEMO

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-beige-fonce bg-white/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="libelle text-bordeaux">Date de référence</span>
        <span className="rounded-lg bg-orange-clair px-2.5 py-1 font-semibold text-bordeaux">
          {formatDateLongue(dateReference)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="bouton-secondaire" onClick={() => changerDateReference(ajouterJours(dateReference, 1))}>
          +1 jour
        </button>
        <button className="bouton-secondaire" onClick={() => changerDateReference(ajouterJours(dateReference, 7))}>
          +7 jours
        </button>
        <input
          type="date"
          aria-label="Choisir la date de référence"
          className="champ w-auto"
          value={dateReference}
          onChange={(e) => e.target.value && changerDateReference(e.target.value)}
        />
        <button
          className="bouton-secondaire"
          disabled={estDateDemo}
          onClick={() => changerDateReference(DATE_DEMO)}
        >
          Revenir au {formatDate(DATE_DEMO)}
        </button>
      </div>
      <label className="ml-auto flex items-center gap-2">
        <span className="libelle text-bordeaux">Connecté(e)</span>
        <select className="champ w-auto" value={utilisateurId} onChange={(e) => changerUtilisateur(e.target.value)}>
          {base.equipe.map((membre) => (
            <option key={membre.id} value={membre.id}>
              {membre.prenom}
            </option>
          ))}
        </select>
      </label>
    </header>
  )
}
