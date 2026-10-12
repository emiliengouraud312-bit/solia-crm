// Moteur d'automatismes (cahier des charges, section 7) : règles R01 à R61.
//
// runAutomations(base, dateReference) parcourt les règles et renvoie les changements à enregistrer :
// tâches à créer, à marquer faites ou annulées, messages automatiques à tracer (simulés),
// événements et changements de statut automatiques. Fonction pure et idempotente : chaque élément
// a une clé d'unicité (règle + entité + occurrence), relancer le moteur ne crée jamais de doublon.
//
// Tout est daté : une tâche apparaît à la date de son déclencheur, un message part à sa date due,
// une tâche est « faite » à la date de l'action qui la réalise (réponse, solde, appel...).
// Le moteur ne crée tâches et messages qu'à partir de DEBUT_AUTOMATISMES : l'historique antérieur
// du jeu de démonstration est considéré comme déjà traité.
import { inserer, modifier, type Changement } from '../store/DataStore'
import { formatDate } from '../lib/format'
import { nouveauCodeParrain } from './actions'
import { ajouterJours, ajouterJoursOuvres, ajouterMois, ecartJours, estPasse, horodatage, jour, numeroJour, plusMinutes } from './dates'
import { nouvelEvenement } from './evenements'
import { messageEnvoye, type ContexteMessage } from './messages'
import { placesRestantes, reservationActive } from './planning'
import { DEBUT_AUTOMATISMES, referentePourCible } from './referentiel'
import { statutALaDate } from './vueALaDate'
import type {
  Abonnement,
  Base,
  Contact,
  DateISO,
  Depart,
  Devis,
  Evenement,
  FichePassation,
  Horodatage,
  Participation,
  Reservation,
  Statut,
  Tache,
  TypeEvenement,
} from './types'

export interface OptionsMoteur {
  /** Générateur d'identifiants (uuid). */
  nouvelId: () => string
  /** Tirage aléatoire pour les codes parrain (règle R59). */
  tirage?: () => number
  /** Date de mise en service du moteur (par défaut DEBUT_AUTOMATISMES). */
  debut?: DateISO
}

/** Description d'une règle, pour l'écran Tâches et la documentation. */
export interface RegleAutomatisme {
  id: string
  process: string
  libelle: string
}

// ---------------------------------------------------------------------------
// Ce que le moteur veut voir exister à la date de référence
// ---------------------------------------------------------------------------

interface TacheVoulue {
  regle: string
  cle: string
  titre: string
  process: string
  declenchement: Horodatage
  echeance: Horodatage
  responsable_id: string | null
  contact_id?: string | null
  depart_id?: string | null
  activite_id?: string | null
  reservation_id?: string | null
  message_code?: string | null
  action_id?: string | null
  faite?: { date: Horodatage; par: string | null } | null
  annulee?: { date: Horodatage; motif: string } | null
}

interface MessageVoulu {
  regle: string
  cle: string
  code: string
  date: Horodatage
  contexte: Omit<ContexteMessage, 'base' | 'date'>
}

interface EvenementVoulu {
  regle: string
  cle: string
  contact: Contact
  date: Horodatage
  type: TypeEvenement
  process: string
  details: Record<string, unknown>
  /** Changement de statut porté par l'événement (type « statut »). */
  vers?: Statut
  /** Autres changements à faire en même temps (devis expiré, réservation voyagée). */
  autres?: Changement[]
}

const TYPES_DEMANDE: TypeEvenement[] = ['demande_ecrite', 'appel_entrant', 'visite_agence']

/** Signes que le prospect a répondu (annule les relances R06, R07 et le passage en Perdu R08). */
const TYPES_RETOUR: TypeEvenement[] = [
  'reponse_relance',
  'rdv_accepte',
  'rdv_realise',
  'appel_entrant',
  'visite_agence',
  'demande_ecrite',
  'question_modalites',
  'accord_devis',
  'devis_envoye',
  'refus',
  'reservation',
  'liste_attente',
  'relance_devis_aboutie',
]

class Moteur {
  private readonly ref: DateISO
  private readonly debut: DateISO
  private readonly taches: TacheVoulue[] = []
  private readonly messages: MessageVoulu[] = []
  private readonly evenements: EvenementVoulu[] = []
  private readonly autresChangements: Changement[] = []

  private readonly contacts = new Map<string, Contact>()
  private readonly journal = new Map<string, Evenement[]>()
  private readonly reservationsParContact = new Map<string, Reservation[]>()
  private readonly reservationsParDepart = new Map<string, Reservation[]>()
  private readonly fiches = new Map<string, FichePassation>()
  private readonly participations = new Map<string, Participation[]>()
  private readonly abonnements = new Map<string, Abonnement[]>()

  constructor(
    private readonly base: Base,
    dateReference: DateISO,
    private readonly options: OptionsMoteur,
  ) {
    this.ref = dateReference
    this.debut = options.debut ?? DEBUT_AUTOMATISMES
    const ajouter = <T>(carte: Map<string, T[]>, cle: string, valeur: T) => {
      const liste = carte.get(cle)
      if (liste) liste.push(valeur)
      else carte.set(cle, [valeur])
    }
    for (const c of base.contacts) this.contacts.set(c.id, c)
    for (const e of [...base.evenements].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) ajouter(this.journal, e.contact_id, e)
    for (const r of base.reservations) {
      ajouter(this.reservationsParContact, r.contact_id, r)
      ajouter(this.reservationsParDepart, r.depart_id, r)
    }
    for (const f of base.fiches_passation) this.fiches.set(f.reservation_id, f)
    for (const p of base.participations) ajouter(this.participations, p.contact_id, p)
    for (const a of base.abonnements) ajouter(this.abonnements, a.contact_id, a)
  }

  // -------------------------------------------------------------------------
  // Outils
  // -------------------------------------------------------------------------

  private passe(date: string | null | undefined): date is string {
    return Boolean(date) && estPasse(date as string, this.ref)
  }

  private journalDe(contactId: string): Evenement[] {
    return (this.journal.get(contactId) ?? []).filter((e) => this.passe(e.date))
  }

  /** Premier événement d'un des types donnés, strictement après une date. */
  private premierApres(contactId: string, types: TypeEvenement[], apres: string): Evenement | undefined {
    return this.journalDe(contactId).find((e) => types.includes(e.type) && e.date > apres)
  }

  private statutA(contactId: string, date: DateISO): Statut {
    const contact = this.contacts.get(contactId) as Contact
    return statutALaDate(contact, this.journal.get(contactId) ?? [], date).statut
  }

  private depart(id: string): Depart | undefined {
    return this.base.departs.find((d) => d.id === id)
  }

  private activite(id: string) {
    return this.base.activites.find((a) => a.id === id)
  }

  /** Réservations actives d'un départ à une date (faites et pas annulées). */
  private voyageursDu(departId: string, date: DateISO): Reservation[] {
    return (this.reservationsParDepart.get(departId) ?? []).filter((r) => reservationActive(r, date))
  }

  /** Abonnement actif d'un contact à une date. */
  private abonnementA(contactId: string, date: DateISO): Abonnement | undefined {
    return (this.abonnements.get(contactId) ?? []).find(
      (a) => a.decision === 'abonne' && a.date_debut !== null && estPasse(a.date_debut, date) && (!a.date_fin || !estPasse(a.date_fin, date)),
    )
  }

  private presences(contactId: string): { participation: Participation; date: DateISO; heure: string; titre: string; ouverte: boolean; activiteId: string }[] {
    return (this.participations.get(contactId) ?? [])
      .filter((p) => p.present === true)
      .flatMap((p) => {
        const a = this.activite(p.activite_id)
        return a ? [{ participation: p, date: a.date, heure: a.heure, titre: a.titre, ouverte: a.ouverte_a_tous, activiteId: a.id }] : []
      })
      .filter((p) => this.passe(p.date))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
  }

  /** Date de l'événement du journal qui réalise une étape, avec son auteur. */
  private realisee(e: Evenement | undefined): TacheVoulue['faite'] {
    return e ? { date: e.date, par: e.auteur_id } : null
  }

  private annulation(date: string | null | undefined, motif: string): TacheVoulue['annulee'] {
    return date ? { date, motif } : null
  }

  private tache(t: TacheVoulue) {
    this.taches.push(t)
  }

  private message(regle: string, cle: string, code: string, date: Horodatage, contexte: MessageVoulu['contexte']) {
    this.messages.push({ regle, cle, code, date, contexte })
  }

  private h(date: DateISO, heure: string): Horodatage {
    return horodatage(date, heure)
  }

  // -------------------------------------------------------------------------
  // Règles
  // -------------------------------------------------------------------------

  executerRegles(): void {
    for (const contact of this.base.contacts) {
      if (!this.passe(contact.date_creation)) continue
      this.regles01(contact)
      this.regles02(contact)
      this.regles03et04(contact)
      this.reglesReservations(contact)
      this.reglesFidelite(contact)
    }
    this.reglesDeparts()
    this.reglesNewsletter()
    this.reglesParrainage()
  }

  /** Process 01 : captation (R01, R02, R03). */
  private regles01(c: Contact) {
    // R01 : message de bienvenue personnel, automatique à J+2.
    this.message('R01', `R01:${c.id}`, 'M01', this.h(ajouterJours(c.date_creation, 2), '09:00'), { contact: c })

    // R02 : inscription à la newsletter à J+2 si l'accord a été donné.
    const accord = this.base.consentements
      .filter((x) => x.contact_id === c.id && x.type === 'newsletter' && x.valeur)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0]
    if (accord) {
      this.evenements.push({
        regle: 'R02',
        cle: `R02:${c.id}`,
        contact: c,
        date: this.h(ajouterJours(accord.date, 2), '09:05'),
        type: 'inscription_newsletter',
        process: '01',
        details: { responsable: 'florentine' },
      })
    }

    // R03 : invitation personnelle quand un départ correspond aux envies d'un Contact.
    const envie = c.envie_depart_id ? this.depart(c.envie_depart_id) : undefined
    if (envie && numeroJour(envie.date_depart) > numeroJour(c.date_creation)) {
      const prospect = this.journalDe(c.id).find((e) => e.type === 'statut' && e.details.vers === 'prospect')
      this.tache({
        regle: 'R03',
        cle: `R03:${c.id}:${envie.id}`,
        titre: `Inviter personnellement au départ ${envie.offre} du ${formatDate(envie.date_depart)}`,
        process: '01',
        declenchement: c.date_creation,
        echeance: this.h(ajouterJours(c.date_creation, 1), '10:00'),
        responsable_id: c.referente_id,
        contact_id: c.id,
        depart_id: envie.id,
        message_code: 'M02',
        annulee: this.annulation(prospect?.date, 'Le contact est devenu Prospect'),
      })
    }
  }

  /** Process 02 : demandes entrantes (R04 à R08). */
  private regles02(c: Contact) {
    for (const demande of this.journalDe(c.id).filter((e) => TYPES_DEMANDE.includes(e.type))) {
      // R04 : accusé de réception automatique d'un formulaire du site.
      if (demande.type === 'demande_ecrite' && demande.canal === 'site') {
        this.message('R04', `R04:${demande.id}`, 'M03', plusMinutes(demande.date, 1), { contact: c })
      }

      // R05 : réponse personnelle sous 24 h ouvrées (un appel ou une visite reçoit une réponse en direct).
      if (demande.type === 'demande_ecrite') {
        this.tache({
          regle: 'R05',
          cle: `R05:${demande.id}`,
          titre: 'Répondre personnellement et proposer un rendez-vous',
          process: '02',
          declenchement: demande.date,
          echeance: ajouterJoursOuvres(demande.date, 1),
          responsable_id: 'solveig',
          contact_id: c.id,
          action_id: 'reponse_personnelle',
          faite: this.realisee(this.premierApres(c.id, ['reponse_personnelle', 'appel_sortant', 'rdv_accepte'], demande.date)),
        })
      }

      // R06, R07, R08 : relances à J+3 et J+7 après notre réponse, puis Perdu à J+14 sans retour.
      if (this.statutA(c.id, jour(demande.date)) !== 'prospect') continue
      const reponse = demande.type === 'demande_ecrite' ? this.premierApres(c.id, ['reponse_personnelle'], demande.date)?.date : demande.date
      if (!reponse) continue
      const retour = this.premierApres(c.id, TYPES_RETOUR, reponse)
      const annulee = this.annulation(retour?.date, 'Le prospect a répondu')
      const base = { process: '02', responsable_id: 'solveig', contact_id: c.id, declenchement: reponse, annulee }
      this.tache({ ...base, regle: 'R06', cle: `R06:${demande.id}`, titre: 'Première relance, courte et chaleureuse', echeance: this.h(ajouterJours(reponse, 3), '10:00'), message_code: 'M04' })
      this.tache({ ...base, regle: 'R07', cle: `R07:${demande.id}`, titre: 'Deuxième relance avec un élément concret', echeance: this.h(ajouterJours(reponse, 7), '10:00'), message_code: 'M05' })
      const perte = this.h(ajouterJours(reponse, 14), '07:00')
      if ((!retour || retour.date > perte) && this.statutA(c.id, ajouterJours(perte, -1)) === 'prospect') {
        this.evenements.push({
          regle: 'R08',
          cle: `R08:${demande.id}`,
          contact: c,
          date: perte,
          type: 'statut',
          process: '02',
          vers: 'perdu',
          details: { motif: 'Sans réponse 14 jours après la demande' },
        })
      }
    }
  }

  /** Process 03 et 04 : découverte, devis, relance, liste d'attente (R09 à R14). */
  private regles03et04(c: Contact) {
    const journal = this.journalDe(c.id)
    for (const accepte of journal.filter((e) => e.type === 'rdv_accepte')) {
      const dateRdv = (accepte.details.date_rdv as string | undefined) ?? ajouterJours(accepte.date, 2)
      const realise = this.premierApres(c.id, ['rdv_realise'], accepte.date)
      const manque = this.premierApres(c.id, ['rdv_non_honore'], accepte.date)
      this.tache({
        regle: 'R09',
        cle: `R09:${accepte.id}`,
        titre: 'Mener la découverte (20 à 30 minutes)',
        process: '03',
        declenchement: accepte.date,
        echeance: this.h(dateRdv, '10:00'),
        responsable_id: 'solveig',
        contact_id: c.id,
        action_id: 'rdv_realise',
        faite: this.realisee(realise),
        annulee: manque && (!realise || manque.date < realise.date) ? { date: manque.date, motif: 'Rendez-vous non honoré' } : null,
      })
    }

    for (const accord of journal.filter((e) => e.type === 'accord_devis')) {
      const envoi = journal.find((e) => e.type === 'devis_envoye' && e.date >= accord.date)
      this.tache({
        regle: 'R10',
        cle: `R10:${accord.id}`,
        titre: 'Envoyer le devis personnalisé',
        process: '03',
        declenchement: accord.date,
        echeance: plusMinutes(this.h(ajouterJours(accord.date, 1), accord.date.slice(11, 16) || '10:00'), 0),
        responsable_id: 'solveig',
        contact_id: c.id,
        message_code: 'M06',
        action_id: 'devis',
        faite: this.realisee(envoi),
      })
    }

    for (const devis of this.base.devis.filter((d) => d.contact_id === c.id && this.passe(d.date_envoi))) {
      this.reglesDevis(c, devis)
    }

    // R14 : demande sur un départ complet, proposer la liste d'attente ou un autre départ.
    for (const demande of journal.filter((e) => TYPES_DEMANDE.includes(e.type) && e.details.depart_id)) {
      const depart = this.depart(demande.details.depart_id as string)
      if (!depart || placesRestantes(depart, this.base.reservations, jour(demande.date), c.id) > 0) continue
      this.tache({
        regle: 'R14',
        cle: `R14:${demande.id}`,
        titre: `Proposer la liste d'attente ou un autre départ (${depart.offre} complet)`,
        process: '04',
        declenchement: demande.date,
        echeance: plusMinutes(demande.date, 60),
        responsable_id: 'solveig',
        contact_id: c.id,
        depart_id: depart.id,
        message_code: 'M09',
        action_id: 'liste_attente',
        faite: this.realisee(this.premierApres(c.id, ['liste_attente'], plusMinutes(demande.date, -1))),
      })
    }
  }

  /** Process 04 : relance du devis et fin de validité (R11, R12, R13). */
  private reglesDevis(c: Contact, devis: Devis) {
    const evenementDevis = this.journalDe(c.id).find((e) => e.type === 'devis_envoye' && e.details.depart_id === devis.depart_id && jour(e.date) === devis.date_envoi)
    const envoi = evenementDevis?.date ?? this.h(devis.date_envoi, '09:00')
    const reservation = (this.reservationsParContact.get(c.id) ?? [])
      .filter((r) => r.date_reservation >= devis.date_envoi && this.passe(r.date_reservation))
      .sort((a, b) => (a.date_reservation < b.date_reservation ? -1 : 1))[0]
    const dateReservation = reservation ? this.h(reservation.date_reservation, '12:00') : null
    const depart = this.depart(devis.depart_id)

    // R11 : appeler le prospect à J+3, jamais un simple e-mail.
    const relance = this.premierApres(c.id, ['relance_devis_aboutie'], envoi)
    this.tache({
      regle: 'R11',
      cle: `R11:${devis.id}`,
      titre: 'Appeler le prospect après le devis (jamais un simple e-mail)',
      process: '04',
      declenchement: envoi,
      echeance: this.h(ajouterJours(devis.date_envoi, 3), '10:00'),
      responsable_id: 'solveig',
      contact_id: c.id,
      depart_id: devis.depart_id,
      action_id: 'relance_devis_aboutie',
      faite: this.realisee(relance),
      annulee: dateReservation && (!relance || dateReservation < relance.date) ? { date: dateReservation, motif: 'Réservation enregistrée' } : null,
    })

    // R12 : relance automatique « places restantes » à J+7, seulement s'il reste 5 places ou moins.
    const j7 = ajouterJours(devis.date_envoi, 7)
    if (depart && (!reservation || reservation.date_reservation > j7) && placesRestantes(depart, this.base.reservations, j7, c.id) <= 5) {
      this.message('R12', `R12:${devis.id}`, 'M07', this.h(j7, '09:00'), { contact: c, devis, depart })
    }

    // R13 : devis expiré à J+30 sans réservation : dernier message, critère N5, statut Perdu.
    const expiration = this.h(ajouterJours(devis.date_envoi, 30), '07:00')
    if (devis.statut === 'envoye' && (!reservation || reservation.date_reservation > jour(expiration))) {
      this.message('R13', `R13:${devis.id}:message`, 'M08', expiration, { contact: c, devis, depart })
      this.evenements.push({
        regle: 'R13',
        cle: `R13:${devis.id}`,
        contact: c,
        date: expiration,
        type: 'devis_expire',
        process: '04',
        details: { message: 'M08', depart_id: devis.depart_id },
        autres: [modifier('devis', devis.id, { statut: 'expire' })],
      })
      const statut = this.statutA(c.id, ajouterJours(expiration, -1))
      if (statut === 'devis_envoye' || statut === 'prospect') {
        this.evenements.push({
          regle: 'R13',
          cle: `R13:${devis.id}:statut`,
          contact: c,
          date: plusMinutes(expiration, 1),
          type: 'statut',
          process: '04',
          vers: 'perdu',
          details: { motif: 'Devis expiré sans réponse' },
        })
      }
    }
  }

  /** Process 05 à 12 pour chaque réservation d'un client. */
  private reglesReservations(c: Contact) {
    for (const r of this.reservationsParContact.get(c.id) ?? []) {
      if (!this.passe(r.date_reservation)) continue
      const depart = this.depart(r.depart_id)
      if (!depart) continue
      const evenementReservation = this.journalDe(c.id).find((e) => e.type === 'reservation' && jour(e.date) === r.date_reservation)
      const reserveLe = evenementReservation?.date ?? this.h(r.date_reservation, '12:00')
      const annuleeLe = r.statut === 'annulee' && r.annulation_date ? this.h(r.annulation_date, '12:00') : null
      const siAnnulee = this.annulation(annuleeLe, 'Voyage annulé')
      const actifLe = (date: DateISO) => reservationActive(r, date)
      const referente = c.referente_id
      const commun = { contact_id: c.id, depart_id: depart.id, reservation_id: r.id }
      const J = (n: number) => ajouterJours(depart.date_depart, n)

      // R15 : mail de confirmation le jour même (automatique).
      this.message('R15', `R15:${r.id}`, 'M10', plusMinutes(reserveLe, 5), { contact: c, reservation: r, depart })

      // R16 : remplir la fiche de passation le jour même.
      const fiche = this.fiches.get(r.id)
      this.tache({
        ...commun,
        regle: 'R16',
        cle: `R16:${r.id}`,
        titre: 'Remplir la fiche de passation (attentes, craintes, contraintes, détails personnels)',
        process: '05',
        declenchement: reserveLe,
        echeance: this.h(r.date_reservation, '18:00'),
        responsable_id: 'solveig',
        action_id: 'fiche_passation',
        faite: fiche?.remplie_le && this.passe(fiche.remplie_le) ? { date: this.h(fiche.remplie_le, '18:00'), par: 'solveig' } : null,
        annulee: siAnnulee,
      })

      // R17 et R61 : appel de bienvenue sous 48 h, seulement une fois la fiche de passation remplie.
      if (fiche?.remplie_le && this.passe(fiche.remplie_le)) {
        const parrain = c.parrain_id ? this.contacts.get(c.parrain_id) : undefined
        const appel = this.journalDe(c.id).find((e) => e.type === 'appel_bienvenue' && e.date >= reserveLe)
        this.tache({
          ...commun,
          regle: 'R17',
          cle: `R17:${r.id}`,
          titre: parrain
            ? `Appel de bienvenue (10 à 15 minutes) : mentionner le parrain (« ${parrain.prenom} m'a beaucoup parlé de vous »)`
            : 'Appel de bienvenue (10 à 15 minutes)',
          process: '05',
          declenchement: this.h(fiche.remplie_le, '18:00'),
          echeance: this.h(ajouterJours(fiche.remplie_le, 2), '18:00'),
          responsable_id: referente,
          action_id: 'appel_bienvenue',
          faite: r.appel_bienvenue_date && this.passe(r.appel_bienvenue_date) ? { date: appel?.date ?? this.h(r.appel_bienvenue_date, '11:00'), par: appel?.auteur_id ?? referente } : null,
          annulee: siAnnulee,
        })
      }

      // R18 : deux tentatives d'appel sans réponse, SMS de présentation.
      const tentatives = this.journalDe(c.id).filter(
        (e) => e.type === 'appel_sortant' && e.details.objet === 'Appel de bienvenue' && e.details.abouti === false && e.date >= reserveLe,
      )
      if (tentatives.length >= 2) {
        this.tache({
          ...commun,
          regle: 'R18',
          cle: `R18:${r.id}`,
          titre: 'Envoyer le SMS de présentation après deux appels sans réponse',
          process: '05',
          declenchement: tentatives[1].date,
          echeance: plusMinutes(tentatives[1].date, 60),
          responsable_id: referente,
          message_code: 'M11',
          annulee: r.appel_bienvenue_date && this.passe(r.appel_bienvenue_date) ? { date: this.h(r.appel_bienvenue_date, '11:00'), motif: 'Appel de bienvenue réalisé' } : siAnnulee,
        })
      }

      // R19 : ajouter au groupe WhatsApp du voyage et présenter, le lendemain de l'appel.
      if (r.appel_bienvenue_date && this.passe(r.appel_bienvenue_date)) {
        const ajout = this.journalDe(c.id).find((e) => e.type === 'ajout_groupe' && e.date >= reserveLe)
        this.tache({
          ...commun,
          regle: 'R19',
          cle: `R19:${r.id}`,
          titre: 'Ajouter au groupe WhatsApp du voyage et présenter au groupe',
          process: '05',
          declenchement: this.h(r.appel_bienvenue_date, '12:00'),
          echeance: this.h(ajouterJours(r.appel_bienvenue_date, 1), '10:00'),
          responsable_id: referente,
          message_code: 'M12',
          action_id: 'ajout_groupe',
          faite: r.ajout_groupe_date && this.passe(r.ajout_groupe_date) ? { date: ajout?.date ?? this.h(r.ajout_groupe_date, '10:00'), par: ajout?.auteur_id ?? referente } : null,
          annulee: siAnnulee,
        })
      }

      // Process 06 : solde de 70 % à J-60.
      const solde = this.journalDe(c.id).find((e) => e.type === 'solde' && e.date >= reserveLe)
      const soldeLe = r.solde_date && this.passe(r.solde_date) ? (solde?.date ?? this.h(r.solde_date, '10:00')) : null
      const totalite = r.solde_echeance === r.date_reservation
      // R20 : rappel automatique du solde et programme détaillé à J-70 (désactivable sur la fiche).
      const j70 = J(-70)
      if (r.rappel_solde_auto && !totalite && r.date_reservation <= j70 && actifLe(j70) && !(r.solde_date && r.solde_date <= j70)) {
        this.message('R20', `R20:${r.id}`, 'M13', this.h(j70, '09:00'), { contact: c, reservation: r, depart })
      }
      // R21 : encaisser le solde à l'échéance.
      this.tache({
        ...commun,
        regle: 'R21',
        cle: `R21:${r.id}`,
        titre: totalite ? 'Encaisser le solde (totalité exigible : départ à moins de 60 jours)' : 'Encaisser le solde de 70 %',
        process: '06',
        declenchement: reserveLe,
        echeance: this.h(r.solde_echeance, '09:00'),
        responsable_id: 'emilien',
        action_id: 'solde',
        faite: soldeLe ? { date: soldeLe, par: solde?.auteur_id ?? 'emilien' } : null,
        annulee: siAnnulee,
      })
      // R22 : mise en demeure à J-57 si le solde n'est pas réglé à l'échéance (critère M3).
      const enRetard = !r.solde_date || r.solde_date > r.solde_echeance
      if (enRetard && !totalite) {
        const miseEnDemeure = this.journalDe(c.id).find((e) => e.type === 'mise_en_demeure' && e.date >= reserveLe)
        this.tache({
          ...commun,
          regle: 'R22',
          cle: `R22:${r.id}`,
          titre: 'Mise en demeure sur support durable : solde non réglé (critère M3)',
          process: '06',
          declenchement: this.h(ajouterJours(r.solde_echeance, 1), '08:00'),
          echeance: this.h(ajouterJours(r.solde_echeance, 3), '09:00'),
          responsable_id: 'emilien',
          message_code: 'M14',
          action_id: 'mise_en_demeure',
          faite:
            r.mise_en_demeure_date && this.passe(r.mise_en_demeure_date)
              ? { date: miseEnDemeure?.date ?? this.h(r.mise_en_demeure_date, '10:00'), par: miseEnDemeure?.auteur_id ?? 'emilien' }
              : null,
          annulee: soldeLe && (!r.mise_en_demeure_date || r.solde_date! < r.mise_en_demeure_date) ? { date: soldeLe, motif: 'Solde encaissé' } : siAnnulee,
        })
      }
      // R23 : toujours pas de solde 7 jours après la mise en demeure, contrat résolu.
      if (r.mise_en_demeure_date && this.passe(r.mise_en_demeure_date)) {
        const limite = ajouterJours(r.mise_en_demeure_date, 7)
        if (!r.solde_date || r.solde_date > limite) {
          this.tache({
            ...commun,
            regle: 'R23',
            cle: `R23:${r.id}`,
            titre: 'Alerte : solde impayé 7 jours après la mise en demeure, contrat résolu, appliquer le barème d\'annulation',
            process: '06',
            declenchement: this.h(limite, '08:00'),
            echeance: this.h(limite, '12:00'),
            responsable_id: 'emilien',
            annulee: siAnnulee,
          })
        }
      }
      // R24 : client qui hésite sur ses dates, appeler avant la fin du report gratuit (J-31).
      if (r.hesite_dates) {
        this.tache({
          ...commun,
          regle: 'R24',
          cle: `R24:${r.id}`,
          titre: 'Appeler avant la fin du report gratuit (le client hésite sur ses dates)',
          process: '06',
          declenchement: reserveLe,
          echeance: this.h(J(-31), '10:00'),
          responsable_id: referente,
          annulee: siAnnulee,
        })
      }

      // Process 07 : Soli'apéro brise-glace.
      const j21 = J(-21)
      if (r.date_reservation <= j21 && actifLe(j21)) {
        // R25 : invitation automatique à J-21.
        this.message('R25', `R25:${r.id}`, 'M15', this.h(j21, '10:00'), { contact: c, reservation: r, depart })
      }
      const j18 = J(-18)
      if (r.date_reservation <= j18 && actifLe(j18) && !(r.brise_glace_confirme_le && r.brise_glace_confirme_le <= j18)) {
        // R26 : relance personnelle des clients qui n'ont pas confirmé leur présence.
        this.tache({
          ...commun,
          regle: 'R26',
          cle: `R26:${r.id}`,
          titre: 'Relance personnelle : présence au Soli\'apéro brise-glace',
          process: '07',
          declenchement: this.h(j18, '08:00'),
          echeance: this.h(j18, '17:00'),
          responsable_id: referente,
          message_code: 'M16',
          annulee: r.brise_glace_confirme_le ? { date: this.h(r.brise_glace_confirme_le, '12:00'), motif: 'Présence confirmée' } : siAnnulee,
        })
      }
      // R30 : absent au Soli'apéro, rappeler le client avant J-3.
      if (r.present_brise_glace === false && actifLe(J(-4))) {
        this.tache({
          ...commun,
          regle: 'R30',
          cle: `R30:${r.id}`,
          titre: 'Rappeler le client absent au Soli\'apéro brise-glace',
          process: '07',
          declenchement: plusMinutes(depart.soliapero_brise_glace, 180),
          echeance: this.h(J(-4), '10:00'),
          responsable_id: referente,
          annulee: siAnnulee,
        })
      }
      if (r.date_reservation <= J(-3) && actifLe(J(-3))) {
        // R31 : compte à rebours automatique, puis appel des clients qui ont exprimé une crainte.
        this.message('R31', `R31:${r.id}`, 'M18', this.h(J(-3), '09:00'), { contact: c, reservation: r, depart })
        const crainte = fiche?.craintes?.trim()
        if (crainte && crainte.toLowerCase() !== 'aucune') {
          this.tache({
            ...commun,
            regle: 'R31',
            cle: `R31:${r.id}:appel`,
            titre: `Appeler avant le départ : crainte exprimée « ${crainte} »`,
            process: '07',
            declenchement: this.h(J(-5), '09:00'),
            echeance: this.h(J(-3), '17:00'),
            responsable_id: referente,
          })
        }
      }
      if (r.date_reservation <= J(-1) && actifLe(J(-1))) {
        // R32 : message de veille de départ dans le groupe.
        this.message('R32', `R32:${r.id}`, 'M19', this.h(J(-1), '18:00'), { contact: c, reservation: r, depart })
      }

      // Process 09 : retour du voyage.
      if (!actifLe(depart.date_retour)) continue
      const retour = depart.date_retour
      // R35 : passage en Voyageur le jour du retour (Abonné s'il l'était déjà).
      const statutRetour = this.statutA(c.id, retour)
      if (this.passe(retour) && (statutRetour === 'reserve' || statutRetour === 'solde')) {
        this.evenements.push({
          regle: 'R35',
          cle: `R35:${r.id}`,
          contact: c,
          date: this.h(retour, '21:00'),
          type: 'statut',
          process: '09',
          vers: this.abonnementA(c.id, retour) ? 'abonne' : 'voyageur',
          details: {},
          autres: r.statut === 'voyagee' ? [] : [modifier('reservations', r.id, { statut: 'voyagee' })],
        })
      }
      // R36 : invitation automatique au Soli'apéro retour à R+2.
      this.message('R36', `R36:${r.id}`, 'M20', this.h(ajouterJours(retour, 2), '10:00'), { contact: c, reservation: r, depart })
      // R37 : relance personnelle à R+5 sans confirmation.
      const r5 = ajouterJours(retour, 5)
      if (!(r.retour_confirme_le && r.retour_confirme_le <= r5)) {
        this.tache({
          ...commun,
          regle: 'R37',
          cle: `R37:${r.id}`,
          titre: 'Relance personnelle : présence au Soli\'apéro retour',
          process: '09',
          declenchement: this.h(r5, '08:00'),
          echeance: this.h(r5, '17:00'),
          responsable_id: referente,
          message_code: 'M21',
          annulee: r.retour_confirme_le ? { date: this.h(r.retour_confirme_le, '12:00'), motif: 'Présence confirmée' } : null,
        })
      }

      // Process 10 à 12 : Soli'apéro retour, abonnement, satisfaction.
      const soiree = jour(depart.soliapero_retour)
      const apresSoiree = plusMinutes(depart.soliapero_retour, 180)
      // R41 : absent à la soirée, appeler, remettre l'album, proposer l'abonnement.
      if (r.present_retour === false) {
        this.tache({
          ...commun,
          regle: 'R41',
          cle: `R41:${r.id}`,
          titre: 'Appeler le client absent : remettre l\'album et proposer l\'abonnement',
          process: '10',
          declenchement: apresSoiree,
          echeance: this.h(ajouterJours(soiree, 7), '12:00'),
          responsable_id: referente,
        })
      }
      // R42 et R43 : pas de souscription, appel à R+3 puis dernier message à R+15.
      const abonnement = (this.abonnements.get(c.id) ?? []).find((a) => a.decision === 'abonne' && a.date_debut && a.date_debut >= r.date_reservation)
      const abonneLe = abonnement?.date_debut ? this.h(abonnement.date_debut, '19:45') : null
      const siAbonne = this.annulation(abonneLe, 'Le client s\'est abonné')
      this.tache({
        ...commun,
        regle: 'R42',
        cle: `R42:${r.id}`,
        titre: 'Appeler : écouter les freins à l\'abonnement et proposer une activité d\'essai',
        process: '11',
        declenchement: apresSoiree,
        echeance: this.h(ajouterJours(soiree, 3), '12:00'),
        responsable_id: referente,
        annulee: siAbonne,
      })
      this.tache({
        ...commun,
        regle: 'R43',
        cle: `R43:${r.id}`,
        titre: 'Dernier message sans insistance sur l\'abonnement (bascule vers le process 14)',
        process: '11',
        declenchement: this.h(ajouterJours(soiree, 3), '13:00'),
        echeance: this.h(ajouterJours(soiree, 15), '12:00'),
        responsable_id: referente,
        message_code: 'M23',
        annulee: siAbonne,
      })
      // R44 : enquête de satisfaction automatique à R+2 après la soirée.
      this.message('R44', `R44:${r.id}`, 'M24', this.h(ajouterJours(soiree, 2), '10:00'), { contact: c, reservation: r, depart })

      // R45, R46, R47 : suite donnée à la note de recommandation.
      for (const enquete of this.base.enquetes.filter((e) => e.reservation_id === r.id && e.nps !== null && this.passe(e.date))) {
        const repondu = this.journalDe(c.id).find((e) => e.type === 'enquete' && jour(e.date) === enquete.date)?.date ?? this.h(enquete.date, '12:00')
        const nps = enquete.nps as number
        if (nps >= 9) this.message('R45', `R45:${enquete.id}`, 'M25', plusMinutes(repondu, 5), { contact: c, reservation: r, depart, enquete })
        else if (nps >= 7) this.message('R46', `R46:${enquete.id}`, 'M26', plusMinutes(repondu, 5), { contact: c, reservation: r, depart, enquete })
        else {
          this.tache({
            ...commun,
            regle: 'R47',
            cle: `R47:${enquete.id}`,
            titre: `Appeler le client (note de ${nps}/10) et ouvrir une réclamation si le mécontentement est confirmé`,
            process: '12',
            declenchement: repondu,
            echeance: plusMinutes(this.h(ajouterJours(enquete.date, 2), repondu.slice(11, 16) || '12:00'), 0),
            responsable_id: referente,
          })
        }
      }

      // R57 : voyageur non abonné, prise de nouvelles automatique à R+6 mois.
      const sixMois = ajouterMois(retour, 6)
      const nouvelleReservation = (this.reservationsParContact.get(c.id) ?? []).some((x) => x.date_reservation > retour && x.date_reservation <= sixMois)
      if (!this.abonnementA(c.id, sixMois) && !nouvelleReservation) {
        this.message('R57', `R57:${r.id}`, 'M33', this.h(sixMois, '10:00'), { contact: c, reservation: r, depart })
      }
      // R58 : mail flashback à la date anniversaire du départ.
      this.message('R58', `R58:${r.id}`, 'M34', this.h(ajouterMois(depart.date_depart, 12), '10:00'), { contact: c, reservation: r, depart })
    }
  }

  /** Process 13 et 14 : vie de l'abonné et suivi des non-abonnés (R48 à R56). */
  private reglesFidelite(c: Contact) {
    const presences = this.presences(c.id)
    for (const a of (this.abonnements.get(c.id) ?? []).filter((x) => x.decision === 'abonne' && x.date_debut && this.passe(x.date_debut))) {
      const debut = a.date_debut as DateISO
      const souscription = this.journalDe(c.id).find((e) => e.type === 'souscription' && jour(e.date) === debut)?.date ?? this.h(debut, '19:45')
      // R48 : bienvenue abonné (automatique) et ajout au canal WhatsApp de la cible.
      this.message('R48', `R48:${a.id}`, 'M27', plusMinutes(souscription, 5), { contact: c })
      this.tache({
        regle: 'R48',
        cle: `R48:${a.id}:canal`,
        titre: 'Ajouter l\'abonné au canal WhatsApp de sa cible',
        process: '13',
        declenchement: souscription,
        echeance: this.h(debut, '20:00') > souscription ? this.h(debut, '20:00') : plusMinutes(souscription, 30),
        responsable_id: c.referente_id,
        contact_id: c.id,
      })
      // R49 : invitation à la première activité à J+7.
      const j7 = ajouterJours(debut, 7)
      const prochaine = this.base.activites
        .filter((x) => x.cible === c.cible && numeroJour(x.date) >= numeroJour(j7))
        .sort((x, y) => (x.date < y.date ? -1 : 1))[0]
      const dejaVenu = presences.find((p) => p.date >= debut)
      this.tache({
        regle: 'R49',
        cle: `R49:${a.id}`,
        titre: prochaine ? `Inviter à la première activité : ${prochaine.titre} le ${formatDate(prochaine.date)}` : 'Inviter à la première activité',
        process: '13',
        declenchement: souscription,
        echeance: this.h(j7, '10:00'),
        responsable_id: c.referente_id,
        contact_id: c.id,
        activite_id: prochaine?.id ?? null,
        message_code: 'M28',
        annulee: dejaVenu && dejaVenu.date < j7 ? { date: this.h(dejaVenu.date, dejaVenu.heure), motif: 'Déjà venu à une activité' } : null,
      })
      // R50 : message de suivi deux jours après la première activité.
      if (dejaVenu) {
        this.tache({
          regle: 'R50',
          cle: `R50:${a.id}`,
          titre: `Message de suivi après la première activité (${dejaVenu.titre})`,
          process: '13',
          declenchement: plusMinutes(this.h(dejaVenu.date, dejaVenu.heure), 120),
          echeance: this.h(ajouterJours(dejaVenu.date, 2), '10:00'),
          responsable_id: c.referente_id,
          contact_id: c.id,
          activite_id: dejaVenu.activiteId,
          message_code: 'M29',
        })
      }
      // R51 : message d'anniversaire (abonnés).
      if (c.date_naissance) {
        for (const annee of [Number(this.ref.slice(0, 4)) - 1, Number(this.ref.slice(0, 4))]) {
          const anniversaire = `${annee}${c.date_naissance.slice(4)}`
          if (anniversaire < debut || !this.abonnementA(c.id, anniversaire)) continue
          this.tache({
            regle: 'R51',
            cle: `R51:${c.id}:${annee}`,
            titre: 'Souhaiter l\'anniversaire et prévoir une attention à la prochaine activité',
            process: '13',
            declenchement: this.h(ajouterJours(anniversaire, -2), '09:00'),
            echeance: this.h(anniversaire, '09:00'),
            responsable_id: c.referente_id,
            contact_id: c.id,
            message_code: 'M30',
          })
        }
      }
      // R52 : enquête annuelle de l'abonnement.
      if (this.abonnementA(c.id, ajouterMois(debut, 12))) {
        this.message('R52', `R52:${a.id}`, 'M31', this.h(ajouterMois(debut, 12), '10:00'), { contact: c })
      }
      // R54 et R55 : abonné sans activité depuis 30 puis 60 jours.
      const reperes = [debut, ...presences.filter((p) => p.date >= debut).map((p) => p.date)]
      reperes.forEach((depuis, i) => {
        const suivante = reperes[i + 1]
        for (const [regle, jours, titre] of [
          ['R54', 30, 'Abonné sans activité depuis 30 jours : prendre des nouvelles et proposer une activité'],
          ['R55', 60, 'Abonné sans activité depuis 60 jours : prendre des nouvelles sans parler d\'abonnement (critère M4)'],
        ] as const) {
          const alerte = ajouterJours(depuis, jours)
          if (suivante && suivante <= alerte) continue
          if (!this.abonnementA(c.id, alerte)) continue
          this.tache({
            regle,
            cle: `${regle}:${c.id}:${depuis}`,
            titre,
            process: '13',
            declenchement: this.h(alerte, '08:00'),
            echeance: this.h(alerte, '17:00'),
            responsable_id: c.referente_id,
            contact_id: c.id,
            annulee: suivante ? { date: this.h(suivante, '12:00'), motif: 'Nouvelle participation' } : null,
          })
        }
      })
    }

    // R56 : voyageur non abonné venu à un événement ouvert à tous, reproposer l'abonnement.
    const voyages = (this.reservationsParContact.get(c.id) ?? []).filter((r) => r.statut !== 'annulee')
    for (const p of presences.filter((x) => x.ouverte)) {
      const aVoyage = voyages.some((r) => (this.depart(r.depart_id)?.date_retour ?? '9999') < p.date)
      if (!aVoyage || this.abonnementA(c.id, p.date)) continue
      const abonne = (this.abonnements.get(c.id) ?? []).find((a) => a.decision === 'abonne' && a.date_debut && a.date_debut > p.date)
      this.tache({
        regle: 'R56',
        cle: `R56:${p.participation.id}`,
        titre: `Reproposer l'abonnement à chaud (venu à « ${p.titre} »)`,
        process: '14',
        declenchement: plusMinutes(this.h(p.date, p.heure), 180),
        echeance: this.h(ajouterJours(p.date, 2), '10:00'),
        responsable_id: c.referente_id,
        contact_id: c.id,
        activite_id: p.activiteId,
        annulee: abonne?.date_debut ? { date: this.h(abonne.date_debut, '12:00'), motif: 'Le client s\'est abonné' } : null,
      })
    }

    // R59 : code parrain unique pour une note de 9 ou 10 ou un nouvel abonné.
    const merite =
      this.base.enquetes.some((e) => e.contact_id === c.id && (e.nps ?? 0) >= 9 && this.passe(e.date)) ||
      (this.abonnements.get(c.id) ?? []).some((a) => a.decision === 'abonne' && this.passe(a.date_debut))
    if (merite && !c.code_parrain) {
      const codes = new Set(this.base.contacts.map((x) => x.code_parrain).filter((x): x is string => Boolean(x)))
      this.autresChangements.push(modifier('contacts', c.id, { code_parrain: nouveauCodeParrain(c.prenom, codes, this.options.tirage) }))
    }
  }

  /** Tâches de chaque départ (process 07 à 10) : R27, R28, R29, R33, R34, R38, R39, R40. */
  private reglesDeparts() {
    for (const depart of this.base.departs) {
      const J = (n: number) => ajouterJours(depart.date_depart, n)
      const referente = referentePourCible(depart.cible)
      const commun = { depart_id: depart.id }
      const brise = depart.soliapero_brise_glace
      const voyageursBrise = this.voyageursDu(depart.id, jour(brise))
      if (voyageursBrise.length > 0) {
        this.tache({
          ...commun,
          regle: 'R27',
          cle: `R27:${depart.id}`,
          titre: `Préparer le Soli'apéro brise-glace de ${depart.offre} (badges, jeu, carnets, goodies)`,
          process: '07',
          declenchement: this.h(J(-21), '09:00'),
          echeance: this.h(J(-16), '17:00'),
          responsable_id: referente,
        })
        const saisis = voyageursBrise.every((r) => r.present_brise_glace !== null)
        this.tache({
          ...commun,
          regle: 'R28',
          cle: `R28:${depart.id}`,
          titre: `Animer le Soli'apéro brise-glace de ${depart.offre} et saisir présences, binômes et droit à l'image`,
          process: '07',
          declenchement: this.h(J(-16), '09:00'),
          echeance: brise,
          responsable_id: referente,
          faite: saisis && this.passe(brise) ? { date: plusMinutes(brise, 150), par: referente } : null,
        })
        this.tache({
          ...commun,
          regle: 'R29',
          cle: `R29:${depart.id}`,
          titre: `Poster la photo de groupe de ${depart.offre} : « La tribu est née ! »`,
          process: '07',
          declenchement: plusMinutes(brise, 180),
          echeance: this.h(J(-14), '12:00'),
          responsable_id: referente,
          message_code: 'M17',
        })
      }

      const voyageurs = this.voyageursDu(depart.id, depart.date_depart)
      if (voyageurs.length === 0) continue
      const miSejour = ajouterJours(depart.date_depart, Math.floor(ecartJours(depart.date_depart, depart.date_retour) / 2))
      // R33 et R34 : accompagnement du séjour par l'animatrice.
      this.tache({
        ...commun,
        regle: 'R33',
        cle: `R33:${depart.id}`,
        titre: `Point individuel de 5 minutes avec chaque voyageur de ${depart.offre}`,
        process: '08',
        declenchement: this.h(depart.date_depart, '08:00'),
        echeance: this.h(miSejour, '12:00'),
        responsable_id: depart.animatrice_id,
      })
      const notes = voyageurs.every((r) => r.note_chaud !== null)
      this.tache({
        ...commun,
        regle: 'R34',
        cle: `R34:${depart.id}`,
        titre: `Saisir la satisfaction à chaud de chaque voyageur de ${depart.offre}`,
        process: '08',
        declenchement: this.h(miSejour, '12:00'),
        echeance: this.h(depart.date_retour, '20:00'),
        responsable_id: depart.animatrice_id,
        faite: notes && this.passe(depart.date_retour) ? { date: this.h(depart.date_retour, '21:00'), par: depart.animatrice_id } : null,
      })

      // R38, R39, R40 : préparation et suites du Soli'apéro retour.
      const r5 = ajouterJours(depart.date_retour, 5)
      this.tache({
        ...commun,
        regle: 'R38',
        cle: `R38:${depart.id}:referente`,
        titre: `Préparer la soirée retour de ${depart.offre} : album photo, diaporama, fiche de chaque participant`,
        process: '09',
        declenchement: this.h(ajouterJours(depart.date_retour, 1), '09:00'),
        echeance: this.h(r5, '17:00'),
        responsable_id: referente,
      })
      this.tache({
        ...commun,
        regle: 'R38',
        cle: `R38:${depart.id}:florentine`,
        titre: `Préparer la soirée retour de ${depart.offre} : programme des activités du mois`,
        process: '09',
        declenchement: this.h(ajouterJours(depart.date_retour, 1), '09:00'),
        echeance: this.h(r5, '17:00'),
        responsable_id: 'florentine',
      })
      const retour = depart.soliapero_retour
      const presencesSaisies = voyageurs.every((r) => r.present_retour !== null)
      this.tache({
        ...commun,
        regle: 'R39',
        cle: `R39:${depart.id}`,
        titre: `Soli'apéro retour de ${depart.offre} : saisir présences, album remis et décisions sur l'abonnement`,
        process: '10',
        declenchement: this.h(r5, '09:00'),
        echeance: retour,
        responsable_id: referente,
        faite: presencesSaisies && this.passe(retour) ? { date: plusMinutes(retour, 150), par: referente } : null,
      })
      if (voyageurs.some((r) => r.present_retour === true)) {
        this.tache({
          ...commun,
          regle: 'R40',
          cle: `R40:${depart.id}`,
          titre: `Mail de remerciement avec photos aux présents du Soli'apéro retour de ${depart.offre}`,
          process: '10',
          declenchement: plusMinutes(retour, 180),
          echeance: this.h(ajouterJours(retour, 1), '12:00'),
          responsable_id: referente,
          message_code: 'M22',
        })
      }
    }
  }

  /** R53 : newsletter mensuelle, le 1er de chaque mois, à tous les consentants. */
  private reglesNewsletter() {
    for (let mois = this.debut.slice(0, 7) + '-01'; mois <= this.ref; mois = ajouterMois(mois, 1)) {
      if (mois < this.debut) continue
      for (const c of this.base.contacts) {
        if (!estPasse(c.date_creation, ajouterJours(mois, -1))) continue
        const dernier = this.base.consentements
          .filter((x) => x.contact_id === c.id && x.type === 'newsletter' && estPasse(x.date, ajouterJours(mois, -1)))
          .sort((a, b) => (a.date < b.date ? -1 : 1))
          .pop()
        if (dernier?.valeur) this.message('R53', `R53:${c.id}:${mois.slice(0, 7)}`, 'M32', this.h(mois, '10:00'), { contact: c })
      }
    }
  }

  /** R60 : acompte d'un filleul encaissé, remercier le parrain (récompense et badge Ambassadeur). */
  private reglesParrainage() {
    for (const p of this.base.parrainages) {
      const parrain = this.contacts.get(p.parrain_id)
      const filleul = this.contacts.get(p.filleul_id)
      const reservation = (this.reservationsParContact.get(p.filleul_id) ?? [])
        .filter((r) => this.passe(r.acompte_date))
        .sort((a, b) => (a.acompte_date < b.acompte_date ? -1 : 1))[0]
      if (!parrain || !filleul || !reservation) continue
      this.tache({
        regle: 'R60',
        cle: `R60:${p.id}`,
        titre: `Remercier le parrain : ${filleul.prenom} ${filleul.nom} a réservé (récompense et badge Ambassadeur)`,
        process: '15',
        declenchement: this.h(reservation.acompte_date, '12:30'),
        echeance: this.h(reservation.acompte_date, '18:00'),
        responsable_id: parrain.referente_id,
        contact_id: parrain.id,
        reservation_id: reservation.id,
        message_code: 'M35',
      })
    }
  }

  // -------------------------------------------------------------------------
  // Différence entre ce qui est voulu et ce qui existe déjà
  // -------------------------------------------------------------------------

  changements(): Changement[] {
    const resultat: Changement[] = [...this.autresChangements]
    const existantes = new Map(this.base.taches.map((t) => [t.cle_unicite, t]))
    const messagesTraces = new Set(this.base.messages_envoyes.map((m) => m.cle_unicite).filter(Boolean))
    const evenementsTraces = new Set(this.base.evenements.map((e) => e.details.cle_unicite).filter(Boolean))
    const dansLaFenetre = (date: string) => this.passe(date) && jour(date) >= this.debut

    for (const t of this.taches) {
      if (!this.passe(t.declenchement) || jour(t.echeance) < this.debut) continue
      const faite = t.faite && this.passe(t.faite.date) ? t.faite : null
      const annulee = !faite && t.annulee && this.passe(t.annulee.date) ? t.annulee : null
      const existante = existantes.get(t.cle)
      if (!existante) {
        // Une tâche annulée avant même d'apparaître n'est pas créée.
        if (annulee && annulee.date <= t.declenchement) continue
        const tache: Tache = {
          id: this.options.nouvelId(),
          contact_id: t.contact_id ?? null,
          depart_id: t.depart_id ?? null,
          activite_id: t.activite_id ?? null,
          reservation_id: t.reservation_id ?? null,
          regle_id: t.regle,
          cle_unicite: t.cle,
          titre: t.titre,
          process: t.process,
          date_declenchement: t.declenchement,
          echeance: t.echeance,
          responsable_id: t.responsable_id,
          statut: faite ? 'fait' : annulee ? 'annulee' : 'a_faire',
          message_code: t.message_code ?? null,
          action_id: t.action_id ?? null,
          fait_le: faite?.date ?? null,
          fait_par: faite?.par ?? null,
          annulee_le: annulee?.date ?? null,
          motif_annulation: annulee?.motif ?? null,
        }
        resultat.push(inserer('taches', tache))
      } else if (existante.statut === 'a_faire' && !existante.fait_le) {
        if (faite) resultat.push(modifier('taches', existante.id, { statut: 'fait', fait_le: faite.date, fait_par: faite.par }))
        else if (annulee && !existante.annulee_le) {
          resultat.push(modifier('taches', existante.id, { statut: 'annulee', annulee_le: annulee.date, motif_annulation: annulee.motif }))
        }
      }
    }

    for (const m of this.messages) {
      if (!dansLaFenetre(m.date) || messagesTraces.has(m.cle)) continue
      messagesTraces.add(m.cle)
      resultat.push(
        inserer(
          'messages_envoyes',
          messageEnvoye({ base: this.base, date: m.date, ...m.contexte }, m.code, { id: this.options.nouvelId(), regle_id: m.regle, cle_unicite: m.cle }),
        ),
      )
    }

    for (const e of this.evenements) {
      if (!this.passe(e.date) || evenementsTraces.has(e.cle)) continue
      // Les inscriptions à la newsletter suivent la fenêtre ; les changements de statut s'appliquent toujours.
      if (e.type === 'inscription_newsletter' && jour(e.date) < this.debut) continue
      evenementsTraces.add(e.cle)
      const details = { ...e.details, cle_unicite: e.cle, ...(e.vers ? { de: this.statutA(e.contact.id, ajouterJours(e.date, -1)), vers: e.vers } : {}) }
      resultat.push(inserer('evenements', nouvelEvenement(e.contact.id, e.date, e.type, { id: this.options.nouvelId(), process: e.process, canal: 'crm', details })))
      if (e.vers) {
        // Le statut enregistré suit le changement le plus récent du journal.
        const dernier = (this.journal.get(e.contact.id) ?? []).filter((x) => x.type === 'statut').pop()
        if (!dernier || dernier.date <= e.date) {
          resultat.push(modifier('contacts', e.contact.id, { statut: e.vers, ...(e.vers === 'perdu' ? { motif_perte: e.details.motif as string } : {}) }))
        }
      }
      resultat.push(...(e.autres ?? []))
    }
    return resultat
  }
}

/**
 * Exécute les règles R01 à R61 à la date de référence et renvoie les changements à enregistrer.
 * Idempotent : appliquer les changements puis relancer le moteur ne renvoie plus rien.
 */
export function runAutomations(base: Base, dateReference: DateISO, options: OptionsMoteur): Changement[] {
  const moteur = new Moteur(base, dateReference, options)
  moteur.executerRegles()
  return moteur.changements()
}

/** Ce que le moteur vient de faire, en clair (affiché après un changement de date). */
export function resumerAutomatismes(changements: Changement[]): string | null {
  let taches = 0
  let messages = 0
  let statuts = 0
  for (const c of changements) {
    if (c.op === 'inserer' && c.table === 'taches' && (c.ligne as Tache).statut === 'a_faire') taches++
    if (c.op === 'inserer' && c.table === 'messages_envoyes') messages++
    if (c.op === 'inserer' && c.table === 'evenements' && (c.ligne as Evenement).type === 'statut') statuts++
  }
  const parties = [
    taches > 0 ? `${taches} tâche${taches > 1 ? 's' : ''} créée${taches > 1 ? 's' : ''}` : null,
    messages > 0 ? `${messages} message${messages > 1 ? 's' : ''} automatique${messages > 1 ? 's' : ''} (simulé${messages > 1 ? 's' : ''})` : null,
    statuts > 0 ? `${statuts} changement${statuts > 1 ? 's' : ''} de statut` : null,
  ].filter(Boolean)
  return parties.length > 0 ? `Automatismes : ${parties.join(', ')}.` : null
}

/** Les règles du moteur, pour l'affichage (écran Tâches, filtre par process). */
export const REGLES: RegleAutomatisme[] = [
  ['R01', '01', 'Message de bienvenue (automatique)'],
  ['R02', '01', 'Inscription à la newsletter'],
  ['R03', '01', 'Invitation personnelle à un départ'],
  ['R04', '02', 'Accusé de réception d\'un formulaire'],
  ['R05', '02', 'Réponse personnelle sous 24 h ouvrées'],
  ['R06', '02', 'Première relance (J+3)'],
  ['R07', '02', 'Deuxième relance (J+7)'],
  ['R08', '02', 'Passage en Perdu à J+14'],
  ['R09', '03', 'Mener la découverte'],
  ['R10', '03', 'Envoyer le devis'],
  ['R11', '04', 'Appel de relance du devis (J+3)'],
  ['R12', '04', 'Relance places restantes (J+7)'],
  ['R13', '04', 'Devis expiré (J+30)'],
  ['R14', '04', 'Départ complet : liste d\'attente'],
  ['R15', '05', 'Mail de confirmation'],
  ['R16', '05', 'Fiche de passation'],
  ['R17', '05', 'Appel de bienvenue sous 48 h'],
  ['R18', '05', 'SMS de présentation'],
  ['R19', '05', 'Ajout au groupe WhatsApp du voyage'],
  ['R20', '06', 'Rappel du solde (J-70)'],
  ['R21', '06', 'Encaissement du solde (J-60)'],
  ['R22', '06', 'Mise en demeure (J-57)'],
  ['R23', '06', 'Contrat résolu (J-50)'],
  ['R24', '06', 'Client qui hésite sur ses dates (J-31)'],
  ['R25', '07', 'Invitation au Soli\'apéro brise-glace (J-21)'],
  ['R26', '07', 'Relance de l\'invitation (J-18)'],
  ['R27', '07', 'Préparer le Soli\'apéro (J-16)'],
  ['R28', '07', 'Animer le Soli\'apéro (J-15)'],
  ['R29', '07', 'Photo de groupe (J-14)'],
  ['R30', '07', 'Rappeler un absent (J-4)'],
  ['R31', '07', 'Compte à rebours et appel des craintes (J-3)'],
  ['R32', '07', 'Veille du départ (J-1)'],
  ['R33', '08', 'Point mi-séjour'],
  ['R34', '08', 'Satisfaction à chaud'],
  ['R35', '09', 'Passage en Voyageur'],
  ['R36', '09', 'Invitation au Soli\'apéro retour (R+2)'],
  ['R37', '09', 'Relance de l\'invitation (R+5)'],
  ['R38', '09', 'Préparer la soirée retour (R+5)'],
  ['R39', '10', 'Soli\'apéro retour : présences et album'],
  ['R40', '10', 'Mail de remerciement'],
  ['R41', '10', 'Appeler un absent à la soirée'],
  ['R42', '11', 'Appel sur l\'abonnement (soirée + 3 jours)'],
  ['R43', '11', 'Dernier message sur l\'abonnement (soirée + 15 jours)'],
  ['R44', '12', 'Enquête de satisfaction'],
  ['R45', '12', 'Avis Google et code parrain (9 ou 10)'],
  ['R46', '12', 'Remerciement (7 ou 8)'],
  ['R47', '12', 'Appel après une note de 6 ou moins'],
  ['R48', '13', 'Bienvenue abonné et canal WhatsApp'],
  ['R49', '13', 'Invitation à la première activité'],
  ['R50', '13', 'Suivi après la première activité'],
  ['R51', '13', 'Anniversaire'],
  ['R52', '13', 'Enquête annuelle de l\'abonnement'],
  ['R53', '13', 'Newsletter mensuelle'],
  ['R54', '13', 'Abonné sans activité depuis 30 jours'],
  ['R55', '13', 'Abonné sans activité depuis 60 jours'],
  ['R56', '14', 'Reproposer l\'abonnement après un événement'],
  ['R57', '14', 'Prise de nouvelles à 6 mois'],
  ['R58', '14', 'Flashback, anniversaire du voyage'],
  ['R59', '15', 'Code parrain'],
  ['R60', '15', 'Remerciement du parrain'],
  ['R61', '15', 'Mention du parrain à l\'appel de bienvenue'],
].map(([id, process, libelle]) => ({ id, process, libelle }))


