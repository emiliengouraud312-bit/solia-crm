// Écran Messages (cahier des charges, section 3.7) : la bibliothèque des 41 modèles groupés par process,
// avec l'aperçu rendu sur un contact choisi, et la liste des envois simulés.
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EnTeteEcran } from '../components/EnTeteEcran'
import { ApercuMessage } from '../components/taches/ApercuMessage'
import { maintenantA } from '../domain/evenements'
import { NOMS_PROCESS } from '../domain/libelles'
import { rendreMessage } from '../domain/messages'
import { MESSAGES } from '../domain/referentiel'
import { formatDateHeure } from '../lib/format'
import { useCRM } from '../store/StoreContext'

export function Messages() {
  const { base } = useCRM()
  const [onglet, setOnglet] = useState<'bibliotheque' | 'envois'>('bibliotheque')
  return (
    <>
      <EnTeteEcran
        titre="Messages"
        sousTitre="Modèles et envois simulés"
        actions={
          <div className="flex rounded-lg border border-beige-fonce bg-white p-0.5">
            {(
              [
                ['bibliotheque', `Bibliothèque (${MESSAGES.length})`],
                ['envois', `Envois simulés (${base.messages_envoyes.length})`],
              ] as const
            ).map(([code, libelle]) => (
              <button
                key={code}
                type="button"
                onClick={() => setOnglet(code)}
                className={`rounded-md px-3 py-1 text-sm ${onglet === code ? 'bg-bordeaux text-white' : 'text-bordeaux hover:bg-beige'}`}
              >
                {libelle}
              </button>
            ))}
          </div>
        }
      />
      {onglet === 'bibliotheque' ? <Bibliotheque /> : <Envois />}
    </>
  )
}

function Bibliotheque() {
  const { base, dateReference } = useCRM()
  const [code, setCode] = useState('M01')
  const [recherche, setRecherche] = useState('')
  const monique = base.contacts.find((c) => c.prenom === 'Monique' && c.nom === 'Bernard')
  const [contactId, setContactId] = useState(monique?.id ?? base.contacts[0]?.id ?? '')
  const modele = MESSAGES.find((m) => m.code === code) ?? MESSAGES[0]
  const contact = base.contacts.find((c) => c.id === contactId)
  const parProcess = useMemo(() => {
    const groupes = new Map<string, typeof MESSAGES>()
    for (const m of MESSAGES) groupes.set(m.process, [...(groupes.get(m.process) ?? []), m])
    return [...groupes]
  }, [])
  const proposes = base.contacts
    .filter((c) => !recherche || `${c.prenom} ${c.nom}`.toLowerCase().includes(recherche.toLowerCase()))
    .sort((a, b) => `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`))
    .slice(0, 50)

  const rendu = useMemo(() => {
    if (!contact) return null
    // Contexte le plus parlant : le dernier voyage réservé, sinon le départ visé, et le dernier devis.
    const reservation = base.reservations.filter((r) => r.contact_id === contact.id).sort((a, b) => (a.date_reservation < b.date_reservation ? 1 : -1))[0] ?? null
    const depart = base.departs.find((d) => d.id === (reservation?.depart_id ?? contact.envie_depart_id)) ?? null
    const devis = base.devis.filter((d) => d.contact_id === contact.id).sort((a, b) => (a.date_envoi < b.date_envoi ? 1 : -1))[0] ?? null
    const enquete = base.enquetes.find((e) => e.reservation_id === reservation?.id) ?? null
    return rendreMessage(modele.code, { base, contact, date: maintenantA(dateReference), reservation, depart, devis, enquete })
  }, [base, contact, modele, dateReference])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="carte max-h-[calc(100vh-180px)] overflow-y-auto p-3">
        {parProcess.map(([process, modeles]) => (
          <div key={process} className="mb-3">
            <h2 className="libelle px-2 py-1 text-[10px] text-orange">
              Process {process} · {NOMS_PROCESS[process]}
            </h2>
            {modeles.map((m) => (
              <button
                key={m.code}
                type="button"
                onClick={() => setCode(m.code)}
                className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[13px] ${m.code === code ? 'bg-rose-clair text-rose-fonce' : 'text-neutral-800 hover:bg-beige'}`}
              >
                <span className="w-9 shrink-0 font-semibold">{m.code}</span>
                <span className="flex-1">{m.nom}</span>
                <span className={`libelle shrink-0 rounded px-1.5 py-0.5 text-[9px] ${m.envoi.startsWith('auto') ? 'bg-orange-clair text-[#A65300]' : 'bg-beige-fonce text-bordeaux'}`}>
                  {m.envoi.startsWith('auto') ? 'Auto' : 'Tâche'}
                </span>
              </button>
            ))}
          </div>
        ))}
      </section>
      <section className="carte p-4">
        <p className="libelle mb-1 text-orange">
          Process {modele.process} · {NOMS_PROCESS[modele.process]}
        </p>
        <h2 className="mb-3 font-titre text-3xl text-bordeaux">
          {modele.code} · {modele.nom}
        </h2>
        <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
          <div>
            <dt className="libelle text-[10px] text-bordeaux/70">Déclencheur</dt>
            <dd>{modele.declencheur}</dd>
          </div>
          <div>
            <dt className="libelle text-[10px] text-bordeaux/70">Délai</dt>
            <dd>{modele.delai}</dd>
          </div>
          <div>
            <dt className="libelle text-[10px] text-bordeaux/70">Envoi</dt>
            <dd>{modele.envoi}</dd>
          </div>
          <div>
            <dt className="libelle text-[10px] text-bordeaux/70">Expéditeur</dt>
            <dd>{modele.expediteur}</dd>
          </div>
        </dl>
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="libelle text-[10px] text-bordeaux/70">Aperçu pour</span>
            <input className="champ w-56" placeholder="Rechercher un contact" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
          <select className="champ w-64" value={contactId} onChange={(e) => setContactId(e.target.value)} aria-label="Contact de l'aperçu">
            {contact && !proposes.includes(contact) && (
              <option value={contact.id}>
                {contact.prenom} {contact.nom}
              </option>
            )}
            {proposes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prenom} {c.nom}
              </option>
            ))}
          </select>
          {contact && (
            <Link to={`/contacts/${contact.id}`} className="pb-2 text-xs text-rose hover:underline">
              Ouvrir la fiche
            </Link>
          )}
        </div>
        {rendu && <ApercuMessage rendu={rendu} />}
        <details className="mt-3 text-[13px]">
          <summary className="cursor-pointer text-neutral-500">Voir le modèle brut avec ses variables</summary>
          <p className="mt-2 whitespace-pre-line rounded-lg bg-beige/60 p-3 font-mono text-xs text-neutral-700">
            {modele.objet ? `Objet : ${modele.objet}\n\n` : ''}
            {modele.corps}
          </p>
        </details>
      </section>
    </div>
  )
}

function Envois() {
  const { base } = useCRM()
  const [filtre, setFiltre] = useState<'tous' | 'auto' | 'manuels'>('tous')
  const [ouvert, setOuvert] = useState<string | null>(null)
  const contacts = new Map(base.contacts.map((c) => [c.id, c]))
  const automatique = (code: string) => MESSAGES.find((m) => m.code === code)?.envoi.startsWith('auto') ?? false
  const envois = [...base.messages_envoyes]
    .filter((m) => filtre === 'tous' || (filtre === 'auto') === automatique(m.message_code))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 300)
  return (
    <section className="carte p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ['tous', 'Tous'],
            ['auto', 'Automatiques'],
            ['manuels', 'Envoyés depuis une tâche ou une action'],
          ] as const
        ).map(([code, libelle]) => (
          <button
            key={code}
            type="button"
            onClick={() => setFiltre(code)}
            className={`rounded-full border px-3 py-1 text-xs ${filtre === code ? 'border-rose bg-rose text-white' : 'border-beige-fonce text-neutral-700 hover:border-rose'}`}
          >
            {libelle}
          </button>
        ))}
        <span className="ml-auto text-xs text-neutral-500">Simulation : aucun message n'est réellement envoyé.</span>
      </div>
      {envois.length === 0 ? (
        <p className="rounded-lg bg-beige/60 px-4 py-6 text-center text-neutral-500">Aucun envoi à cette date.</p>
      ) : (
        <ul className="divide-y divide-beige">
          {envois.map((m) => {
            const c = contacts.get(m.contact_id)
            return (
              <li key={m.id} className="py-2">
                <button type="button" className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-left" onClick={() => setOuvert(ouvert === m.id ? null : m.id)}>
                  <span className="w-36 shrink-0 text-[13px] text-neutral-600">{formatDateHeure(m.date)}</span>
                  <span className="w-10 shrink-0 font-semibold text-bordeaux">{m.message_code}</span>
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className="font-medium text-neutral-800">
                      {c?.prenom} {c?.nom}
                    </span>
                    <span className="text-neutral-500"> · {MESSAGES.find((x) => x.code === m.message_code)?.nom}</span>
                  </span>
                  <span className="text-xs text-neutral-500">
                    {m.canal}
                    {m.regle_id ? ` · ${m.regle_id}` : ''}
                  </span>
                </button>
                {ouvert === m.id && (
                  <div className="mt-2 rounded-lg bg-beige/60 p-3 text-[13px]">
                    <p className="mb-1 text-xs text-neutral-500">
                      De {m.expediteur} ·{' '}
                      <Link to={`/contacts/${m.contact_id}`} className="text-rose hover:underline">
                        voir la fiche
                      </Link>
                    </p>
                    {m.objet_rendu && <p className="font-medium text-bordeaux">{m.objet_rendu}</p>}
                    <p className="whitespace-pre-line text-neutral-700">{m.corps_rendu}</p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
