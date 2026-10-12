// En-tête de la fiche contact : identité, cible, référente, statut, origine (avec le parrain),
// badge Ambassadeur et contrôle des champs obligatoires du statut (process 19).
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { age } from '../../domain/dates'
import { LIBELLES_CANAL_PREFERE, LIBELLES_ORIGINE } from '../../domain/libelles'
import type { Contact, DateISO, Depart, MembreEquipe } from '../../domain/types'
import { formatDate, formatMontant } from '../../lib/format'
import { BadgeCible, BadgeStatut } from '../Badges'
import { PinSolia } from '../PinSolia'

export function EnTeteFiche({
  contact,
  dateReference,
  referente,
  parrain,
  envie,
  ambassadeur,
  abonnementActif,
  manquants,
  grise,
}: {
  contact: Contact
  dateReference: DateISO
  referente?: MembreEquipe
  parrain?: Contact
  envie?: Depart
  ambassadeur: boolean
  abonnementActif: boolean
  manquants: string[]
  grise: boolean
}) {
  const infos: [string, ReactNode][] = [
    ['Référente', referente?.prenom],
    [
      'Origine',
      <>
        {LIBELLES_ORIGINE[contact.origine]}
        {parrain && (
          <>
            {' '}
            (parrain :{' '}
            <Link to={`/contacts/${parrain.id}`} className="text-rose hover:underline">
              {parrain.prenom} {parrain.nom}
            </Link>
            )
          </>
        )}
      </>,
    ],
    ['Canal préféré', LIBELLES_CANAL_PREFERE[contact.canal_prefere]],
    ['Téléphone', contact.telephone],
    ['E-mail', contact.email],
    ['Ville', contact.ville],
    ['Âge', contact.date_naissance ? `${age(contact.date_naissance, dateReference)} ans` : null],
    ['Fiche créée le', formatDate(contact.date_creation)],
    ['Code parrain', contact.code_parrain],
    ['Envie', envie ? `${envie.offre} du ${formatDate(envie.date_depart)} (${formatMontant(envie.prix_ttc)})` : null],
  ]

  return (
    <section className="carte flex flex-wrap items-start gap-5 p-5">
      <PinSolia taille={46} grise={grise} />
      <div className="min-w-[240px] flex-1">
        <p className="libelle mb-1 text-orange">Fiche contact</p>
        <h1 className="font-titre text-4xl leading-tight text-bordeaux">
          {contact.prenom} {contact.nom}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <BadgeCible cible={contact.cible} />
          <span className="rounded-md bg-beige px-2 py-0.5">
            <BadgeStatut statut={contact.statut} />
          </span>
          {ambassadeur && <span className="libelle rounded bg-orange px-2 py-0.5 text-[10px] text-white">Ambassadeur</span>}
          {abonnementActif && contact.statut !== 'abonne' && <span className="libelle rounded bg-bordeaux px-2 py-0.5 text-[10px] text-white">Abonnement actif</span>}
          {manquants.length === 0 ? (
            <span className="text-xs text-neutral-500">Fiche complète</span>
          ) : (
            <span className="rounded bg-orange-clair px-2 py-0.5 text-xs text-[#A65300]" title={manquants.join('\n')}>
              {manquants.length} champ(s) obligatoire(s) manquant(s) : {manquants.join(', ')}
            </span>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm md:grid-cols-[auto_1fr_auto_1fr]">
        {infos
          .filter(([, valeur]) => valeur)
          .map(([libelle, valeur]) => (
            <div key={libelle} className="contents">
              <dt className="text-neutral-500">{libelle}</dt>
              <dd className="text-neutral-800">{valeur}</dd>
            </div>
          ))}
      </dl>
    </section>
  )
}
