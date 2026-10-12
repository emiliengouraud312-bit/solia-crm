// Contexte React : donne à tous les écrans la base, la date de référence et l'utilisateur connecté.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DATE_DEMO } from '../domain/referentiel'
import type { Base, DateISO } from '../domain/types'
import { appliquerChangements, modifier, type Changement, type DataStore } from './DataStore'

const CLE_UTILISATEUR = 'solia-crm-utilisateur'

interface ContexteCRM {
  base: Base
  store: DataStore
  dateReference: DateISO
  utilisateurId: string
  appliquer(changements: Changement[]): Promise<void>
  changerDateReference(date: DateISO): Promise<void>
  changerUtilisateur(id: string): void
  reinitialiser(): Promise<void>
}

const Contexte = createContext<ContexteCRM | null>(null)

function lireUtilisateur(): string {
  try {
    return window.localStorage.getItem(CLE_UTILISATEUR) ?? 'emilien'
  } catch {
    return 'emilien'
  }
}

export function StoreProvider({ store, children }: { store: DataStore; children: ReactNode }) {
  const [base, setBase] = useState<Base | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [utilisateurId, setUtilisateurId] = useState(lireUtilisateur)

  useEffect(() => {
    store.charger().then(setBase, (e: unknown) => setErreur(String(e)))
  }, [store])

  const appliquer = useCallback(
    async (changements: Changement[]) => {
      setBase((actuelle) => (actuelle ? appliquerChangements(actuelle, changements) : actuelle))
      await store.enregistrer(changements)
    },
    [store],
  )

  const changerDateReference = useCallback(
    (date: DateISO) => appliquer([modifier('parametres', 'parametres', { date_reference: date })]),
    [appliquer],
  )

  const changerUtilisateur = useCallback((id: string) => {
    setUtilisateurId(id)
    try {
      window.localStorage.setItem(CLE_UTILISATEUR, id)
    } catch {
      // préférence non mémorisée, sans conséquence
    }
  }, [])

  const reinitialiser = useCallback(async () => {
    setBase(await store.reinitialiser())
  }, [store])

  const valeur = useMemo<ContexteCRM | null>(
    () =>
      base && {
        base,
        store,
        dateReference: base.parametres[0]?.date_reference ?? DATE_DEMO,
        utilisateurId,
        appliquer,
        changerDateReference,
        changerUtilisateur,
        reinitialiser,
      },
    [base, store, utilisateurId, appliquer, changerDateReference, changerUtilisateur, reinitialiser],
  )

  if (erreur) {
    return <p className="p-8 text-rose-fonce">Impossible de charger les données : {erreur}</p>
  }
  if (!valeur) {
    return <p className="p-8 text-bordeaux">Chargement du CRM Solia…</p>
  }
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useCRM(): ContexteCRM {
  const contexte = useContext(Contexte)
  if (!contexte) throw new Error('useCRM doit être utilisé dans StoreProvider')
  return contexte
}
