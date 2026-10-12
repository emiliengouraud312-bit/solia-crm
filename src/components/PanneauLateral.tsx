// Panneau qui glisse depuis la droite (détail du calcul d'un score).
import { useEffect, type ReactNode } from 'react'

export function PanneauLateral({ titre, sousTitre, onFermer, children }: { titre: string; sousTitre?: string; onFermer: () => void; children: ReactNode }) {
  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [onFermer])
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-bordeaux/30" onClick={onFermer} role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-2xl animate-glissement overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {sousTitre && <p className="libelle mb-1 text-orange">{sousTitre}</p>}
            <h2 className="font-titre text-3xl text-bordeaux">{titre}</h2>
          </div>
          <button className="bouton-secondaire" onClick={onFermer}>
            Fermer
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}
