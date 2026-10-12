// Petit message de confirmation en bas de l'écran (« Réservation enregistrée »).
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Ton = 'succes' | 'erreur'
const Contexte = createContext<(message: string, ton?: Ton) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; ton: Ton; cle: number } | null>(null)
  const afficher = useCallback((message: string, ton: Ton = 'succes') => {
    const cle = Date.now()
    setToast({ message, ton, cle })
    window.setTimeout(() => setToast((actuel) => (actuel?.cle === cle ? null : actuel)), ton === 'erreur' ? 6000 : 3500)
  }, [])
  return (
    <Contexte.Provider value={afficher}>
      {children}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 max-w-lg -translate-x-1/2">
          <div
            key={toast.cle}
            role="status"
            className={`animate-apparition rounded-xl px-4 py-3 text-sm shadow-lg ${
              toast.ton === 'erreur' ? 'bg-rose-fonce text-white' : 'bg-bordeaux text-beige'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </Contexte.Provider>
  )
}

export function useToast() {
  return useContext(Contexte)
}
