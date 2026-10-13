// Contexte React : donne à tous les écrans la base vue à la date de référence, et l'utilisateur connecté.
// Le moteur d'automatismes tourne au chargement, à chaque changement de date et après chaque action :
// il crée les tâches, trace les messages automatiques (simulés) et fait les changements de statut.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { resumerAutomatismes, runAutomations } from '../domain/automations'
import { membreDuCompte } from '../domain/equipe'
import { DATE_DEMO } from '../domain/referentiel'
import type { Base, DateISO } from '../domain/types'
import { vueALaDate } from '../domain/vueALaDate'
import { appliquerChangements, modifier, type Changement, type DataStore } from './DataStore'

const CLE_UTILISATEUR = 'solia-crm-utilisateur'

/** Compte connecté (mode Supabase). En mode local, l'utilisateur se choisit dans le bandeau. */
export interface Compte {
  email: string
  /** Membre de l'équipe choisi à la première connexion (gardé dans le compte Supabase). */
  membre: string | null
  choisirMembre(id: string): Promise<void>
  deconnecter(): Promise<void>
}

interface ContexteCRM {
  /** La base telle qu'on la voit à la date de référence (statuts, tâches et messages à cette date). */
  base: Base
  store: DataStore
  dateReference: DateISO
  utilisateurId: string
  compte: Compte | null
  /** Relit les données (mode Supabase : voir les changements faits depuis un autre navigateur). */
  actualiser(): Promise<void>
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

export function StoreProvider({ store, compte = null, children }: { store: DataStore; compte?: Compte | null; children: ReactNode }) {
  // La base complète (avec ce que le moteur a déjà créé pour des dates plus avancées).
  const [brute, setBrute] = useState<Base | null>(null)
  const bruteRef = useRef<Base | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  // Enregistrement refusé par Supabase (réseau, droits) : signalé en haut de l'écran.
  const [alerte, setAlerte] = useState<string | null>(null)
  const [utilisateurId, setUtilisateurId] = useState(lireUtilisateur)

  const remplacer = useCallback((base: Base) => {
    bruteRef.current = base
    setBrute(base)
  }, [])

  const enregistrer = useCallback(
    async (changements: Changement[]) => {
      if (changements.length === 0) return
      try {
        await store.enregistrer(changements)
      } catch (e) {
        setAlerte(e instanceof Error ? e.message : String(e))
      }
    },
    [store],
  )

  const charger = useCallback(async () => {
    try {
      const resultat = automatiser(await store.charger())
      remplacer(resultat.base)
      await enregistrer(resultat.changements)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    }
  }, [store, remplacer, enregistrer])

  useEffect(() => {
    void charger()
  }, [charger])

  const actualiser = useCallback(async () => {
    setAlerte(null)
    await charger()
  }, [charger])

  const appliquer = useCallback(
    async (changements: Changement[]) => {
      const actuelle = bruteRef.current
      if (!actuelle) return null
      const resultat = automatiser(appliquerChangements(actuelle, changements))
      remplacer(resultat.base)
      await enregistrer([...changements, ...resultat.changements])
      return resumerAutomatismes(resultat.changements)
    },
    [remplacer, enregistrer],
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
    setAlerte(null)
    try {
      remplacer(automatiser(await store.reinitialiser()).base)
    } catch (e) {
      setAlerte(e instanceof Error ? e.message : String(e))
    }
  }, [store, remplacer])

  const dateReference = brute ? dateDe(brute) : DATE_DEMO
  const base = useMemo(() => (brute ? vueALaDate(brute, dateReference) : null), [brute, dateReference])
  // Mode Supabase : l'utilisateur est le membre de l'équipe qui correspond au compte connecté.
  const membre = compte && base ? membreDuCompte(compte.email, base.equipe, compte.membre) : null
  const utilisateur = compte ? (membre?.id ?? '') : utilisateurId

  const valeur = useMemo<ContexteCRM | null>(
    () =>
      base && {
        base,
        store,
        dateReference,
        utilisateurId: utilisateur,
        compte,
        actualiser,
        appliquer,
        changerDateReference,
        changerUtilisateur,
        reinitialiser,
      },
    [base, store, dateReference, utilisateur, compte, actualiser, appliquer, changerDateReference, changerUtilisateur, reinitialiser],
  )

  if (erreur) {
    return (
      <EcranMessage titre="Impossible de charger les données" compte={compte}>
        {erreur}
      </EcranMessage>
    )
  }
  if (!valeur) {
    return (
      <EcranMessage titre="Chargement du CRM Solia">
        {store.mode === 'supabase' ? 'Lecture des données partagées. À la toute première ouverture, le jeu de démonstration s\'installe (quelques secondes).' : ''}
      </EcranMessage>
    )
  }
  if (compte && !membre) {
    return <ChoixMembre compte={compte} equipe={valeur.base.equipe} />
  }
  return (
    <Contexte.Provider value={valeur}>
      {alerte && (
        <div role="alert" className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-rose-fonce px-4 py-2 text-sm text-white">
          <span>Les dernières modifications n'ont pas pu être enregistrées dans Supabase ({alerte}).</span>
          <button type="button" className="rounded-md bg-white px-2 py-0.5 text-rose-fonce" onClick={() => void actualiser()}>
            Recharger les données
          </button>
        </div>
      )}
      {children}
    </Contexte.Provider>
  )
}

/** Première connexion avec une adresse qui n'est pas une adresse de démo : la personne dit qui elle est. */
function ChoixMembre({ compte, equipe }: { compte: Compte; equipe: Base['equipe'] }) {
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  async function choisir(id: string) {
    setEnvoi(true)
    setErreur(null)
    try {
      await compte.choisirMembre(id)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
      setEnvoi(false)
    }
  }
  return (
    <EcranMessage titre="Qui êtes-vous ?" compte={compte}>
      <span className="mb-4 block">
        Première connexion avec {compte.email}. Choisissez votre profil : le CRM s'en souviendra pour ce compte.
      </span>
      <span className="grid gap-2 text-left">
        {equipe.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={envoi}
            onClick={() => void choisir(m.id)}
            className="rounded-lg border border-beige-fonce px-3 py-2 text-left hover:border-rose hover:bg-rose-clair/40 disabled:opacity-50"
          >
            <span className="block font-semibold text-bordeaux">{m.prenom}</span>
            <span className="block text-xs text-neutral-600">{m.fonction}</span>
          </button>
        ))}
      </span>
      {erreur && <span className="mt-3 block text-rose-fonce">Enregistrement impossible : {erreur}</span>}
    </EcranMessage>
  )
}

function EcranMessage({ titre, compte, children }: { titre: string; compte?: Compte | null; children?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-beige p-6">
      <div className="carte max-w-lg p-8 text-center">
        <h1 className="mb-3 font-titre text-3xl text-bordeaux">{titre}</h1>
        {children && <div className="text-neutral-700">{children}</div>}
        {compte && (
          <button type="button" className="bouton-secondaire mt-5" onClick={() => void compte.deconnecter()}>
            Se déconnecter
          </button>
        )}
      </div>
    </div>
  )
}

export function useCRM(): ContexteCRM {
  const contexte = useContext(Contexte)
  if (!contexte) throw new Error('useCRM doit être utilisé dans StoreProvider')
  return contexte
}
