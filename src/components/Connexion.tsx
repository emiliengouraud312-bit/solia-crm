// Connexion par e-mail et mot de passe (mode Supabase). Les comptes sont créés par Emilien dans Supabase
// (docs/07-mise-en-ligne.md) ; il n'y a pas d'inscription libre. À la première connexion, la personne
// choisit son profil dans l'équipe s'il ne se déduit pas de son adresse.
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import logo from '../../assets/brand/logo-solia.png'
import type { Compte } from '../store/StoreContext'

function messageErreur(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou mot de passe incorrect.'
  if (/email not confirmed/i.test(message)) return 'Ce compte n\'est pas encore confirmé : cochez « Auto Confirm User » en le créant dans Supabase.'
  if (/fetch|network/i.test(message)) return 'Supabase ne répond pas : vérifiez la connexion internet et l\'adresse du projet.'
  return message
}

/** Affiche le formulaire tant que personne n'est connecté, puis l'application pour le compte connecté. */
export function AvecConnexion({ client, children }: { client: SupabaseClient; children: (compte: Compte) => ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    client.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = client.auth.onAuthStateChange((_evenement, nouvelle) => setSession(nouvelle))
    return () => data.subscription.unsubscribe()
  }, [client])

  if (session === undefined) return <p className="p-8 text-bordeaux">Chargement du CRM Solia…</p>
  if (!session) return <FormulaireConnexion client={client} />
  const email = session.user.email ?? ''
  const membre = typeof session.user.user_metadata?.membre === 'string' ? (session.user.user_metadata.membre as string) : null
  return (
    <>
      {children({
        email,
        membre,
        // Le choix est gardé dans le compte Supabase (métadonnées) : aucune adresse n'est écrite dans le code.
        choisirMembre: async (id) => {
          const { error } = await client.auth.updateUser({ data: { membre: id } })
          if (error) throw new Error(error.message)
        },
        deconnecter: async () => void (await client.auth.signOut()),
      })}
    </>
  )
}

function FormulaireConnexion({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function seConnecter(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
    setEnvoi(false)
    if (error) setErreur(messageErreur(error.message))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bordeaux p-6">
      <form onSubmit={seConnecter} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <img src={logo} alt="Solia, rayonner ensemble" className="mx-auto mb-4 w-40" />
        <p className="libelle mb-1 text-center text-orange">CRM interne</p>
        <h1 className="mb-6 text-center font-titre text-4xl text-bordeaux">Connexion</h1>
        {erreur && <p className="mb-4 rounded-lg bg-rose-clair px-3 py-2 text-rose-fonce">{erreur}</p>}
        <label className="mb-3 block">
          <span className="libelle mb-1 block text-[10px] text-bordeaux/70">E-mail</span>
          <input className="champ" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="mb-5 block">
          <span className="libelle mb-1 block text-[10px] text-bordeaux/70">Mot de passe</span>
          <input className="champ" type="password" autoComplete="current-password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
        </label>
        <button type="submit" className="bouton-principal w-full justify-center py-2" disabled={envoi}>
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="mt-5 text-center text-xs text-neutral-500">
          Les comptes de l'équipe sont créés par Emilien. Mot de passe oublié : demandez-lui.
          <br />
          Données fictives de démonstration. Aucun message n'est réellement envoyé.
        </p>
      </form>
    </div>
  )
}
