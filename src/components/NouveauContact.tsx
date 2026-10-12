// Création d'une fiche contact (process 01) avec les champs obligatoires du statut Contact :
// identité, cible, origine, canal préféré, consentements newsletter et WhatsApp.
import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { numeroJour } from '../domain/dates'
import { maintenantA, nouvelEvenement } from '../domain/evenements'
import { LIBELLES_CANAL_PREFERE, LIBELLES_CIBLE, LIBELLES_ORIGINE } from '../domain/libelles'
import { referentePourCible } from '../domain/referentiel'
import type { CanalPrefere, Cible, Contact, Origine } from '../domain/types'
import { formatDate } from '../lib/format'
import { inserer, type Changement } from '../store/DataStore'
import { useCRM } from '../store/StoreContext'

interface Formulaire {
  prenom: string
  nom: string
  email: string
  telephone: string
  ville: string
  date_naissance: string
  cible: Cible | ''
  origine: Origine | ''
  parrain_id: string
  canal_prefere: CanalPrefere | ''
  newsletter: '' | 'oui' | 'non'
  whatsapp: '' | 'oui' | 'non'
  envie_depart_id: string
  coordonnee_verifiee: boolean
  notes: string
}

const VIDE: Formulaire = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  ville: '',
  date_naissance: '',
  cible: '',
  origine: '',
  parrain_id: '',
  canal_prefere: '',
  newsletter: '',
  whatsapp: '',
  envie_depart_id: '',
  coordonnee_verifiee: false,
  notes: '',
}

/** Champs obligatoires du statut Contact (process 01 et 19). */
export function erreursNouveauContact(f: Formulaire): string[] {
  const erreurs: string[] = []
  if (!f.prenom.trim() || !f.nom.trim()) erreurs.push('Le prénom et le nom sont obligatoires.')
  if (!f.email.trim() && !f.telephone.trim()) erreurs.push('Il faut au moins un téléphone ou un e-mail.')
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) erreurs.push('L\'e-mail n\'est pas valide.')
  if (!f.cible) erreurs.push('La cible est obligatoire.')
  if (!f.origine) erreurs.push('L\'origine du contact est obligatoire.')
  if (f.origine === 'parrainage' && !f.parrain_id) erreurs.push('Pour un parrainage, choisissez le parrain (code parrain).')
  if (!f.canal_prefere) erreurs.push('Le canal préféré est obligatoire.')
  if (!f.newsletter || !f.whatsapp) erreurs.push('Les consentements newsletter et WhatsApp doivent être renseignés (oui ou non).')
  return erreurs
}

export function NouveauContact({ onFermer }: { onFermer: () => void }) {
  const { base, dateReference, utilisateurId, appliquer } = useCRM()
  const navigate = useNavigate()
  const [f, setF] = useState<Formulaire>(VIDE)
  const [erreurs, setErreurs] = useState<string[]>([])

  const maj = <K extends keyof Formulaire>(cle: K, valeur: Formulaire[K]) => setF((actuel) => ({ ...actuel, [cle]: valeur }))

  const parrains = base.contacts.filter((c) => c.code_parrain).sort((a, b) => a.nom.localeCompare(b.nom))
  const departs = base.departs.filter(
    (d) => (!f.cible || d.cible === f.cible) && numeroJour(d.date_depart) > numeroJour(dateReference),
  )

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    const liste = erreursNouveauContact(f)
    setErreurs(liste)
    if (liste.length > 0 || !f.cible || !f.origine || !f.canal_prefere) return

    const id = crypto.randomUUID()
    const date = maintenantA(dateReference)
    const parrain = base.contacts.find((c) => c.id === f.parrain_id)
    const contact: Contact = {
      id,
      prenom: f.prenom.trim(),
      nom: f.nom.trim(),
      email: f.email.trim() || null,
      telephone: f.telephone.trim() || null,
      date_naissance: f.date_naissance || null,
      ville: f.ville.trim() || null,
      cible: f.cible,
      origine: f.origine,
      origine_detail: parrain ? `Parrainé(e) par ${parrain.prenom} ${parrain.nom} (code ${parrain.code_parrain})` : null,
      parrain_id: parrain?.id ?? null,
      code_parrain: null,
      canal_prefere: f.canal_prefere,
      statut: 'contact',
      referente_id: referentePourCible(f.cible),
      envie_depart_id: f.envie_depart_id || null,
      dispo_debut: null,
      dispo_fin: null,
      budget: null,
      compte_social: null,
      craintes: null,
      contraintes: null,
      notes: f.notes.trim() || null,
      motif_perte: null,
      ambassadeur: false,
      date_creation: date,
    }
    const changements: Changement[] = [
      inserer('contacts', contact),
      inserer('evenements', nouvelEvenement(id, date, 'creation', { process: '01', auteur: utilisateurId, canal: 'crm' })),
      inserer(
        'evenements',
        nouvelEvenement(id, date, 'origine', {
          process: '01',
          auteur: utilisateurId,
          canal: 'crm',
          details: { origine: f.origine, ...(parrain ? { parrain_id: parrain.id } : {}) },
        }),
      ),
      inserer('consentements', { id: crypto.randomUUID(), contact_id: id, type: 'newsletter', valeur: f.newsletter === 'oui', date }),
      inserer('consentements', { id: crypto.randomUUID(), contact_id: id, type: 'whatsapp', valeur: f.whatsapp === 'oui', date }),
    ]
    if (f.coordonnee_verifiee) {
      changements.push(inserer('evenements', nouvelEvenement(id, date, 'coordonnee_verifiee', { process: '01', auteur: utilisateurId, canal: 'crm' })))
    }
    await appliquer(changements)
    onFermer()
    navigate(`/contacts/${id}`)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-bordeaux/40 p-6" role="dialog" aria-modal="true">
      <form onSubmit={enregistrer} className="carte w-full max-w-3xl p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="libelle mb-1 text-orange">Process 01 · Captation</p>
            <h2 className="font-titre text-3xl text-bordeaux">Nouveau contact</h2>
            <p className="mt-1 text-neutral-600">
              Fiche créée le {formatDate(dateReference)}. La référente est attribuée automatiquement selon la cible.
            </p>
          </div>
          <button type="button" className="bouton-secondaire" onClick={onFermer}>
            Fermer
          </button>
        </div>

        {erreurs.length > 0 && (
          <ul className="mb-4 list-inside list-disc rounded-lg border border-rose bg-rose-clair/60 p-3 text-rose-fonce">
            {erreurs.map((erreur) => (
              <li key={erreur}>{erreur}</li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Champ libelle="Prénom" obligatoire>
            <input className="champ" value={f.prenom} onChange={(e) => maj('prenom', e.target.value)} />
          </Champ>
          <Champ libelle="Nom" obligatoire>
            <input className="champ" value={f.nom} onChange={(e) => maj('nom', e.target.value)} />
          </Champ>
          <Champ libelle="E-mail" aide="Téléphone ou e-mail obligatoire">
            <input className="champ" type="email" value={f.email} onChange={(e) => maj('email', e.target.value)} />
          </Champ>
          <Champ libelle="Téléphone">
            <input className="champ" value={f.telephone} onChange={(e) => maj('telephone', e.target.value)} />
          </Champ>
          <Champ libelle="Cible" obligatoire>
            <select className="champ" value={f.cible} onChange={(e) => setF({ ...f, cible: e.target.value as Cible, envie_depart_id: '' })}>
              <option value="">Choisir</option>
              {Object.entries(LIBELLES_CIBLE).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          <Champ libelle="Origine du contact" obligatoire>
            <select className="champ" value={f.origine} onChange={(e) => maj('origine', e.target.value as Origine)}>
              <option value="">Choisir</option>
              {Object.entries(LIBELLES_ORIGINE).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          {f.origine === 'parrainage' && (
            <Champ libelle="Parrain (code parrain)" obligatoire>
              <select className="champ" value={f.parrain_id} onChange={(e) => maj('parrain_id', e.target.value)}>
                <option value="">Choisir le parrain</option>
                {parrains.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code_parrain} · {p.prenom} {p.nom}
                  </option>
                ))}
              </select>
            </Champ>
          )}
          <Champ libelle="Canal préféré" obligatoire>
            <select className="champ" value={f.canal_prefere} onChange={(e) => maj('canal_prefere', e.target.value as CanalPrefere)}>
              <option value="">Choisir</option>
              {Object.entries(LIBELLES_CANAL_PREFERE).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          <Champ libelle="Consentement newsletter" obligatoire>
            <OuiNon valeur={f.newsletter} onChange={(v) => maj('newsletter', v)} nom="newsletter" />
          </Champ>
          <Champ libelle="Consentement WhatsApp" obligatoire>
            <OuiNon valeur={f.whatsapp} onChange={(v) => maj('whatsapp', v)} nom="whatsapp" />
          </Champ>
          <Champ libelle="Envie de voyage" aide="Relie le contact à un départ du planning">
            <select className="champ" value={f.envie_depart_id} onChange={(e) => maj('envie_depart_id', e.target.value)}>
              <option value="">Pas encore d'envie précise</option>
              {departs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.offre} · {formatDate(d.date_depart)}
                </option>
              ))}
            </select>
          </Champ>
          <Champ libelle="Ville">
            <input className="champ" value={f.ville} onChange={(e) => maj('ville', e.target.value)} />
          </Champ>
          <Champ libelle="Date de naissance">
            <input className="champ" type="date" value={f.date_naissance} onChange={(e) => maj('date_naissance', e.target.value)} />
          </Champ>
          <label className="flex items-center gap-2 self-end pb-2 text-neutral-700">
            <input type="checkbox" className="h-4 w-4 accent-rose" checked={f.coordonnee_verifiee} onChange={(e) => maj('coordonnee_verifiee', e.target.checked)} />
            Coordonnée vérifiée (appel abouti ou e-mail délivré)
          </label>
          <Champ libelle="Notes" className="md:col-span-2">
            <textarea className="champ min-h-[70px]" value={f.notes} onChange={(e) => maj('notes', e.target.value)} />
          </Champ>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="bouton-secondaire" onClick={onFermer}>
            Annuler
          </button>
          <button type="submit" className="bouton-principal">
            Créer la fiche
          </button>
        </div>
      </form>
    </div>
  )
}

function Champ({ libelle, obligatoire, aide, className = '', children }: { libelle: string; obligatoire?: boolean; aide?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="libelle text-bordeaux/80">
        {libelle}
        {obligatoire && <span className="text-rose"> *</span>}
      </span>
      {children}
      {aide && <span className="text-xs text-neutral-500">{aide}</span>}
    </label>
  )
}

function OuiNon({ valeur, onChange, nom }: { valeur: '' | 'oui' | 'non'; onChange: (v: 'oui' | 'non') => void; nom: string }) {
  return (
    <span className="flex gap-4 py-1.5">
      {(['oui', 'non'] as const).map((v) => (
        <label key={v} className="flex items-center gap-1.5 text-neutral-700">
          <input type="radio" name={nom} className="accent-rose" checked={valeur === v} onChange={() => onChange(v)} />
          {v === 'oui' ? 'Oui' : 'Non'}
        </label>
      ))}
    </span>
  )
}
