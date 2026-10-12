// Onglets de la fiche contact (cahier des charges, section 3.4) : Journal, Tâches, Voyages, Messages,
// Consentements, Fiche de passation, Notes.
import { useState, type ReactNode } from 'react'
import { action, changerConsentement, modifierNotes, type ContexteAction } from '../../domain/actions'
import type { ElementJournal } from '../../domain/journal'
import type { PointsEvenement } from '../../domain/parcours'
import type { DonneesContact } from '../../domain/scoring'
import { reservationCourante } from '../../domain/statuts'
import type { Base, DateISO, Reservation, TypeConsentement } from '../../domain/types'
import { formatDate, formatDateHeure, formatMontant, formatPoints } from '../../lib/format'
import { useCRM } from '../../store/StoreContext'
import { FormulaireAction } from '../FormulaireAction'
import { ListeTaches } from '../taches/ListeTaches'
import { useToast } from '../Toast'
import { etatTache } from '../../domain/taches'

type Onglet = 'journal' | 'taches' | 'voyages' | 'messages' | 'consentements' | 'passation' | 'notes'

export function OngletsFiche({
  donnees,
  journal,
  points,
  nomsEquipe,
  contexte,
}: {
  donnees: DonneesContact
  journal: ElementJournal[]
  points: Map<string, PointsEvenement[]>
  nomsEquipe: Map<string, string>
  contexte: () => ContexteAction
}) {
  const [onglet, setOnglet] = useState<Onglet>('journal')
  const onglets: [Onglet, string, number | null][] = [
    ['journal', 'Journal', journal.length],
    ['taches', 'Tâches', donnees.taches.filter((t) => t.statut === 'a_faire').length],
    ['voyages', 'Voyages', donnees.reservations.length + donnees.devis.length],
    ['messages', 'Messages', donnees.messages.length],
    ['consentements', 'Consentements', null],
    ['passation', 'Fiche de passation', null],
    ['notes', 'Notes', null],
  ]
  return (
    <section className="carte">
      <div className="flex flex-wrap gap-1 border-b border-beige-fonce px-3 pt-3">
        {onglets.map(([code, libelle, nombre]) => (
          <button
            key={code}
            type="button"
            onClick={() => setOnglet(code)}
            className={`-mb-px rounded-t-lg border px-2.5 py-2 text-[13px] ${
              onglet === code ? 'border-beige-fonce border-b-white bg-white font-medium text-bordeaux' : 'border-transparent text-neutral-600 hover:text-rose'
            }`}
          >
            {libelle}
            {nombre !== null && nombre > 0 && <span className="ml-1.5 rounded-full bg-beige px-1.5 text-xs text-neutral-600">{nombre}</span>}
          </button>
        ))}
      </div>
      <div className="p-4">
        {onglet === 'journal' && <Journal journal={journal} points={points} nomsEquipe={nomsEquipe} />}
        {onglet === 'taches' && <Taches donnees={donnees} />}
        {onglet === 'voyages' && <Voyages donnees={donnees} />}
        {onglet === 'messages' && <Messages donnees={donnees} />}
        {onglet === 'consentements' && <Consentements donnees={donnees} contexte={contexte} />}
        {onglet === 'passation' && <Passation donnees={donnees} contexte={contexte} />}
        {onglet === 'notes' && <Notes donnees={donnees} journal={journal} nomsEquipe={nomsEquipe} contexte={contexte} />}
      </div>
    </section>
  )
}

function Vide({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-beige/60 px-4 py-6 text-center text-neutral-500">{children}</p>
}

// ---------------------------------------------------------------------------

function Journal({ journal, points, nomsEquipe }: { journal: ElementJournal[]; points: Map<string, PointsEvenement[]>; nomsEquipe: Map<string, string> }) {
  const [filtre, setFiltre] = useState<'tout' | 'points' | 'sans_statuts'>('tout')
  const lignes = journal.filter((el) => (filtre === 'points' ? points.has(el.id) : filtre === 'sans_statuts' ? el.type !== 'statut' : true))
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ['tout', 'Tout'],
            ['points', 'Avec des points'],
            ['sans_statuts', 'Sans les changements de statut'],
          ] as const
        ).map(([code, libelle]) => (
          <button key={code} type="button" onClick={() => setFiltre(code)} className={`rounded-full border px-3 py-1 text-xs ${filtre === code ? 'border-rose bg-rose text-white' : 'border-beige-fonce text-neutral-600 hover:border-rose'}`}>
            {libelle}
          </button>
        ))}
      </div>
      {lignes.length === 0 ? (
        <Vide>Aucun élément dans le journal à cette date.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="libelle text-[10px] text-bordeaux/70">
              <tr>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Événement</th>
                <th className="py-2 pr-3 font-medium">Canal</th>
                <th className="py-2 pr-3 font-medium">Process</th>
                <th className="py-2 pr-3 font-medium">Auteur</th>
                <th className="py-2 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((el) => {
                const pts = points.get(el.id) ?? []
                return (
                  <tr key={el.id} className="border-t border-beige align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-neutral-600">{formatDateHeure(el.date)}</td>
                    <td className="py-2 pr-3">
                      <span className={el.type === 'statut' ? 'text-neutral-500' : 'font-medium text-neutral-800'}>{el.libelle}</span>
                      {el.details.map((d) => (
                        <span key={d} className="block text-xs text-neutral-500">
                          {d}
                        </span>
                      ))}
                    </td>
                    <td className="py-2 pr-3 text-neutral-600">{el.canal}</td>
                    <td className="py-2 pr-3 text-neutral-600">{el.process}</td>
                    <td className="py-2 pr-3 text-neutral-600">{el.auteur_id ? nomsEquipe.get(el.auteur_id) : el.source === 'evenement' ? 'Automatique' : ''}</td>
                    <td className="py-2 text-right">
                      {pts.map((p) => (
                        <span key={p.code} className={`ml-1 inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold ${p.points < 0 ? 'bg-rose-clair text-rose-fonce' : 'bg-orange-clair text-[#A65300]'}`} title={p.score === 'conversion' ? 'Score de conversion' : 'Score d\'engagement'}>
                          {p.code} {p.points > 0 ? '+' : ''}
                          {formatPoints(p.points)}
                        </span>
                      ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------

function Taches({ donnees }: { donnees: DonneesContact }) {
  const { dateReference } = useCRM()
  const ordre = { en_retard: 0, aujourdhui: 1, a_venir: 2, fait: 3, annulee: 4 }
  const taches = [...donnees.taches].sort((a, b) => {
    const ea = ordre[etatTache(a, dateReference)]
    const eb = ordre[etatTache(b, dateReference)]
    if (ea !== eb) return ea - eb
    return ea >= 3 ? (a.echeance < b.echeance ? 1 : -1) : a.echeance < b.echeance ? -1 : 1
  })
  return <ListeTaches taches={taches} sansContact vide="Aucune tâche pour ce contact à cette date. Le moteur d'automatismes en crée au fil des process (relances, appels, envois)." />
}

// ---------------------------------------------------------------------------

const STATUTS_RESERVATION = { reservee: 'Réservée', soldee: 'Soldée', voyagee: 'Voyagée', annulee: 'Annulée' }
const STATUTS_DEVIS = { envoye: 'Envoyé', accepte: 'Accepté', expire: 'Expiré', refuse: 'Refusé' }
const MOYENS = { carte: 'carte bancaire', virement: 'virement', cheque: 'chèque', cheques_vacances: 'chèques-vacances' }

function Voyages({ donnees }: { donnees: DonneesContact }) {
  const { base } = useCRM()
  const depart = (id: string) => base.departs.find((d) => d.id === id)
  const oui = (v: boolean | null, si: string, sinon: string, attente = 'à venir') => (v === null ? attente : v ? si : sinon)
  if (donnees.reservations.length === 0 && donnees.devis.length === 0 && donnees.listeAttente.length === 0) {
    return <Vide>Aucun voyage ni devis pour l'instant.</Vide>
  }
  return (
    <div className="space-y-4">
      {[...donnees.reservations]
        .sort((a, b) => (a.date_reservation < b.date_reservation ? 1 : -1))
        .map((r) => {
          const d = depart(r.depart_id)
          const initial = r.depart_initial_id ? depart(r.depart_initial_id) : undefined
          const lignes: [string, ReactNode][] = [
            ['Réservé le', formatDate(r.date_reservation)],
            ['Acompte', `${formatMontant(r.acompte_montant)} le ${formatDate(r.acompte_date)} (${MOYENS[r.moyen_paiement]})`],
            [
              'Solde',
              `${formatMontant(r.solde_montant)}, échéance ${formatDate(r.solde_echeance)} : ${r.solde_date ? `réglé le ${formatDate(r.solde_date)}` : 'à encaisser'}${
                r.mise_en_demeure_date ? ` · mise en demeure le ${formatDate(r.mise_en_demeure_date)}` : ''
              }`,
            ],
            ['Appel de bienvenue', r.appel_bienvenue_date ? `le ${formatDate(r.appel_bienvenue_date)}` : `pas encore (${r.tentatives_appel} tentative(s))`],
            ['Groupe WhatsApp', r.ajout_groupe_date ? `ajouté le ${formatDate(r.ajout_groupe_date)}${r.message_groupe_poste ? ', a posté un message' : ''}` : 'pas encore'],
            ['Soli\'apéro brise-glace', `${d ? formatDateHeure(d.soliapero_brise_glace) : ''} : ${oui(r.present_brise_glace, 'présent', 'absent')}${r.binome ? ` · binôme : ${r.binome}` : ''}${r.opposition_image ? ' · opposition au droit à l\'image' : ''}`],
            ['Séjour', r.note_chaud !== null ? `note à chaud ${r.note_chaud}/10${r.incident_non_resolu ? ', incident non résolu' : ''}${r.partage_groupe ? ', a partagé des photos' : ''}` : 'à venir'],
            ['Soli\'apéro retour', `${d ? formatDateHeure(d.soliapero_retour) : ''} : ${oui(r.present_retour, 'présent', 'absent')}${r.album_remis ? ', album remis' : ''}`],
          ]
          if (initial) lignes.push(['Report', `depuis ${initial.offre} du ${formatDate(initial.date_depart)}, le ${formatDate(r.date_report)} (report gratuit utilisé)`])
          if (r.statut === 'annulee') {
            lignes.push(['Annulation', `le ${formatDate(r.annulation_date)} (${r.annulation_motif}) : ${formatMontant(r.montant_retenu)} retenus, ${formatMontant(r.montant_rembourse)} remboursés`])
          }
          const enquete = donnees.enquetes.find((e) => e.reservation_id === r.id)
          if (enquete) lignes.push(['Enquête', `recommandation ${enquete.nps}/10 le ${formatDate(enquete.date)}${enquete.avis_google_publie ? ', avis Google publié' : ''}`])
          return (
            <article key={r.id} className="rounded-lg border border-beige-fonce p-4">
              <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-bordeaux">
                  {d?.offre} · du {formatDate(d?.date_depart)} au {formatDate(d?.date_retour)}
                </h3>
                <span className="libelle rounded bg-beige px-2 py-0.5 text-[10px] text-bordeaux">{STATUTS_RESERVATION[r.statut]}</span>
              </header>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {lignes.map(([libelle, valeur]) => (
                  <div key={libelle} className="contents">
                    <dt className="text-neutral-500">{libelle}</dt>
                    <dd>{valeur}</dd>
                  </div>
                ))}
              </dl>
            </article>
          )
        })}
      {donnees.devis.length > 0 && (
        <div>
          <h3 className="libelle mb-2 text-bordeaux">Devis</h3>
          <table className="w-full text-left text-sm">
            <tbody>
              {donnees.devis.map((x) => (
                <tr key={x.id} className="border-t border-beige">
                  <td className="py-1.5 pr-3">{depart(x.depart_id)?.offre} du {formatDate(depart(x.depart_id)?.date_depart)}</td>
                  <td className="py-1.5 pr-3">{formatMontant(x.montant)}</td>
                  <td className="py-1.5 pr-3 text-neutral-600">
                    envoyé le {formatDate(x.date_envoi)}, valable jusqu'au {formatDate(x.date_fin_validite)}
                  </td>
                  <td className="py-1.5 text-right">{STATUTS_DEVIS[x.statut]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {donnees.listeAttente.length > 0 && (
        <p className="text-sm text-neutral-700">
          En liste d'attente :{' '}
          {donnees.listeAttente.map((l) => `${depart(l.depart_id)?.offre} du ${formatDate(depart(l.depart_id)?.date_depart)} (depuis le ${formatDate(l.date)})`).join(', ')}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function Messages({ donnees }: { donnees: DonneesContact }) {
  if (donnees.messages.length === 0) {
    return <Vide>Aucun message simulé pour ce contact à cette date.</Vide>
  }
  return (
    <ul className="space-y-3">
      {[...donnees.messages]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((m) => (
          <li key={m.id} className="rounded-lg border border-beige-fonce p-3">
            <p className="text-xs text-neutral-500">
              {formatDateHeure(m.date)} · {m.message_code} · {m.canal} · simulation, aucun envoi réel
            </p>
            {m.objet_rendu && <p className="font-medium text-bordeaux">{m.objet_rendu}</p>}
            <p className="whitespace-pre-line text-sm text-neutral-700">{m.corps_rendu}</p>
          </li>
        ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------

const NOMS_CONSENTEMENT: Record<TypeConsentement, string> = {
  newsletter: 'Newsletter',
  whatsapp: 'WhatsApp',
  droit_image: 'Droit à l\'image',
}

function Consentements({ donnees, contexte }: { donnees: DonneesContact; contexte: () => ContexteAction }) {
  const { appliquer, dateReference } = useCRM()
  const toast = useToast()
  const historique = donnees.consentements.filter((c) => c.date.slice(0, 10) <= dateReference).sort((a, b) => (a.date < b.date ? 1 : -1))
  const actuel = (type: TypeConsentement) => historique.find((c) => c.type === type)
  async function changer(type: TypeConsentement, valeur: boolean) {
    await appliquer(changerConsentement(contexte(), type, valeur))
    toast(`Consentement ${NOMS_CONSENTEMENT[type].toLowerCase()} : ${valeur ? 'accordé' : 'retiré'}.`)
  }
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        {(Object.keys(NOMS_CONSENTEMENT) as TypeConsentement[]).map((type) => {
          const c = actuel(type)
          return (
            <div key={type} className="rounded-lg border border-beige-fonce p-3">
              <p className="libelle text-[10px] text-bordeaux/70">{NOMS_CONSENTEMENT[type]}</p>
              <p className="my-1 text-lg font-semibold text-bordeaux">{c ? (c.valeur ? 'Oui' : 'Non') : 'Non renseigné'}</p>
              {c && <p className="text-xs text-neutral-500">depuis le {formatDateHeure(c.date)}</p>}
              <button type="button" className="bouton-secondaire mt-2 text-xs" onClick={() => changer(type, !(c?.valeur ?? false))}>
                {c?.valeur ? 'Enregistrer un retrait' : 'Enregistrer un accord'}
              </button>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Newsletter : critère P3 et, en cas de retrait, N1 et M5. WhatsApp : P4 et N2. Chaque changement est horodaté dans le journal des consentements (RGPD).
      </p>
      {historique.length > 0 && (
        <table className="mt-3 w-full text-left text-sm">
          <tbody>
            {historique.map((c) => (
              <tr key={c.id} className="border-t border-beige">
                <td className="py-1.5 pr-3 text-neutral-600">{formatDateHeure(c.date)}</td>
                <td className="py-1.5 pr-3">{NOMS_CONSENTEMENT[c.type]}</td>
                <td className="py-1.5">{c.valeur ? 'Accordé' : 'Refusé ou retiré'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------

function Passation({ donnees, contexte }: { donnees: DonneesContact; contexte: () => ContexteAction }) {
  const { base, dateReference } = useCRM()
  const [edition, setEdition] = useState(false)
  const courante = reservationCourante(donnees, dateReference)
  if (donnees.reservations.length === 0) {
    return <Vide>La fiche de passation se remplit au passage en Réservé (process 05) : attentes, craintes, contraintes, détails personnels.</Vide>
  }
  return (
    <div className="space-y-3">
      {[...donnees.reservations]
        .sort((a, b) => (a.date_reservation < b.date_reservation ? 1 : -1))
        .map((r) => (
          <FichePassationVoyage key={r.id} reservation={r} donnees={donnees} base={base} dateReference={dateReference} modifiable={r.id === courante?.id} onModifier={() => setEdition(true)} />
        ))}
      {edition && <FormulaireAction definition={action('fiche_passation')} contexte={contexte} onFermer={() => setEdition(false)} />}
    </div>
  )
}

function FichePassationVoyage({
  reservation,
  donnees,
  base,
  modifiable,
  onModifier,
}: {
  reservation: Reservation
  donnees: DonneesContact
  base: Base
  dateReference: DateISO
  modifiable: boolean
  onModifier: () => void
}) {
  const fiche = donnees.fiches.find((f) => f.reservation_id === reservation.id)
  const d = base.departs.find((x) => x.id === reservation.depart_id)
  return (
    <article className="rounded-lg border border-beige-fonce p-4">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-bordeaux">
          {d?.offre} du {formatDate(d?.date_depart)}
        </h3>
        {modifiable && (
          <button type="button" className="bouton-secondaire text-xs" onClick={onModifier}>
            {fiche?.remplie_le ? 'Modifier' : 'Remplir la fiche'}
          </button>
        )}
      </header>
      {fiche?.remplie_le ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-neutral-500">Attentes</dt>
          <dd>{fiche.attentes}</dd>
          <dt className="text-neutral-500">Craintes</dt>
          <dd>{fiche.craintes}</dd>
          <dt className="text-neutral-500">Contraintes</dt>
          <dd>{fiche.contraintes}</dd>
          <dt className="text-neutral-500">Détails personnels</dt>
          <dd>{fiche.details_personnels}</dd>
          <dt className="text-neutral-500">Remplie le</dt>
          <dd>{formatDate(fiche.remplie_le)}</dd>
        </dl>
      ) : (
        <p className="text-sm text-[#A65300]">
          Pas encore remplie. Sans fiche de passation, la tâche d'appel de bienvenue ne se crée pas (process 05).
        </p>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------

function Notes({
  donnees,
  journal,
  nomsEquipe,
  contexte,
}: {
  donnees: DonneesContact
  journal: ElementJournal[]
  nomsEquipe: Map<string, string>
  contexte: () => ContexteAction
}) {
  const { appliquer } = useCRM()
  const toast = useToast()
  const [texte, setTexte] = useState(donnees.contact.notes ?? '')
  const [ajout, setAjout] = useState(false)
  const c = donnees.contact
  const notes = journal.filter((el) => el.type === 'note')
  const decouverte: [string, string | null][] = [
    ['Disponibilités', c.dispo_debut && c.dispo_fin ? `du ${formatDate(c.dispo_debut)} au ${formatDate(c.dispo_fin)}` : null],
    ['Budget confirmé', c.budget !== null ? formatMontant(c.budget) : null],
    ['Craintes', c.craintes],
    ['Contraintes', c.contraintes],
    ['Compte réseau social', c.compte_social],
  ]
  async function enregistrer() {
    await appliquer(modifierNotes(contexte(), texte))
    toast('Notes enregistrées.')
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <h3 className="libelle mb-2 text-bordeaux">Notes libres</h3>
        <textarea className="champ min-h-[120px]" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ce que l'équipe doit savoir sur ce contact" />
        <button type="button" className="bouton-principal mt-2" onClick={enregistrer} disabled={texte === (c.notes ?? '')}>
          Enregistrer les notes
        </button>
        <h3 className="libelle mb-2 mt-5 text-bordeaux">Informations de découverte</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {decouverte.map(([libelle, valeur]) => (
            <div key={libelle} className="contents">
              <dt className="text-neutral-500">{libelle}</dt>
              <dd className={valeur ? '' : 'text-neutral-400'}>{valeur ?? 'non renseigné'}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="libelle text-bordeaux">Notes datées du journal</h3>
          <button type="button" className="bouton-secondaire text-xs" onClick={() => setAjout(true)}>
            Ajouter une note
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-neutral-500">Aucune note datée.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-beige/60 p-2 text-sm">
                <span className="block text-xs text-neutral-500">
                  {formatDateHeure(n.date)}
                  {n.auteur_id ? ` · ${nomsEquipe.get(n.auteur_id)}` : ''}
                </span>
                {n.details.join(' ')}
              </li>
            ))}
          </ul>
        )}
      </div>
      {ajout && <FormulaireAction definition={action('note')} contexte={contexte} onFermer={() => setAjout(false)} />}
    </div>
  )
}
