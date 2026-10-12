import type { ReactNode } from 'react'

/** Titre d'écran (Redotic) avec un sous-titre (Lemon Milk) et des actions à droite. */
export function EnTeteEcran({ titre, sousTitre, actions }: { titre: string; sousTitre?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {sousTitre && <p className="libelle mb-2 text-orange">{sousTitre}</p>}
        <h1 className="titre-ecran">{titre}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
