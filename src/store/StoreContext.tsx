// Contexte React : donne à tous les écrans la base vue à la date de référence, et l'utilisateur connecté.
// Le moteur d'automatismes tourne au chargement, à chaque changement de date et après chaque action :
// il crée les tâches, trace les messages automatiques (simulés) et fait les changements de statut.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { resumerAutomatismes, runAutomations } from '../domain/automations'
import { DATE_DEMO } from '../domain/referentiel'
import type { Base, DateISO } from '../domain/types'
import { vueALaDate } from '../domain/vueALaDate'
import { appliquerChangements, modifier, type Changement, type DataStore } from './DataStore'

const CLE_UTILISATEUR = 'solia-crm-utilisateur'

interface ContexteCRM {
  /** La base telle qu'on la voit à la date de référence (statuts, tâches et messages à cette date). */
  base: Base
  store: DataStore
  dateReference: DateISO
  utilisateurId: string
  /** Enregistre des changements, puis laisse tourner le moteur. Renvoie le résumé des automatismes. */
  appliquer(changements: Changement[]): Promise<string | null>
  changerDateReference(date: DateISO): Promise<string | null>
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

const dateDe = (base: Base): DateISO => base.parametres[0]?.date_reference ?? DATE_DEMO

/** Fait tourner le moteur jusqu'à ce qu'il n'ait plus rien à faire (trois passages au plus). */
function automatiser(base: Base): { base: Base; changements: Changement[] } {
  const changements: Changement[] = []
  let courante = base
  for (let passage = 0; passage < 3; passage++) {
    const nouveaux = runAutomations(courante, dateDe(courante), { nouvelId: () => crypto.randomUUID() })
    if (nouveaux.length === 0) break
    changements.push(...nouveaux)
    courante = appliquerChangements(courante, nouveaux)
  }
  return { base: courante, changements }
}

export function StoreProvider({ store, children }: { store: DataStore; children: ReactNode }) {
  // La base complète (avec ce que le moteur a déjà créé pour des dates plus avancées).
  const [brute, setBrute] = useState<Base | null>(null)
  const bruteRef = useRef<Base | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [utilisateurId, setUtilisateurId] = useState(lireUtilisateur)

  const remplacer = useCallback((base: Base) => {
    bruteRef.current = base
    setBrute(base)
  }, [])

  useEffect(() => {
    store.charger().then(
      async (base) => {
        const resultat = automatiser(base)
        remplacer(resultat.base)
        if (resultat.changements.length > 0) await store.enregistrer(resultat.changements)
      },
      (e: unknown) => setErreur(String(e)),
    )
  }, [store, remplacer])

  const appliquer = useCallback(
    async (changements: Changement[]) => {
      const actuelle = bruteRef.current
      if (!actuelle) return null
      const resultat = automatiser(appliquerChangements(actuelle, changements))
      remplacer(resultat.base)
      await store.enregistrer([...changements, ...resultat.changements])
      return resumerAutomatismes(resultat.changements)
    },
    [store, remplacer],
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
    remplacer(automatiser(await store.reinitialiser()).base)
  }, [store, remplacer])

  const dateReference = brute ? dateDe(brute) : DATE_DEMO
  const base = useMemo(() => (brute ? vueALaDate(brute, dateReference) : null), [brute, dateReference])

  const valeur = useMemo<ContexteCRM | null>(
    () =>
      base && {
        base,
        store,
        dateReference,
        utilisateurId,
        appliquer,
        changerDateReference,
        changerUtilisateur,
        reinitialiser,
      },
    [base, store, dateReference, utilisateurId, appliquer, changerDateReference, changerUtilisateur, reinitialiser],
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
