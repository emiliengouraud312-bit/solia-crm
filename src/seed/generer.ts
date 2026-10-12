// Génération du jeu de démonstration (docs/03-donnees-fictives.md).
// Déterministe : la graine est fixe, relancé, le script redonne exactement les mêmes données.
// Toutes les personnes sont fictives. Tout est cohérent à la date de démo (30/11/2026) :
// rien n'est daté après, sauf ce qui est planifié (départs, activités, échéances, inscriptions).
import { critereDeLEvenement } from '../domain/criteres'
import { ajouterJours, ecartJours, jour, jourSemaine, numeroJour } from '../domain/dates'
import { runAutomations } from '../domain/automations'
import { DATE_DEMO, referentePourCible } from '../domain/referentiel'
import { terminerTache } from '../domain/taches'
import { appliquerChangements } from '../store/DataStore'
import type {
  Abonnement,
  Base,
  Canal,
  CanalPrefere,
  Cible,
  Contact,
  DateISO,
  Depart,
  Evenement,
  Horodatage,
  MoyenPaiement,
  Origine,
  Reservation,
  Statut,
  TypeConsentement,
  TypeEvenement,
} from '../domain/types'
import { Aleatoire } from './aleatoire'
import { baseReferentiel } from './baseReferentiel'
import * as L from './listes'

const REF = DATE_DEMO
const GRAINE = 20261130

/** Voyageurs par départ passé : remplissage de 60 à 85 %, 117 voyageurs au total. */
const VOYAGEURS_PASSES: Record<string, number> = {
  'irlande-2026-09': 15,
  'basque-2026-09': 11,
  'cyclades-2026-09': 12,
  'perigord-2026-10': 16,
  'paris-2026-10': 12,
  'hossegor-2026-10': 13,
  'malte-2026-11': 14,
  'lisbonne-2026-11': 11,
  'barcelone-2026-11': 13,
}

/**
 * Réservations actives par départ à venir (89 au total) : décembre 60 à 85 % (Paris complet),
 * janvier 35 à 60 %, février 20 à 40 %, mars et avril 5 à 20 %, ensuite 0 à 10 %.
 * Les cas particuliers (filleuls, réachats, report, solde en retard) sont compris dans ces nombres.
 */
const RESERVATIONS_FUTURES: Record<string, number> = {
  'barcelone-2026-12': 12,
  'malte-2026-12': 13,
  'paris-2026-12': 16,
  'malte-2027-01': 8,
  'lisbonne-2027-01': 7,
  'barcelone-2027-01': 7,
  'malte-2027-02': 5,
  'paris-2027-02': 4,
  'barcelone-2027-02': 4,
  'perigord-2027-03': 2,
  'lisbonne-2027-03': 2,
  'barcelone-2027-03': 2,
  'perigord-2027-04': 1,
  'paris-2027-04': 1,
  'hossegor-2027-04': 1,
  'irlande-2027-05': 1,
  'basque-2027-05': 1,
  'hossegor-2027-05': 1,
  'irlande-2027-06': 1,
}

const FORMULE_ABONNEMENT = '29 € par mois'

/**
 * Tâches laissées en retard au 30/11/2026 pour la démonstration (la plus ancienne de chaque règle) :
 * relance de Sarah et appel après devis (Solveig), appel de bienvenue et note de 4/10 (Jezabel),
 * abonnés inactifs (Lilou, Solveig), préparation de la soirée retour de Lisbonne (Florentine).
 */
const TACHES_EN_RETARD = ['R06', 'R11', 'R17', 'R47', 'R54', 'R55', 'R38']

interface Identite {
  prenom: string
  nom: string
  femme: boolean
  dateNaissance: DateISO
  ville: string
}

interface OptionsContact {
  cible: Cible
  date: Horodatage
  identite?: Identite
  origine?: Origine
  parrain?: Contact
  envie?: string | null
  newsletter?: boolean
  whatsapp?: boolean
  canal?: CanalPrefere
  /** Coordonnée vérifiée dès la création (sinon au premier échange, ou jamais). */
  verifieeACreation?: boolean
}

/** Réglages imposés pour un voyageur particulier (personas et cas de démo). */
interface Scenario {
  appelDelai?: number
  messageGroupe?: boolean
  soldeAvantEcheance?: number
  soldeEnRetard?: boolean
  presentBriseGlace?: boolean
  noteChaud?: number
  incident?: boolean
  partage?: boolean
  presentRetour?: boolean
  nps?: number
  avis?: boolean
}

class Generateur {
  readonly base: Base = baseReferentiel()
  private readonly r = new Aleatoire(GRAINE)
  /** Tirages ajoutés en phase 3 (confirmations, automatismes) : n'altèrent pas les données déjà générées. */
  private readonly r3 = new Aleatoire(GRAINE + 3)
  private readonly nomsPris = new Set<string>()
  private readonly emails = new Set<string>()
  private readonly telephones = new Set<string>()
  private readonly codes = new Set<string>()
  /** Voyageurs par départ (contact et réservation), dans l'ordre de création. */
  private readonly voyageurs = new Map<string, { contact: Contact; reservation: Reservation }[]>()
  private readonly personas: Record<string, Contact> = {}
  private recommandations = 0

  // -------------------------------------------------------------------------
  // Outils
  // -------------------------------------------------------------------------

  private depart(id: string): Depart {
    const depart = this.base.departs.find((d) => d.id === id)
    if (!depart) throw new Error(`Départ inconnu : ${id}`)
    return depart
  }

  private heure(debut = 9, fin = 18): string {
    const h = this.r.entier(debut, fin - 1)
    return `${String(h).padStart(2, '0')}:${this.r.choix(['00', '15', '30', '45'])}`
  }

  private h(date: DateISO, debut = 9, fin = 18): Horodatage {
    return `${date}T${this.heure(debut, fin)}`
  }

  /** Horodatage décalé de quelques minutes (pour garder l'ordre des événements d'une même journée). */
  private plusTard(horodatage: Horodatage, minutes: number): Horodatage {
    const [date, heure] = horodatage.split('T')
    const [h, m] = heure.split(':').map(Number)
    const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59)
    return `${date}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  /** Un rendez-vous fixé un dimanche glisse au lundi suivant. */
  private ouvreApres(date: DateISO): DateISO {
    return jourSemaine(date) === 0 ? ajouterJours(date, 1) : date
  }

  /** L'agence est fermée le dimanche : un rendez-vous du dimanche glisse au samedi. */
  private ouvre(date: DateISO): DateISO {
    return jourSemaine(date) === 0 ? ajouterJours(date, -1) : date
  }

  private avant(a: DateISO, b: DateISO): boolean {
    return numeroJour(a) < numeroJour(b)
  }

  private auPlusTard(date: DateISO, limite: DateISO = REF): DateISO {
    return numeroJour(date) > numeroJour(limite) ? limite : date
  }

  private passe(date: DateISO | Horodatage): boolean {
    return numeroJour(date) <= numeroJour(REF)
  }

  private ev(
    contact: Contact,
    date: Horodatage,
    type: TypeEvenement,
    options: { canal?: Canal | null; process?: string | null; auteur?: string | null; details?: Record<string, unknown> } = {},
  ): Evenement {
    const evenement: Evenement = {
      id: this.r.uuid(),
      contact_id: contact.id,
      date,
      type,
      code_critere: null,
      canal: options.canal ?? null,
      process: options.process ?? null,
      auteur_id: options.auteur ?? null,
      details: options.details ?? {},
      simule: false,
    }
    evenement.code_critere = critereDeLEvenement(evenement)
    this.base.evenements.push(evenement)
    return evenement
  }

  private changerStatut(
    contact: Contact,
    date: Horodatage,
    vers: Statut,
    options: { auteur?: string | null; motif?: string; process?: string } = {},
  ): void {
    if (contact.statut === vers) return
    this.ev(contact, date, 'statut', {
      process: options.process ?? '19',
      auteur: options.auteur ?? null,
      canal: 'crm',
      details: { de: contact.statut, vers, ...(options.motif ? { motif: options.motif } : {}) },
    })
    contact.statut = vers
    if (vers === 'perdu' && options.motif) contact.motif_perte = options.motif
  }

  private consentir(contact: Contact, type: TypeConsentement, valeur: boolean, date: Horodatage): void {
    this.base.consentements.push({ id: this.r.uuid(), contact_id: contact.id, type, valeur, date })
  }

  private sansAccents(texte: string): string {
    return texte.normalize('NFD').replace(/[̀-ͯ]/g, '')
  }

  private identite(cible: Cible): Identite {
    const listes = L.PRENOMS[cible]
    for (;;) {
      const femme = this.r.chance(listes.partFemmes)
      const prenom = this.r.choix(femme ? listes.femmes : listes.hommes)
      const nom = this.r.choix(L.NOMS)
      if (this.nomsPris.has(`${prenom} ${nom}`)) continue
      const [min, max] = L.AGES[cible]
      return { prenom, nom, femme, dateNaissance: this.dateNaissance(this.r.entier(min, max)), ville: this.r.pondere(L.VILLES) }
    }
  }

  /** Date de naissance donnant l'âge voulu au 30/11/2026. */
  private dateNaissance(age: number): DateISO {
    const mois = this.r.entier(1, 12)
    const jourDuMois = this.r.entier(1, 28)
    const annee = mois === 12 ? 2025 - age : 2026 - age
    return `${annee}-${String(mois).padStart(2, '0')}-${String(jourDuMois).padStart(2, '0')}`
  }

  private email(prenom: string, nom: string): string {
    const racine = `${this.sansAccents(prenom)}.${this.sansAccents(nom)}`.toLowerCase().replace(/[^a-z.]/g, '')
    let email = `${racine}@exemple.fr`
    for (let n = 2; this.emails.has(email); n++) email = `${racine}${n}@exemple.fr`
    this.emails.add(email)
    return email
  }

  private telephone(): string {
    for (;;) {
      const deux = () => String(this.r.entier(0, 99)).padStart(2, '0')
      const numero = `06 00 ${deux()} ${deux()} ${deux()}`
      if (!this.telephones.has(numero)) {
        this.telephones.add(numero)
        return numero
      }
    }
  }

  /** Code parrain unique (process 15) : généré pour une note de 9 ou 10 et pour chaque abonné. */
  private donnerCodeParrain(contact: Contact): void {
    if (contact.code_parrain) return
    const racine = this.sansAccents(contact.prenom).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)
    for (;;) {
      const code = `${racine}${this.r.entier(10, 99)}`
      if (!this.codes.has(code)) {
        this.codes.add(code)
        contact.code_parrain = code
        return
      }
    }
  }

  private canalCreation(origine: Origine): Canal {
    const canaux: Record<Origine, Canal> = {
      stand: 'stand',
      agence: 'agence',
      partenaire: 'telephone',
      flyer_qr: 'site',
      site: 'site',
      reseau_social: 'instagram',
      parrainage: 'telephone',
      appel_entrant: 'telephone',
    }
    return canaux[origine]
  }

  private auteurCreation(origine: Origine): string {
    return origine === 'site' || origine === 'flyer_qr' || origine === 'reseau_social' ? 'florentine' : 'solveig'
  }

  // -------------------------------------------------------------------------
  // Contacts
  // -------------------------------------------------------------------------

  private creerContact(options: OptionsContact): Contact {
    const { cible, date } = options
    const identite = options.identite ?? this.identite(cible)
    this.nomsPris.add(`${identite.prenom} ${identite.nom}`)
    const origine = options.parrain ? 'parrainage' : options.origine ?? this.r.pondere(L.ORIGINES[cible])
    const newsletter = options.newsletter ?? this.r.chance(cible === 'senior' ? 0.65 : 0.78)
    const whatsapp = options.whatsapp ?? this.r.chance(L.PART_WHATSAPP[cible])
    const canalPrefere =
      options.canal ??
      (cible === 'senior'
        ? this.r.pondere([['telephone', 55], ['email', 35], ['whatsapp', whatsapp ? 10 : 0]] as const)
        : whatsapp
          ? this.r.pondere([['whatsapp', 65], ['email', 30], ['sms', 5]] as const)
          : this.r.pondere([['email', 80], ['sms', 20]] as const))
    const contact: Contact = {
      id: this.r.uuid(),
      prenom: identite.prenom,
      nom: identite.nom,
      email: this.email(identite.prenom, identite.nom),
      telephone: this.telephone(),
      date_naissance: identite.dateNaissance,
      ville: identite.ville,
      cible,
      origine,
      origine_detail: options.parrain
        ? `Parrainé(e) par ${options.parrain.prenom} ${options.parrain.nom} (code ${options.parrain.code_parrain})`
        : null,
      parrain_id: options.parrain?.id ?? null,
      code_parrain: null,
      canal_prefere: canalPrefere,
      statut: 'contact',
      referente_id: referentePourCible(cible),
      envie_depart_id: options.envie ?? null,
      dispo_debut: null,
      dispo_fin: null,
      budget: null,
      compte_social:
        origine === 'reseau_social'
          ? `@${this.sansAccents(identite.prenom).toLowerCase()}.${this.sansAccents(identite.nom).toLowerCase()}`
          : null,
      craintes: null,
      contraintes: null,
      notes: null,
      motif_perte: null,
      ambassadeur: false,
      date_creation: date,
    }
    this.base.contacts.push(contact)
    const auteur = this.auteurCreation(origine)
    const canal = this.canalCreation(origine)
    this.ev(contact, date, 'creation', { process: '01', auteur, canal })
    this.ev(contact, date, 'origine', {
      process: '01',
      auteur,
      canal,
      details: { origine, ...(options.parrain ? { parrain_id: options.parrain.id } : {}) },
    })
    this.consentir(contact, 'newsletter', newsletter, date)
    this.consentir(contact, 'whatsapp', whatsapp, date)
    if (options.verifieeACreation) {
      this.ev(contact, date, 'coordonnee_verifiee', { process: '01', auteur, canal, details: { coordonnee: 'telephone' } })
    }
    return contact
  }

  /** Événements digitaux entre la création et une date limite (exclue). */
  private activiteDigitale(contact: Contact, creation: DateISO, limite: DateISO): void {
    const essais: [TypeEvenement, number, number, Canal][] = [
      ['clic_bienvenue', 0.4, 2, 'email'],
      ['clic_newsletter', 0.3, 6, 'email'],
      ['interaction_sociale', contact.origine === 'reseau_social' ? 0.6 : 0.1, 4, 'instagram'],
      ['telechargement_programme', contact.origine === 'site' ? 0.35 : 0.05, 1, 'site'],
    ]
    for (const [type, probabilite, delai, canal] of essais) {
      const date = ajouterJours(creation, delai + this.r.entier(0, 3))
      if (this.avant(date, limite) && this.passe(date) && this.r.chance(probabilite)) {
        this.ev(contact, this.h(date, 8, 22), type, { process: type === 'interaction_sociale' ? '17' : '01', canal })
      }
    }
  }

  private typeDemande(contact: Contact): TypeEvenement {
    if (contact.origine === 'appel_entrant') return 'appel_entrant'
    if (contact.origine === 'agence') return 'visite_agence'
    const poids: Record<Cible, readonly (readonly [TypeEvenement, number])[]> = {
      senior: [['appel_entrant', 50], ['visite_agence', 30], ['demande_ecrite', 20]],
      parent_solo: [['demande_ecrite', 55], ['appel_entrant', 25], ['visite_agence', 20]],
      celibataire: [['demande_ecrite', 60], ['appel_entrant', 20], ['visite_agence', 20]],
    }
    return this.r.pondere(poids[contact.cible])
  }

  private demande(contact: Contact, date: DateISO, type: TypeEvenement, depart: Depart): Horodatage {
    const canal: Canal =
      type === 'appel_entrant'
        ? 'telephone'
        : type === 'visite_agence'
          ? 'agence'
          : this.r.pondere([['site', 40], ['whatsapp', 25], ['instagram', 20], ['email', 15]] as const)
    const auteur = type === 'demande_ecrite' ? (canal === 'instagram' ? 'florentine' : null) : 'solveig'
    // La demande ne peut pas précéder la création de la fiche le même jour.
    const horodatage = jour(contact.date_creation) === date ? this.plusTard(contact.date_creation, this.r.entier(1, 3) * 5) : this.h(date)
    this.ev(contact, horodatage, type, {
      process: '02',
      canal,
      auteur,
      details: { voyage: depart.offre, depart_id: depart.id, ...(type === 'appel_entrant' ? { duree_minutes: this.r.entier(6, 25) } : {}) },
    })
    // Un appel ou une visite reçoit une réponse en direct ; une demande écrite, sous 24 h ouvrées.
    if (type === 'demande_ecrite') this.repondre(contact, date, canal)
    if (contact.statut === 'contact' || contact.statut === 'perdu') {
      this.changerStatut(contact, this.plusTard(horodatage, 5), 'prospect', { process: '02', auteur: 'solveig' })
    }
    return horodatage
  }

  private confirmerDatesEtBudget(contact: Contact, date: Horodatage, depart: Depart, budgetSuffisant = true): void {
    contact.dispo_debut = ajouterJours(depart.date_depart, -this.r.entier(10, 40))
    contact.dispo_fin = ajouterJours(depart.date_retour, this.r.entier(10, 40))
    this.ev(contact, date, 'dates_confirmees', {
      process: '03',
      auteur: 'solveig',
      canal: 'agence',
      details: { du: contact.dispo_debut, au: contact.dispo_fin },
    })
    const budget = budgetSuffisant
      ? Math.ceil((depart.prix_ttc + this.r.entier(0, 400)) / 50) * 50
      : Math.floor((depart.prix_ttc * 0.8) / 50) * 50
    contact.budget = budget
    this.ev(contact, date, 'budget_confirme', { process: '03', auteur: 'solveig', canal: 'agence', details: { budget } })
  }

  private envoyerDevis(contact: Contact, date: DateISO, depart: Depart, horodatageImpose?: Horodatage, pasAvant?: Horodatage): Horodatage {
    this.base.devis.push({
      id: this.r.uuid(),
      contact_id: contact.id,
      depart_id: depart.id,
      montant: depart.prix_ttc,
      date_envoi: date,
      date_fin_validite: ajouterJours(date, 30),
      statut: 'envoye',
    })
    let horodatage = horodatageImpose ?? this.h(date)
    // Le devis part après l'accord du client, jamais avant (même s'ils sont le même jour).
    if (pasAvant && horodatage <= pasAvant) horodatage = this.plusTard(pasAvant, 15)
    this.ev(contact, horodatage, 'devis_envoye', {
      process: '03',
      auteur: 'solveig',
      canal: 'email',
      details: { depart_id: depart.id, offre: depart.offre, montant: depart.prix_ttc, valable_jusqu_au: ajouterJours(date, 30) },
    })
    // Un voyageur ou un abonné qui redemande un devis garde son statut jusqu'à la réservation.
    if (contact.statut === 'contact' || contact.statut === 'prospect' || contact.statut === 'perdu') {
      this.changerStatut(contact, horodatage, 'devis_envoye', { process: '03', auteur: 'solveig' })
    }
    return horodatage
  }

  /** Parcours complet d'un futur voyageur, de la première rencontre au devis accepté. */
  private creerVoyageur(depart: Depart, dateReservation: DateISO, options: { identite?: Identite; origine?: Origine; parrain?: Contact } = {}): Contact {
    // Un filleul se manifeste peu avant de réserver : après la remise du code parrain à son parrain.
    const court = Boolean(options.parrain)
    const dateDevis = this.ouvre(ajouterJours(dateReservation, -(court ? 2 : this.r.entier(3, 12))))
    const dateRdv = this.ouvre(ajouterJours(dateDevis, -(court ? 0 : this.r.entier(0, 1))))
    const dateAccepte = this.ouvre(ajouterJours(dateRdv, -(court ? 1 : this.r.entier(1, 5))))
    const dateDemande = this.ouvre(ajouterJours(dateAccepte, -(court ? 1 : this.r.entier(0, 4))))
    const origine = options.parrain ? 'parrainage' : options.origine ?? this.r.pondere(L.ORIGINES[depart.cible])
    const enDirect = origine === 'appel_entrant' || origine === 'agence' || court
    const dateCreation = enDirect ? dateDemande : ajouterJours(dateDemande, -this.r.entier(0, 25))
    const contact = this.creerContact({
      cible: depart.cible,
      date: this.h(dateCreation),
      identite: options.identite,
      origine,
      parrain: options.parrain,
      envie: depart.id,
      verifieeACreation: enDirect || origine === 'stand' || origine === 'parrainage',
    })
    this.activiteDigitale(contact, dateCreation, dateDemande)
    // Curseur chronologique : une étape du même jour vient toujours après la précédente.
    let curseur: Horodatage = this.demande(contact, dateDemande, this.typeDemande(contact), depart)
    const etape = (date: DateISO, debut = 9, fin = 18): Horodatage => {
      curseur = jour(curseur) === date ? this.plusTard(curseur, this.r.entier(2, 12) * 5) : this.h(date, debut, fin)
      return curseur
    }
    if (!this.base.evenements.some((e) => e.contact_id === contact.id && e.type === 'coordonnee_verifiee')) {
      this.ev(contact, etape(dateDemande), 'coordonnee_verifiee', { process: '02', auteur: 'solveig', canal: 'telephone', details: { coordonnee: 'telephone' } })
    }
    if (this.r.chance(0.2) && this.avant(ajouterJours(dateDemande, 3), dateAccepte)) {
      this.ev(contact, etape(ajouterJours(dateDemande, 3)), 'reponse_relance', { process: '02', canal: contact.canal_prefere })
    }
    this.ev(contact, etape(dateAccepte), 'rdv_accepte', { process: '03', auteur: 'solveig', canal: 'telephone', details: { date_rdv: dateRdv } })
    const horodatageRdv = etape(dateRdv, 9, 16)
    this.ev(contact, horodatageRdv, 'rdv_realise', { process: '03', auteur: 'solveig', canal: this.r.chance(0.6) ? 'agence' : 'telephone', details: { duree_minutes: this.r.entier(20, 30) } })
    this.confirmerDatesEtBudget(contact, horodatageRdv, depart, this.r.chance(0.85))
    this.ev(contact, horodatageRdv, 'accord_devis', { process: '03', auteur: 'solveig', canal: 'agence' })
    this.envoyerDevis(contact, dateDevis, depart, etape(dateDevis))
    const relance = ajouterJours(dateDevis, 3)
    if (this.avant(relance, dateReservation) && this.r.chance(0.65)) {
      this.ev(contact, etape(relance), 'relance_devis_aboutie', { process: '04', auteur: 'solveig', canal: 'telephone' })
    }
    if (this.r.chance(0.5)) {
      const question = this.avant(relance, dateReservation) ? relance : dateDevis
      this.ev(contact, etape(question), 'question_modalites', {
        process: '04',
        auteur: 'solveig',
        canal: 'telephone',
        details: { question: this.r.choix(['Paiement en chèques-vacances', 'Montant de l\'acompte', 'Choix du binôme de chambre']) },
      })
    }
    return contact
  }

  // -------------------------------------------------------------------------
  // Réservations et vie du voyage
  // -------------------------------------------------------------------------

  private moyenPaiement(cible: Cible): MoyenPaiement {
    return this.r.pondere(
      cible === 'senior'
        ? ([['cheque', 25], ['cheques_vacances', 25], ['virement', 25], ['carte', 25]] as const)
        : ([['carte', 45], ['virement', 30], ['cheques_vacances', 15], ['cheque', 10]] as const),
    )
  }

  private reserver(contact: Contact, depart: Depart, date: DateISO): Reservation {
    const acompte = Math.round(depart.prix_ttc * 0.3)
    // Règle métier : à moins de 60 jours du départ, la totalité est exigible à la signature.
    const totalite = ecartJours(date, depart.date_depart) < 60
    const reservation: Reservation = {
      id: this.r.uuid(),
      contact_id: contact.id,
      depart_id: depart.id,
      date_reservation: date,
      acompte_montant: acompte,
      acompte_date: date,
      moyen_paiement: this.moyenPaiement(contact.cible),
      solde_montant: depart.prix_ttc - acompte,
      solde_echeance: totalite ? date : depart.echeance_solde,
      solde_date: totalite ? date : null,
      mise_en_demeure_date: null,
      rappel_solde_auto: true,
      appel_bienvenue_date: null,
      tentatives_appel: 0,
      ajout_groupe_date: null,
      message_groupe_poste: false,
      hesite_dates: false,
      brise_glace_confirme_le: null,
      present_brise_glace: null,
      binome: null,
      opposition_image: false,
      note_chaud: null,
      incident_non_resolu: false,
      partage_groupe: false,
      retour_confirme_le: null,
      present_retour: null,
      album_remis: null,
      statut: totalite ? 'soldee' : 'reservee',
      report_utilise: false,
      depart_initial_id: null,
      date_report: null,
      annulation_date: null,
      annulation_motif: null,
      montant_retenu: null,
      montant_rembourse: null,
    }
    this.base.reservations.push(reservation)
    const horodatage = this.h(date)
    this.ev(contact, horodatage, 'reservation', {
      process: '04',
      auteur: 'solveig',
      canal: this.r.chance(0.6) ? 'agence' : 'telephone',
      details: { depart_id: depart.id, offre: depart.offre, acompte, moyen_paiement: reservation.moyen_paiement },
    })
    this.changerStatut(contact, horodatage, 'reserve', { process: '04', auteur: 'solveig' })
    if (totalite) {
      this.ev(contact, horodatage, 'solde', { process: '06', auteur: 'emilien', details: { montant: reservation.solde_montant, totalite_a_la_signature: true } })
      this.changerStatut(contact, horodatage, 'solde', { process: '06', auteur: 'emilien' })
    }
    const devis = this.base.devis.filter((d) => d.contact_id === contact.id && d.depart_id === depart.id && d.statut === 'envoye')
    for (const d of devis) d.statut = 'accepte'

    const cible = contact.cible
    const fiche = {
      id: this.r.uuid(),
      reservation_id: reservation.id,
      attentes: this.r.choix(L.ATTENTES[cible]),
      craintes: this.r.choix(L.CRAINTES[cible]),
      contraintes: this.r.choix(L.CONTRAINTES),
      details_personnels: this.r.choix(L.DETAILS_PERSONNELS),
      remplie_le: date,
    }
    this.base.fiches_passation.push(fiche)
    contact.craintes = fiche.craintes
    contact.contraintes = fiche.contraintes
    this.ev(contact, this.h(date, 16, 19), 'fiche_passation', { process: '05', auteur: 'solveig', canal: 'crm' })
    return reservation
  }

  private sacDeNotes: number[] = []

  /** Notes à chaud tirées dans un sac de 50 : 15 × 10, 15 × 9, 9 × 8, 6 × 7, 3 × 6, 1 × 5, 1 × 4. */
  private tirerNote(): number {
    if (this.sacDeNotes.length === 0) {
      const repartition: [number, number][] = [[10, 15], [9, 15], [8, 9], [7, 6], [6, 3], [5, 1], [4, 1]]
      this.sacDeNotes = this.r.melanger(repartition.flatMap(([note, nombre]) => Array<number>(nombre).fill(note)))
    }
    return this.sacDeNotes.pop() as number
  }

  /** Fait vivre une réservation jusqu'à la date de démo (process 05 à 12). */
  private vivreReservation(contact: Contact, reservation: Reservation, depart: Depart, scenario: Scenario = {}, limite: DateISO = REF): void {
    const referente = contact.referente_id
    const date = reservation.date_reservation
    // Une étape n'a lieu que si sa date est passée à la date de démo (ou à la date d'annulation).
    const passe = (valeur: DateISO | Horodatage) => numeroJour(valeur) <= numeroJour(limite)

    // Process 05 : appel de bienvenue sous 48 h, puis ajout au groupe WhatsApp du voyage.
    const delai = scenario.appelDelai ?? this.r.pondere([[1, 60], [2, 25], [3, 10], [4, 5]] as const)
    const dateAppel = ajouterJours(date, delai)
    if (passe(dateAppel)) {
      reservation.appel_bienvenue_date = dateAppel
      reservation.tentatives_appel = delai > 2 ? this.r.entier(2, 3) : 1
      const parrain = this.base.contacts.find((c) => c.id === contact.parrain_id)
      this.ev(contact, this.h(dateAppel), 'appel_bienvenue', {
        process: '05',
        auteur: referente,
        canal: 'telephone',
        details: { duree_minutes: this.r.entier(10, 15), ...(parrain ? { parrain_mentionne: `${parrain.prenom} ${parrain.nom}` } : {}) },
      })
      const ajout = ajouterJours(dateAppel, 1)
      if (passe(ajout)) {
        reservation.ajout_groupe_date = ajout
        this.ev(contact, this.h(ajout), 'ajout_groupe', { process: '05', auteur: referente, canal: 'whatsapp', details: { groupe: `${depart.offre} ${depart.date_depart}` } })
        reservation.message_groupe_poste = scenario.messageGroupe ?? (passe(ajouterJours(ajout, 2)) && this.r.chance(0.7))
      }
    }

    // Process 06 : solde de 70 % à J-60, mise en demeure à J-57.
    if (reservation.solde_date === null) {
      const echeance = reservation.solde_echeance
      if (scenario.soldeEnRetard) {
        const miseEnDemeure = ajouterJours(echeance, 3)
        if (passe(miseEnDemeure)) {
          reservation.mise_en_demeure_date = miseEnDemeure
          this.ev(contact, this.h(miseEnDemeure), 'mise_en_demeure', { process: '06', auteur: 'emilien', canal: 'email', details: { montant: reservation.solde_montant, message: 'M14' } })
        }
      } else if (passe(echeance)) {
        const enRetard = this.r.chance(0.08)
        const dateSolde = enRetard
          ? ajouterJours(echeance, this.r.entier(1, 2))
          : ajouterJours(echeance, -(scenario.soldeAvantEcheance ?? this.r.entier(0, 12)))
        this.solder(contact, reservation, numeroJour(dateSolde) <= numeroJour(date) ? ajouterJours(date, 1) : dateSolde)
      } else if (this.r.chance(0.1)) {
        const dateSolde = this.auPlusTard(ajouterJours(date, this.r.entier(20, 60)), limite)
        if (this.avant(date, dateSolde)) this.solder(contact, reservation, dateSolde)
      }
    }
    if (!passe(depart.date_depart) && this.r.chance(0.05)) reservation.hesite_dates = true

    // Process 07 : Soli'apéro brise-glace.
    if (passe(depart.soliapero_brise_glace)) {
      reservation.present_brise_glace = scenario.presentBriseGlace ?? this.r.chance(0.85)
      this.ev(contact, depart.soliapero_brise_glace, 'presence_soliapero', {
        process: '07',
        auteur: referente,
        canal: 'agence',
        details: { moment: 'brise_glace', present: reservation.present_brise_glace },
      })
      reservation.opposition_image = this.r.chance(0.08)
      this.consentir(contact, 'droit_image', !reservation.opposition_image, depart.soliapero_brise_glace)
    }

    this.confirmerPresence(reservation, depart, 'brise_glace', passe)

    // Process 08 et 09 : séjour, satisfaction à chaud, retour.
    if (passe(depart.date_retour)) {
      const note = scenario.noteChaud ?? this.tirerNote()
      reservation.note_chaud = note
      reservation.incident_non_resolu = scenario.incident ?? (note <= 6 && this.r.chance(0.4))
      reservation.partage_groupe = scenario.partage ?? this.r.chance(0.65)
      reservation.statut = 'voyagee'
      this.ev(contact, `${depart.date_retour}T20:00`, 'satisfaction_chaud', { process: '08', auteur: depart.animatrice_id, canal: 'agence', details: { note } })
      this.changerStatut(contact, `${depart.date_retour}T21:00`, 'voyageur', { process: '09' })
    }

    // Process 10 : Soli'apéro retour.
    if (passe(depart.soliapero_retour)) {
      reservation.present_retour = scenario.presentRetour ?? this.r.chance(0.75)
      reservation.album_remis = reservation.present_retour || this.r.chance(0.5)
      this.ev(contact, depart.soliapero_retour, 'presence_soliapero', {
        process: '10',
        auteur: referente,
        canal: 'agence',
        details: { moment: 'retour', present: reservation.present_retour, album_remis: reservation.album_remis },
      })
    }

    this.confirmerPresence(reservation, depart, 'retour', passe)

    // Process 12 : enquête de satisfaction à R+2 après la soirée, réponse sous 7 jours.
    const envoiEnquete = ajouterJours(depart.soliapero_retour, 2)
    if (passe(envoiEnquete) && (scenario.nps !== undefined || this.r.chance(0.88))) {
      const dateReponse = ajouterJours(envoiEnquete, this.r.entier(0, 6))
      if (passe(dateReponse)) {
        const nps = scenario.nps ?? Math.min(10, Math.max(0, (reservation.note_chaud ?? 8) + this.r.entier(-1, 1)))
        // Environ un tiers des 9 et 10 publient un avis Google : un répondant sur trois.
        if (nps >= 9 && scenario.avis === undefined) this.recommandations++
        const avisPublie = nps >= 9 && (scenario.avis ?? this.recommandations % 3 === 0)
        this.base.enquetes.push({
          id: this.r.uuid(),
          contact_id: contact.id,
          reservation_id: reservation.id,
          type: 'voyage',
          nps,
          notes_par_temps: {
            soliapero: Math.min(10, nps + this.r.entier(-1, 1)),
            sejour: Math.min(10, nps + this.r.entier(-1, 0)),
            animatrice: Math.min(10, nps + this.r.entier(0, 1)),
            hebergement: Math.min(10, Math.max(0, nps + this.r.entier(-2, 0))),
          },
          commentaire: nps >= 9 ? 'Un groupe formidable, on se revoit déjà.' : nps >= 7 ? 'Très bien, quelques temps morts.' : 'Déçu(e) par l\'organisation du transport.',
          date: dateReponse,
          avis_google_publie: avisPublie,
        })
        this.ev(contact, this.h(dateReponse, 8, 22), 'enquete', { process: '12', canal: 'email', details: { nps } })
        if (nps >= 9) this.donnerCodeParrain(contact)
        if (avisPublie) this.publierAvis(contact, dateReponse)
      }
    }
  }

  /**
   * Réponse à l'invitation au Soli'apéro (process 07 à J-21, process 09 à R+2) : les présents ont
   * confirmé, la plupart avant la relance personnelle (J-18 ou R+5) ; pour une soirée à venir,
   * un peu plus de la moitié des invités a déjà répondu.
   */
  private confirmerPresence(reservation: Reservation, depart: Depart, moment: 'brise_glace' | 'retour', passe: (d: string) => boolean): void {
    const invitation = moment === 'brise_glace' ? ajouterJours(depart.date_depart, -21) : ajouterJours(depart.date_retour, 2)
    const soiree = moment === 'brise_glace' ? depart.soliapero_brise_glace : depart.soliapero_retour
    if (!passe(invitation)) return
    const present = moment === 'brise_glace' ? reservation.present_brise_glace : reservation.present_retour
    const confirme = present === null ? this.r3.chance(0.55) : present ? true : this.r3.chance(0.3)
    if (!confirme) return
    const ouverture = numeroJour(reservation.date_reservation) > numeroJour(invitation) ? reservation.date_reservation : invitation
    const date = ajouterJours(ouverture, this.r3.pondere([[0, 30], [1, 30], [2, 20], [3, 12], [4, 8]] as const))
    if (passe(date) && numeroJour(date) < numeroJour(soiree)) {
      if (moment === 'brise_glace') reservation.brise_glace_confirme_le = date
      else reservation.retour_confirme_le = date
    }
  }

  private solder(contact: Contact, reservation: Reservation, date: DateISO): void {
    reservation.solde_date = date
    if (reservation.statut === 'reservee') reservation.statut = 'soldee'
    const horodatage = this.h(date)
    this.ev(contact, horodatage, 'solde', { process: '06', auteur: 'emilien', details: { montant: reservation.solde_montant } })
    if (contact.statut === 'reserve') this.changerStatut(contact, horodatage, 'solde', { process: '06', auteur: 'emilien' })
  }

  private publierAvis(contact: Contact, apres: DateISO): void {
    const date = this.auPlusTard(ajouterJours(apres, this.r.entier(0, 3)))
    const dateReponse = ajouterJours(date, this.r.entier(0, 2))
    const repondu = this.passe(dateReponse)
    this.base.avis.push({
      id: this.r.uuid(),
      contact_id: contact.id,
      plateforme: 'google',
      note: this.r.chance(0.85) ? 5 : 4,
      texte: this.r.choix(L.TEXTES_AVIS_POSITIFS),
      date,
      reponse: repondu ? `Merci ${contact.prenom} ! Quel bonheur de lire votre avis. À très vite pour de nouvelles aventures avec la tribu !` : null,
      date_reponse: repondu ? dateReponse : null,
      reclamation_id: null,
    })
    this.ev(contact, this.h(date, 8, 22), 'avis', { process: '17', canal: 'google', details: { plateforme: 'google' } })
  }

  // -------------------------------------------------------------------------
  // Étapes de génération
  // -------------------------------------------------------------------------

  private ajouterVoyageur(depart: Depart, contact: Contact, reservation: Reservation): void {
    const liste = this.voyageurs.get(depart.id) ?? []
    liste.push({ contact, reservation })
    this.voyageurs.set(depart.id, liste)
  }

  /** Date de réservation plausible : en général plus de 60 jours avant le départ. */
  private dateReservation(depart: Depart, tardiveProbable = 0.15): DateISO {
    const tardive = this.r.chance(tardiveProbable)
    const plusTot = ajouterJours(depart.date_depart, tardive ? -59 : -170)
    const plusTard = ajouterJours(depart.date_depart, tardive ? -20 : -62)
    let min = numeroJour(plusTot) < numeroJour('2026-04-01') ? '2026-04-01' : plusTot
    const max = this.auPlusTard(plusTard)
    // Départs lointains : réservés dans les trois mois qui précèdent la date de démo.
    if (numeroJour(min) > numeroJour(max)) min = ajouterJours(max, -90)
    const ecart = Math.max(0, ecartJours(min, max))
    return ajouterJours(min, this.r.entier(0, ecart))
  }

  private voyageursPasses(): void {
    const personas: Record<string, { cle: string; identite: Identite; origine: Origine; dateReservation: DateISO; scenario: Scenario }> = {
      'irlande-2026-09': {
        cle: 'jacqueline',
        identite: { prenom: 'Jacqueline', nom: 'Morel', femme: true, dateNaissance: '1954-02-17', ville: 'Les Sables-d\'Olonne' },
        origine: 'stand',
        dateReservation: '2026-05-04',
        scenario: { appelDelai: 1, messageGroupe: false, soldeAvantEcheance: 6, presentBriseGlace: true, noteChaud: 9, incident: false, partage: true, presentRetour: true, nps: 10, avis: true },
      },
      'paris-2026-10': {
        cle: 'julie',
        identite: { prenom: 'Julie', nom: 'Petit', femme: true, dateNaissance: '1985-09-08', ville: 'Montaigu-Vendée' },
        origine: 'site',
        dateReservation: '2026-06-23',
        scenario: { appelDelai: 1, presentBriseGlace: true, noteChaud: 10, incident: false, presentRetour: true, nps: 10, avis: false },
      },
      'hossegor-2026-10': {
        cle: 'thomas',
        identite: { prenom: 'Thomas', nom: 'Garnier', femme: false, dateNaissance: '1994-07-05', ville: 'Nantes' },
        origine: 'flyer_qr',
        dateReservation: '2026-07-08',
        scenario: { appelDelai: 2, presentBriseGlace: true, noteChaud: 9, incident: false, partage: true, presentRetour: true, nps: 9, avis: true },
      },
    }

    for (const [departId, nombre] of Object.entries(VOYAGEURS_PASSES)) {
      const depart = this.depart(departId)
      for (let i = 0; i < nombre; i++) {
        const persona = i === 0 ? personas[departId] : undefined
        const dateResa = persona?.dateReservation ?? this.dateReservation(depart)
        const contact = this.creerVoyageur(depart, dateResa, persona ? { identite: persona.identite, origine: persona.origine } : {})
        if (persona) {
          this.personas[persona.cle] = contact
          contact.canal_prefere = persona.cle === 'jacqueline' ? 'telephone' : 'whatsapp'
        }
        const reservation = this.reserver(contact, depart, dateResa)
        this.vivreReservation(contact, reservation, depart, persona?.scenario)
        this.ajouterVoyageur(depart, contact, reservation)
      }
    }
  }

  /** Process 11 : environ 40 % des voyageurs s'abonnent après le Soli'apéro retour. */
  private abonnements(): void {
    for (const [departId, liste] of this.voyageurs) {
      const depart = this.depart(departId)
      const soiree = jour(depart.soliapero_retour)
      if (!this.passe(soiree) || !(departId in VOYAGEURS_PASSES)) continue
      const voyageurs = liste.filter((v) => v.reservation.statut === 'voyagee')
      const objectif = departId === 'malte-2026-11' ? 4 : Math.round(voyageurs.length * 0.4)
      const forces = voyageurs.filter((v) => Object.values(this.personas).includes(v.contact))
      const classement = voyageurs
        .filter((v) => !forces.includes(v))
        .map((v) => {
          const enquete = this.base.enquetes.find((e) => e.reservation_id === v.reservation.id)
          const propension = (v.reservation.present_retour ? 2 : 0) + ((enquete?.nps ?? 0) >= 9 ? 1 : 0) + this.r.suivant()
          return { v, propension }
        })
        .sort((a, b) => b.propension - a.propension)
        .map((x) => x.v)
      const abonnes = [...forces, ...classement.slice(0, Math.max(0, objectif - forces.length))]

      for (const { contact, reservation } of voyageurs) {
        const referente = contact.referente_id
        if (abonnes.some((a) => a.contact === contact)) {
          const dateDebut = reservation.present_retour ? soiree : this.auPlusTard(ajouterJours(soiree, this.r.entier(3, 10)))
          this.base.abonnements.push({
            id: this.r.uuid(),
            contact_id: contact.id,
            formule: FORMULE_ABONNEMENT,
            decision: 'abonne',
            date_decision: dateDebut,
            date_debut: dateDebut,
            date_fin: null,
            motif_resiliation: null,
            motif_refus: null,
          })
          const horodatage = dateDebut === soiree ? `${soiree}T19:45` : this.h(dateDebut)
          this.ev(contact, horodatage, 'souscription', { process: '11', auteur: referente, canal: 'agence', details: { formule: FORMULE_ABONNEMENT } })
          this.changerStatut(contact, horodatage, 'abonne', { process: '11', auteur: referente })
          this.donnerCodeParrain(contact)
        } else if (this.passe(ajouterJours(soiree, 15))) {
          const motif = this.r.choix(L.MOTIFS_REFUS_ABONNEMENT)
          const dateDecision = reservation.present_retour ? soiree : ajouterJours(soiree, 3)
          this.base.abonnements.push({
            id: this.r.uuid(),
            contact_id: contact.id,
            formule: FORMULE_ABONNEMENT,
            decision: 'refus',
            date_decision: dateDecision,
            date_debut: null,
            date_fin: null,
            motif_resiliation: null,
            motif_refus: motif,
          })
          this.ev(contact, this.h(dateDecision, 10, 19), 'note', { process: '11', auteur: referente, canal: 'crm', details: { texte: `Décision sur l'abonnement : refus (${motif})` } })
        } else if (reservation.present_retour) {
          this.base.abonnements.push({
            id: this.r.uuid(),
            contact_id: contact.id,
            formule: FORMULE_ABONNEMENT,
            decision: 'en_reflexion',
            date_decision: soiree,
            date_debut: null,
            date_fin: null,
            motif_resiliation: null,
            motif_refus: null,
          })
        }
      }
    }
  }

  private abonnesDe(departId: string): { contact: Contact; reservation: Reservation; abonnement: Abonnement }[] {
    return (this.voyageurs.get(departId) ?? []).flatMap((v) => {
      const abonnement = this.base.abonnements.find((a) => a.contact_id === v.contact.id && a.decision === 'abonne')
      return abonnement ? [{ ...v, abonnement }] : []
    })
  }

  /** Choisit un abonné d'un départ qui n'a pas encore de rôle particulier. */
  private abonneLibre(departId: string, pris: Set<Contact>, condition: (a: Abonnement) => boolean = () => true): Contact {
    const libre = this.abonnesDe(departId).find(
      (a) => !pris.has(a.contact) && !Object.values(this.personas).includes(a.contact) && condition(a.abonnement),
    )
    if (!libre) throw new Error(`Aucun abonné disponible sur ${departId}`)
    pris.add(libre.contact)
    return libre.contact
  }

  private participations(roles: { inactifs: Map<Contact, DateISO | null>; resilies: Set<Contact> }): void {
    const activitesPassees = this.base.activites.filter((a) => this.passe(a.date))
    for (const abonnement of this.base.abonnements.filter((a) => a.decision === 'abonne' && a.date_debut)) {
      const contact = this.base.contacts.find((c) => c.id === abonnement.contact_id) as Contact
      const debut = abonnement.date_debut as DateISO
      const fin = abonnement.date_fin
      const sesActivites = activitesPassees.filter(
        (a) => a.cible === contact.cible && numeroJour(a.date) >= numeroJour(debut) && (!fin || this.avant(a.date, fin)),
      )
      const derniere = sesActivites[sesActivites.length - 1]
      for (const activite of sesActivites) {
        let present: boolean
        if (roles.inactifs.has(contact)) {
          present = roles.inactifs.get(contact) === activite.date
        } else if (contact === this.personas.jacqueline) {
          present = activite.date === '2026-11-10'
        } else if (activite === derniere && ecartJours(activite.date, REF) <= 30 && !roles.resilies.has(contact)) {
          present = true
        } else {
          present = this.r.chance(0.55)
        }
        if (present || this.r.chance(0.15)) {
          this.base.participations.push({ id: this.r.uuid(), activite_id: activite.id, contact_id: contact.id, inscrit: true, present })
        }
      }
      // Inscriptions aux activités des trois prochaines semaines.
      if (!fin && !roles.inactifs.has(contact)) {
        for (const activite of this.base.activites.filter(
          (a) => a.cible === contact.cible && !this.passe(a.date) && ecartJours(REF, a.date) <= 21,
        )) {
          if (this.r.chance(0.4)) {
            this.base.participations.push({ id: this.r.uuid(), activite_id: activite.id, contact_id: contact.id, inscrit: true, present: null })
          }
        }
      }
    }
  }

  /** Voyageurs non abonnés venus à un événement ouvert à tous (process 14). */
  private presencesNonAbonnes(): void {
    const ajouts: [string, string, number][] = [
      ['act-2026-11-07', 'basque-2026-09', 2],
      ['act-2026-11-07', 'paris-2026-10', 1],
      ['act-2026-10-08', 'cyclades-2026-09', 2],
    ]
    for (const [activiteId, departId, nombre] of ajouts) {
      const nonAbonnes = (this.voyageurs.get(departId) ?? []).filter(
        (v) => !this.base.abonnements.some((a) => a.contact_id === v.contact.id && a.decision === 'abonne'),
      )
      for (const { contact } of nonAbonnes.slice(0, nombre)) {
        this.base.participations.push({ id: this.r.uuid(), activite_id: activiteId, contact_id: contact.id, inscrit: true, present: true })
      }
    }
  }

  private binomes(): void {
    for (const [, liste] of this.voyageurs) {
      const presents = this.r.melanger(liste.filter((v) => v.reservation.present_brise_glace))
      for (let i = 0; i + 1 < presents.length; i += 2) {
        if (!this.r.chance(0.6)) continue
        const [a, b] = [presents[i], presents[i + 1]]
        a.reservation.binome = `${b.contact.prenom} ${b.contact.nom.charAt(0)}.`
        b.reservation.binome = `${a.contact.prenom} ${a.contact.nom.charAt(0)}.`
      }
    }
  }

  private reservationsFutures(roles: { parrainSenior: Contact; reacheteurs: Record<string, Contact> }): void {
    for (const [departId, nombre] of Object.entries(RESERVATIONS_FUTURES)) {
      const depart = this.depart(departId)
      for (let i = 0; i < nombre; i++) {
        const special = this.casParticulier(depart, i, roles)
        if (special === 'deja_fait') continue
        const dateResa = this.dateReservation(depart, depart.date_depart < '2027-02-01' ? 0.2 : 0)
        const contact = this.creerVoyageur(depart, dateResa)
        const reservation = this.reserver(contact, depart, dateResa)
        this.vivreReservation(contact, reservation, depart)
        this.ajouterVoyageur(depart, contact, reservation)
      }
    }
  }

  /** Cas imposés par docs/03 : filleuls, réachats, solde en retard, report. */
  private casParticulier(
    depart: Depart,
    rang: number,
    roles: { parrainSenior: Contact; reacheteurs: Record<string, Contact> },
  ): 'deja_fait' | null {
    if (rang !== 0) return null
    const id = depart.id
    if (id === 'barcelone-2026-12') {
      // Le filleul de Thomas : acompte encaissé (la totalité, départ à moins de 60 jours).
      this.filleulReserve(this.personas.thomas, depart, '2026-11-12')
      return 'deja_fait'
    }
    if (id === 'malte-2027-02') {
      this.filleulReserve(roles.parrainSenior, depart, '2026-11-20')
      return 'deja_fait'
    }
    if (id === 'lisbonne-2027-01') {
      // Solde en retard : mise en demeure envoyée à J-57 (critère M3).
      const contact = this.creerVoyageur(depart, '2026-09-15')
      const reservation = this.reserver(contact, depart, '2026-09-15')
      this.vivreReservation(contact, reservation, depart, { soldeEnRetard: true, appelDelai: 1 })
      this.ajouterVoyageur(depart, contact, reservation)
      return 'deja_fait'
    }
    if (id === 'lisbonne-2027-03') {
      // Report gratuit : réservation faite sur Lisbonne de janvier, reportée en mars le 05/11.
      const initial = this.depart('lisbonne-2027-01')
      const contact = this.creerVoyageur(initial, '2026-09-10')
      const reservation = this.reserver(contact, initial, '2026-09-10')
      reservation.depart_initial_id = initial.id
      reservation.depart_id = depart.id
      reservation.report_utilise = true
      reservation.date_report = '2026-11-05'
      reservation.solde_echeance = depart.echeance_solde
      contact.envie_depart_id = depart.id
      this.vivreReservation(contact, reservation, depart, { appelDelai: 1 })
      this.ev(contact, '2026-11-05T11:00', 'report', {
        process: '18',
        auteur: contact.referente_id,
        canal: 'telephone',
        details: { depart_initial_id: initial.id, nouveau_depart_id: depart.id, motif: 'Contrainte professionnelle en janvier' },
      })
      this.ajouterVoyageur(depart, contact, reservation)
      return 'deja_fait'
    }
    const reacheteur = roles.reacheteurs[id]
    if (reacheteur) {
      this.reachat(reacheteur, depart)
      return 'deja_fait'
    }
    return null
  }

  private filleulReserve(parrain: Contact, depart: Depart, dateResa: DateISO): void {
    const filleul = this.creerVoyageur(depart, dateResa, { parrain })
    const reservation = this.reserver(filleul, depart, dateResa)
    this.vivreReservation(filleul, reservation, depart)
    this.ajouterVoyageur(depart, filleul, reservation)
    this.base.parrainages.push({ id: this.r.uuid(), parrain_id: parrain.id, filleul_id: filleul.id, recompense: null, date_recompense: dateResa })
    parrain.ambassadeur = true
    this.ev(parrain, this.h(dateResa, 16, 19), 'parrainage', {
      process: '15',
      auteur: parrain.referente_id,
      canal: 'crm',
      details: { filleul_id: filleul.id, filleul: `${filleul.prenom} ${filleul.nom}`, acompte_encaisse: true },
    })
  }

  /** Process 15 : un ancien voyageur réserve un nouveau voyage (process 04 avec l'historique). */
  private reachat(contact: Contact, depart: Depart): void {
    const dateResa = this.auPlusTard(ajouterJours(REF, -this.r.entier(5, 25)))
    const dateDevis = this.ouvre(ajouterJours(dateResa, -this.r.entier(2, 6)))
    this.ev(contact, this.h(ajouterJours(dateDevis, -2)), 'appel_entrant', {
      process: '02',
      auteur: 'solveig',
      canal: 'telephone',
      details: { voyage: depart.offre, depart_id: depart.id, duree_minutes: this.r.entier(8, 20) },
    })
    this.envoyerDevis(contact, dateDevis, depart)
    contact.envie_depart_id = depart.id
    const reservation = this.reserver(contact, depart, dateResa)
    this.vivreReservation(contact, reservation, depart)
    this.ajouterVoyageur(depart, contact, reservation)
  }

  /** Deux annulations : l'une à plus de 60 jours du départ, l'autre entre 30 et 15 jours. */
  private annulations(): void {
    const cas: [string, DateISO, DateISO, string][] = [
      ['cyclades-2027-06', '2026-09-01', '2026-11-03', 'Raisons personnelles'],
      ['barcelone-2026-12', '2026-08-20', '2026-11-18', 'Problème de santé'],
    ]
    for (const [departId, dateResa, dateAnnulation, motif] of cas) {
      const depart = this.depart(departId)
      const contact = this.creerVoyageur(depart, dateResa)
      const reservation = this.reserver(contact, depart, dateResa)
      this.vivreReservation(contact, reservation, depart, {}, ajouterJours(dateAnnulation, -1))
      const joursAvant = ecartJours(dateAnnulation, depart.date_depart)
      // Barème des CGV (process 18).
      const pourcentage = joursAvant > 60 ? 30 : joursAvant >= 31 ? 50 : joursAvant >= 15 ? 75 : joursAvant >= 7 ? 90 : 100
      const paye = reservation.acompte_montant + (reservation.solde_date && this.avant(reservation.solde_date, dateAnnulation) ? reservation.solde_montant : 0)
      const retenu = Math.round(depart.prix_ttc * pourcentage) / 100
      reservation.statut = 'annulee'
      reservation.annulation_date = dateAnnulation
      reservation.annulation_motif = motif
      reservation.montant_retenu = retenu
      reservation.montant_rembourse = Math.max(0, paye - retenu)
      this.ev(contact, this.h(dateAnnulation), 'annulation', {
        process: '18',
        auteur: 'emilien',
        canal: 'email',
        details: { date_reception: dateAnnulation, jours_avant_depart: joursAvant, pourcentage_retenu: pourcentage, montant_retenu: retenu, montant_rembourse: reservation.montant_rembourse },
      })
      this.changerStatut(contact, this.h(dateAnnulation, 17, 19), 'perdu', { process: '18', auteur: 'emilien', motif: `Annulation du voyage (${motif.toLowerCase()})` })
    }
  }

  private resiliations(resilies: Contact[]): void {
    const dates: DateISO[] = ['2026-11-12', '2026-11-24']
    const motifs = ['Déménagement hors de Vendée', 'Manque de temps']
    resilies.forEach((contact, i) => {
      const abonnement = this.base.abonnements.find((a) => a.contact_id === contact.id && a.decision === 'abonne') as Abonnement
      abonnement.date_fin = dates[i]
      abonnement.motif_resiliation = motifs[i]
      const horodatage = this.h(dates[i])
      this.ev(contact, horodatage, 'resiliation', { process: '13', auteur: contact.referente_id, canal: 'telephone', details: { motif: motifs[i] } })
      this.changerStatut(contact, horodatage, 'ancien_abonne', { process: '13', auteur: contact.referente_id })
    })
  }

  private reclamationsEtAvis(): void {
    const voyageur = (departId: string, rang: number) => (this.voyageurs.get(departId) ?? [])[rang]
    const cas: { departId: string; rang: number; motif: 'hebergement' | 'transport' | 'programme'; ouverture: DateISO; resolution: DateISO | null; statut: 'ouverte' | 'en_cours' | 'resolue'; geste: string | null; ecrite: boolean; description: string }[] = [
      { departId: 'perigord-2026-10', rang: 3, motif: 'hebergement', ouverture: '2026-10-14', resolution: '2026-10-19', statut: 'resolue', geste: 'Activité abonnés offerte', ecrite: false, description: 'Chambre bruyante, changement demandé pendant le séjour' },
      { departId: 'cyclades-2026-09', rang: 4, motif: 'programme', ouverture: '2026-10-05', resolution: '2026-10-09', statut: 'resolue', geste: 'Remboursement de l\'excursion annulée', ecrite: true, description: 'Excursion en bateau annulée sans solution de remplacement' },
      { departId: 'hossegor-2026-10', rang: 5, motif: 'transport', ouverture: '2026-11-24', resolution: null, statut: 'en_cours', geste: null, ecrite: true, description: 'Trajet retour en minibus très long, pause non prévue' },
      { departId: 'malte-2026-11', rang: 2, motif: 'programme', ouverture: '2026-11-18', resolution: null, statut: 'ouverte', geste: null, ecrite: true, description: 'Visite de La Valette écourtée, attente d\'explications' },
    ]
    for (const c of cas) {
      const { contact, reservation } = voyageur(c.departId, c.rang)
      const reclamation = {
        id: this.r.uuid(),
        contact_id: contact.id,
        reservation_id: reservation.id,
        motif: c.motif,
        gravite: c.statut === 'resolue' ? ('faible' as const) : ('moyenne' as const),
        ecrite: c.ecrite,
        description: c.description,
        statut: c.statut,
        date_ouverture: c.ouverture,
        date_resolution: c.resolution,
        geste: c.geste,
        geste_valide_par: c.geste ? 'emilien' : null,
      }
      this.base.reclamations.push(reclamation)
      this.ev(contact, this.h(c.ouverture), 'reclamation', { process: '16', auteur: contact.referente_id, canal: c.ecrite ? 'email' : 'telephone', details: { motif: c.motif, statut: c.statut } })
      if (c.departId === 'hossegor-2026-10') {
        // Avis Google à 3 étoiles, réponse publique sous 24 h et réclamation associée (process 17 puis 16).
        reservation.incident_non_resolu = true
        this.base.avis.push({
          id: this.r.uuid(),
          contact_id: contact.id,
          plateforme: 'google',
          note: 3,
          texte: 'Séjour sympathique mais trajet retour interminable et mal organisé.',
          date: '2026-11-23',
          reponse: `Bonjour ${contact.prenom}, merci d'avoir partagé votre ressenti, nous le prenons très au sérieux. Nous aimerions en parler avec vous directement : votre référente vous contacte dès aujourd'hui. L'équipe Solia`,
          date_reponse: '2026-11-24',
          reclamation_id: reclamation.id,
        })
        this.ev(contact, '2026-11-23T21:10', 'avis', { process: '17', canal: 'google', details: { plateforme: 'google', note: 3 } })
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pipeline : Contacts, Prospects, Devis envoyés, Perdus
  // -------------------------------------------------------------------------

  /** Origines possibles pour une fiche créée sans demande (pas d'appel ni de visite). */
  private origineSansDemande(cible: Cible): Origine {
    return this.r.pondere(L.ORIGINES[cible].filter(([o]) => o !== 'appel_entrant' && o !== 'agence'))
  }

  private jour(nombreDeJoursAvant: number): DateISO {
    return this.ouvre(ajouterJours(REF, -nombreDeJoursAvant))
  }

  private departFuturPour(cible: Cible, sauf: string[] = []): Depart {
    const candidats = this.base.departs.filter(
      (d) => d.cible === cible && numeroJour(d.date_depart) > numeroJour(REF) + 20 && !sauf.includes(d.id),
    )
    return this.r.choix(candidats)
  }

  private personasPipeline(): void {
    // Marc Leroy : Contact, 22, Froid.
    const marc = this.creerContact({
      cible: 'celibataire',
      date: '2026-11-12T18:20',
      identite: { prenom: 'Marc', nom: 'Leroy', femme: false, dateNaissance: '1995-03-14', ville: 'Nantes' },
      origine: 'flyer_qr',
      newsletter: true,
      whatsapp: true,
      canal: 'whatsapp',
    })
    this.ev(marc, '2026-11-12T18:20', 'coordonnee_verifiee', { process: '01', canal: 'email', details: { coordonnee: 'email' } })
    this.ev(marc, '2026-11-16T12:40', 'clic_newsletter', { process: '01', canal: 'email', details: { lien: 'Offres célibataires' } })
    this.ev(marc, '2026-11-27T21:05', 'clic_newsletter', { process: '14', canal: 'email', details: { lien: 'Bleu Cyclades' } })
    this.personas.marc = marc

    // Monique Bernard : Devis envoyé, 77, Prêt à réserver.
    const malte = this.depart('malte-2027-01')
    const monique = this.creerContact({
      cible: 'senior',
      date: '2026-11-22T10:15',
      identite: { prenom: 'Monique', nom: 'Bernard', femme: true, dateNaissance: '1958-06-02', ville: 'La Roche-sur-Yon' },
      origine: 'appel_entrant',
      envie: malte.id,
      newsletter: false,
      whatsapp: false,
      canal: 'telephone',
    })
    this.ev(monique, '2026-11-22T10:15', 'appel_entrant', { process: '02', auteur: 'solveig', canal: 'telephone', details: { voyage: malte.offre, depart_id: malte.id, duree_minutes: 18 } })
    this.ev(monique, '2026-11-22T10:16', 'coordonnee_verifiee', { process: '02', auteur: 'solveig', canal: 'telephone', details: { coordonnee: 'telephone' } })
    this.changerStatut(monique, '2026-11-22T10:35', 'prospect', { process: '02', auteur: 'solveig' })
    this.ev(monique, '2026-11-25T14:30', 'rdv_accepte', { process: '03', auteur: 'solveig', canal: 'telephone', details: { date_rdv: '2026-11-27' } })
    this.ev(monique, '2026-11-27T10:00', 'rdv_realise', { process: '03', auteur: 'solveig', canal: 'agence', details: { duree_minutes: 30 } })
    monique.dispo_debut = '2027-01-04'
    monique.dispo_fin = '2027-02-28'
    monique.budget = 1600
    monique.craintes = 'Ne connaître personne'
    this.ev(monique, '2026-11-27T10:20', 'dates_confirmees', { process: '03', auteur: 'solveig', canal: 'agence', details: { du: '2027-01-04', au: '2027-02-28' } })
    this.ev(monique, '2026-11-27T10:20', 'budget_confirme', { process: '03', auteur: 'solveig', canal: 'agence', details: { budget: 1600 } })
    this.ev(monique, '2026-11-27T10:30', 'accord_devis', { process: '03', auteur: 'solveig', canal: 'agence' })
    this.base.devis.push({ id: this.r.uuid(), contact_id: monique.id, depart_id: malte.id, montant: 1490, date_envoi: '2026-11-27', date_fin_validite: '2026-12-27', statut: 'envoye' })
    this.ev(monique, '2026-11-27T15:00', 'devis_envoye', { process: '03', auteur: 'solveig', canal: 'email', details: { depart_id: malte.id, offre: malte.offre, montant: 1490, valable_jusqu_au: '2026-12-27' } })
    this.changerStatut(monique, '2026-11-27T15:00', 'devis_envoye', { process: '03', auteur: 'solveig' })
    this.ev(monique, '2026-11-30T09:30', 'relance_devis_aboutie', { process: '04', auteur: 'solveig', canal: 'telephone', details: { duree_minutes: 12 } })
    this.ev(monique, '2026-11-30T09:40', 'question_modalites', { process: '04', auteur: 'solveig', canal: 'telephone', details: { question: 'Paiement en chèques-vacances' } })
    this.personas.monique = monique

    // Sarah Martin : Prospect, parrainée par Julie Petit, 39, Tiède.
    const julie = this.personas.julie
    const sarah = this.creerContact({
      cible: 'parent_solo',
      date: '2026-11-20T13:05',
      identite: { prenom: 'Sarah', nom: 'Martin', femme: true, dateNaissance: '1988-04-21', ville: 'Challans' },
      parrain: julie,
      envie: 'lisbonne-2027-03',
      newsletter: true,
      whatsapp: true,
      canal: 'whatsapp',
    })
    sarah.compte_social = '@sarah.martin.85'
    this.ev(sarah, '2026-11-20T13:05', 'coordonnee_verifiee', { process: '01', canal: 'email', details: { coordonnee: 'email' } })
    this.ev(sarah, '2026-11-20T21:30', 'demande_ecrite', { process: '02', auteur: 'florentine', canal: 'instagram', details: { voyage: 'Parenthèse à Lisbonne', depart_id: 'lisbonne-2027-03', question: 'Le programme est-il adapté à un enfant de 7 ans ?' } })
    this.changerStatut(sarah, '2026-11-20T21:35', 'prospect', { process: '02', auteur: 'florentine' })
    this.repondre(sarah, '2026-11-20', 'instagram')
    this.base.parrainages.push({ id: this.r.uuid(), parrain_id: julie.id, filleul_id: sarah.id, recompense: null, date_recompense: null })
    this.personas.sarah = sarah
  }

  private pipelineGenere(parrainParent: Contact): void {
    const cibles: Cible[] = ['senior', 'parent_solo', 'celibataire']
    const cible = (i: number) => cibles[i % 3]

    // 11 Contacts froids : profil sans envie, au plus un clic.
    for (let i = 0; i < 11; i++) {
      const c = this.creerContact({ cible: cible(i), date: this.h(this.jour(this.r.entier(4, 55))), origine: this.origineSansDemande(cible(i)) })
      if (this.r.chance(0.8)) this.ev(c, this.plusTard(c.date_creation, 20), 'coordonnee_verifiee', { process: '01', canal: 'email', details: { coordonnee: 'email' } })
      if (this.r.chance(0.3)) {
        const clic = ajouterJours(c.date_creation, this.r.entier(2, 10))
        if (this.passe(clic)) this.ev(c, this.h(clic, 8, 22), 'clic_newsletter', { process: '01', canal: 'email' })
      }
    }

    // 8 Contacts tièdes : envie précise, consentements, clics récents (dont le filleul d'un parent abonné).
    for (let i = 0; i < 8; i++) {
      const c = this.creerContact({
        cible: i === 0 ? 'parent_solo' : cible(i),
        date: this.h(this.jour(this.r.entier(3, 25))),
        origine: this.origineSansDemande(i === 0 ? 'parent_solo' : cible(i)),
        parrain: i === 0 ? parrainParent : undefined,
        newsletter: true,
        whatsapp: true,
        verifieeACreation: true,
      })
      c.envie_depart_id = this.departFuturPour(c.cible, ['paris-2026-12']).id
      if (i === 0) {
        this.base.parrainages.push({ id: this.r.uuid(), parrain_id: parrainParent.id, filleul_id: c.id, recompense: null, date_recompense: null })
        continue
      }
      const creation = jour(c.date_creation)
      this.ev(c, this.h(this.auPlusTard(ajouterJours(creation, 2)), 8, 22), 'clic_bienvenue', { process: '01', canal: 'email' })
      this.ev(c, this.h(this.auPlusTard(ajouterJours(creation, this.r.entier(2, 8))), 8, 22), 'clic_newsletter', { process: '01', canal: 'email' })
      if (this.r.chance(0.5)) this.ev(c, this.h(this.auPlusTard(ajouterJours(creation, 1)), 8, 22), 'interaction_sociale', { process: '17', canal: 'instagram' })
    }

    // 3 Prospects tièdes : une demande écrite récente.
    for (let i = 0; i < 3; i++) {
      const c = this.creerContact({ cible: cible(i + 1), date: this.h(this.jour(this.r.entier(3, 12))), origine: this.origineSansDemande(cible(i + 1)), newsletter: true, verifieeACreation: true })
      const depart = this.departFuturPour(c.cible, ['paris-2026-12'])
      c.envie_depart_id = depart.id
      this.demandeEcrite(c, this.auPlusTard(ajouterJours(c.date_creation, this.r.entier(0, 2))), depart)
    }

    // 5 Prospects chauds : appel ou visite, découverte acceptée puis réalisée, dates confirmées.
    for (let i = 0; i < 5; i++) {
      const parAppel = this.r.chance(0.5)
      const c = this.creerContact({
        cible: cible(i),
        date: this.h(this.jour(this.r.entier(8, 13))),
        origine: parAppel ? 'appel_entrant' : 'agence',
        newsletter: true,
        whatsapp: true,
        verifieeACreation: true,
      })
      const depart = this.departFuturPour(c.cible, ['paris-2026-12'])
      c.envie_depart_id = depart.id
      const demande = jour(c.date_creation)
      this.demande(c, demande, parAppel ? 'appel_entrant' : 'visite_agence', depart)
      const accepte = this.ouvreApres(ajouterJours(demande, this.r.entier(1, 3)))
      const rdv = this.auPlusTard(this.ouvreApres(ajouterJours(accepte, this.r.entier(1, 3))))
      this.ev(c, this.h(accepte), 'rdv_accepte', { process: '03', auteur: 'solveig', canal: 'telephone', details: { date_rdv: rdv } })
      this.ev(c, this.h(rdv, 9, 12), 'rdv_realise', { process: '03', auteur: 'solveig', canal: 'agence', details: { duree_minutes: 25 } })
      c.dispo_debut = ajouterJours(depart.date_depart, -20)
      c.dispo_fin = ajouterJours(depart.date_retour, 20)
      this.ev(c, this.h(rdv, 12, 13), 'dates_confirmees', { process: '03', auteur: 'solveig', canal: 'agence', details: { du: c.dispo_debut, au: c.dispo_fin } })
      this.ev(c, this.h(this.auPlusTard(ajouterJours(rdv, 1)), 14, 18), 'note', { process: '03', auteur: 'solveig', canal: 'crm', details: { texte: 'Souhaite en parler à un proche avant le devis' } })
    }

    // Liste d'attente sur Paris Insolite de décembre (complet) : deux parents solos.
    const paris = this.depart('paris-2026-12')
    const parisFevrier = this.depart('paris-2027-02')
    const attente = [
      this.creerContact({ cible: 'parent_solo', date: '2026-11-07T11:30', origine: 'stand', newsletter: true, whatsapp: true, verifieeACreation: true, envie: paris.id }),
      this.creerContact({ cible: 'parent_solo', date: this.h(this.jour(9)), origine: 'site', newsletter: true, whatsapp: true, verifieeACreation: true, envie: paris.id }),
    ]
    // Le premier est prêt à réserver : appel, découverte, dates compatibles avec février, question sur l'acompte, venu au pique-nique ouvert à tous.
    const [a, b] = attente
    a.origine_detail = 'Rencontré(e) au pique-nique ouvert à tous du 07/11/2026'
    const appel = this.jour(12)
    this.demande(a, appel, 'appel_entrant', paris)
    this.ev(a, this.h(appel, 15, 17), 'liste_attente', { process: '04', auteur: 'solveig', canal: 'telephone', details: { depart_id: paris.id, message: 'M09' } })
    this.base.liste_attente.push({ id: this.r.uuid(), depart_id: paris.id, contact_id: a.id, date: appel })
    this.ev(a, this.h(this.jour(10)), 'rdv_accepte', { process: '03', auteur: 'solveig', canal: 'telephone', details: { date_rdv: this.jour(8) } })
    this.ev(a, this.h(this.jour(8), 9, 12), 'rdv_realise', { process: '03', auteur: 'solveig', canal: 'agence', details: { duree_minutes: 30 } })
    a.dispo_debut = '2026-12-01'
    a.dispo_fin = '2027-03-15'
    a.budget = 900
    this.ev(a, this.h(this.jour(8), 12, 13), 'dates_confirmees', { process: '03', auteur: 'solveig', canal: 'agence', details: { du: a.dispo_debut, au: a.dispo_fin, autre_depart: parisFevrier.id } })
    this.ev(a, this.h(this.jour(8), 12, 13), 'budget_confirme', { process: '03', auteur: 'solveig', canal: 'agence', details: { budget: 900 } })
    this.ev(a, this.h(this.jour(5)), 'question_modalites', { process: '04', auteur: 'solveig', canal: 'telephone', details: { question: 'Montant de l\'acompte' } })
    this.base.participations.push({ id: this.r.uuid(), activite_id: 'act-2026-11-07', contact_id: a.id, inscrit: true, present: true })

    // Le second est chaud : demande écrite, liste d'attente, réponse à la relance, découverte acceptée.
    this.demandeEcrite(b, jour(b.date_creation), paris)
    this.ev(b, this.h(jour(b.date_creation), 15, 17), 'liste_attente', { process: '04', auteur: 'solveig', canal: 'whatsapp', details: { depart_id: paris.id, message: 'M09' } })
    this.base.liste_attente.push({ id: this.r.uuid(), depart_id: paris.id, contact_id: b.id, date: jour(b.date_creation) })
    this.ev(b, this.h(this.jour(6)), 'reponse_relance', { process: '02', canal: 'whatsapp' })
    this.ev(b, this.h(this.jour(4)), 'rdv_accepte', { process: '03', auteur: 'solveig', canal: 'whatsapp', details: { date_rdv: '2026-12-02' } })
    this.ev(b, this.h(this.jour(7), 8, 22), 'interaction_sociale', { process: '17', canal: 'instagram' })
    this.ev(b, this.h(this.jour(3), 8, 22), 'clic_newsletter', { process: '14', canal: 'email' })

    // Un prospect prêt à réserver venu à l'agence.
    const pret = this.creerContact({ cible: 'senior', date: this.h(this.jour(6)), origine: 'agence', newsletter: true, whatsapp: true, verifieeACreation: true })
    const departPret = this.departFuturPour('senior')
    pret.envie_depart_id = departPret.id
    this.demande(pret, jour(pret.date_creation), 'visite_agence', departPret)
    this.ev(pret, this.h(this.jour(5)), 'reponse_relance', { process: '02', canal: 'telephone' })
    this.ev(pret, this.h(this.jour(5)), 'rdv_accepte', { process: '03', auteur: 'solveig', canal: 'telephone', details: { date_rdv: this.jour(3) } })
    this.ev(pret, this.h(this.jour(3), 9, 12), 'rdv_realise', { process: '03', auteur: 'solveig', canal: 'agence', details: { duree_minutes: 30 } })
    this.confirmerDatesEtBudget(pret, this.h(this.jour(3), 12, 13), departPret)
    this.ev(pret, this.h(this.jour(2)), 'question_modalites', { process: '04', auteur: 'solveig', canal: 'telephone', details: { question: 'Choix du binôme de chambre' } })

    // 7 Devis envoyés : 4 chauds, 2 prêts à réserver, 1 tiède (plus Monique).
    const profils: ('chaud' | 'pret' | 'tiede')[] = ['chaud', 'chaud', 'chaud', 'chaud', 'pret', 'pret', 'tiede']
    profils.forEach((profil, i) => {
      const ancien = profil === 'tiede'
      const demande = this.jour(ancien ? 55 : this.r.entier(10, 22))
      const c = this.creerContact({
        cible: cible(i),
        date: this.h(demande),
        origine: profil === 'chaud' ? this.origineSansDemande(cible(i)) : 'appel_entrant',
        newsletter: profil !== 'tiede',
        whatsapp: profil === 'pret',
        verifieeACreation: true,
      })
      const depart = this.departFuturPour(c.cible, ['paris-2026-12'])
      c.envie_depart_id = depart.id
      this.demande(c, demande, profil === 'chaud' ? 'demande_ecrite' : 'appel_entrant', depart)
      const accepte = this.ouvreApres(ajouterJours(demande, ancien ? 5 : this.r.entier(1, 3)))
      const rdv = this.ouvreApres(ajouterJours(accepte, ancien ? 17 : this.r.entier(1, 3)))
      const devis = ancien ? this.jour(28) : this.ouvreApres(ajouterJours(rdv, this.r.entier(0, 1)))
      this.ev(c, this.h(accepte), 'rdv_accepte', { process: '03', auteur: 'solveig', canal: 'telephone', details: { date_rdv: rdv } })
      this.ev(c, this.h(rdv, 9, 12), 'rdv_realise', { process: '03', auteur: 'solveig', canal: 'agence', details: { duree_minutes: 25 } })
      if (profil !== 'tiede') this.confirmerDatesEtBudget(c, this.h(rdv, 12, 13), depart, profil === 'pret')
      const accord = this.ev(c, devis === rdv ? this.h(rdv, 12, 13) : this.h(devis, 8, 9), 'accord_devis', { process: '03', auteur: 'solveig', canal: 'telephone' })
      this.envoyerDevis(c, devis, depart, undefined, accord.date)
      if (profil === 'pret') {
        const relance = this.auPlusTard(ajouterJours(devis, 3))
        this.ev(c, this.h(relance), 'relance_devis_aboutie', { process: '04', auteur: 'solveig', canal: 'telephone' })
        this.ev(c, this.h(relance), 'question_modalites', { process: '04', auteur: 'solveig', canal: 'telephone', details: { question: 'Paiement en chèques-vacances' } })
      }
    })

    // 10 Perdus : 4 sans réponse à J+14, 3 devis expirés, 3 refus.
    for (let i = 0; i < 4; i++) {
      const demande = this.jour(this.r.entier(20, 70))
      const c = this.creerContact({ cible: cible(i), date: this.h(demande), origine: this.origineSansDemande(cible(i)) })
      const depart = this.departFuturPour(c.cible)
      c.envie_depart_id = depart.id
      this.demandeEcrite(c, demande, depart)
      if (i === 0) {
        this.ev(c, this.h(ajouterJours(demande, 1)), 'coordonnee_invalide', { process: '02', canal: 'email', details: { coordonnee: 'email', raison: 'Rebond : adresse inexistante' } })
      } else {
        this.ev(c, this.h(ajouterJours(demande, 1)), 'coordonnee_verifiee', { process: '02', canal: 'email', details: { coordonnee: 'email' } })
      }
      this.changerStatut(c, `${ajouterJours(demande, 14)}T07:00`, 'perdu', { process: '02', motif: 'Sans réponse 14 jours après la demande' })
    }
    for (let i = 0; i < 3; i++) {
      const devis = this.jour(this.r.entier(35, 55))
      const demande = this.ouvre(ajouterJours(devis, -this.r.entier(5, 12)))
      const c = this.creerContact({ cible: cible(i + 2), date: this.h(demande), origine: 'appel_entrant', verifieeACreation: true })
      const depart = this.departFuturPour(c.cible)
      c.envie_depart_id = depart.id
      this.demande(c, demande, 'appel_entrant', depart)
      this.ev(c, this.h(ajouterJours(devis, -1)), 'rdv_realise', { process: '03', auteur: 'solveig', canal: 'agence', details: { duree_minutes: 20 } })
      this.ev(c, this.h(ajouterJours(devis, -1)), 'accord_devis', { process: '03', auteur: 'solveig', canal: 'agence' })
      this.envoyerDevis(c, devis, depart)
      const expiration = ajouterJours(devis, 30)
      const d = this.base.devis.find((x) => x.contact_id === c.id)
      if (d) d.statut = 'expire'
      this.ev(c, `${expiration}T07:00`, 'devis_expire', { process: '04', canal: 'email', details: { message: 'M08' } })
      this.changerStatut(c, `${expiration}T07:00`, 'perdu', { process: '04', motif: 'Devis expiré sans réponse' })
    }
    for (let i = 0; i < 3; i++) {
      const demande = this.jour(this.r.entier(12, 40))
      const c = this.creerContact({ cible: cible(i), date: this.h(demande), origine: 'appel_entrant', verifieeACreation: true })
      const depart = this.departFuturPour(c.cible)
      c.envie_depart_id = depart.id
      this.demande(c, demande, 'appel_entrant', depart)
      const refus = this.auPlusTard(ajouterJours(demande, this.r.entier(3, 9)))
      this.ev(c, this.h(refus), 'refus', { process: '02', auteur: 'solveig', canal: 'telephone', details: { motif: 'Pas pour le moment' } })
      this.changerStatut(c, this.h(refus, 18, 19), 'perdu', { process: '02', auteur: 'solveig', motif: 'Refus : pas pour le moment' })
    }
  }

  /** Réponse personnelle de Solveig le jour ouvré suivant la demande (process 02), sans tirage aléatoire. */
  private repondre(contact: Contact, date: DateISO, canal: Canal): void {
    let reponse = ajouterJours(date, 1)
    while (jourSemaine(reponse) === 0 || jourSemaine(reponse) === 6) reponse = ajouterJours(reponse, 1)
    if (!this.passe(reponse)) return
    this.ev(contact, `${reponse}T10:30`, 'reponse_personnelle', {
      process: '02',
      auteur: 'solveig',
      canal,
      details: { proposition: 'Rendez-vous découverte ou visite à l\'agence' },
    })
  }

  private demandeEcrite(contact: Contact, date: DateISO, depart: Depart): void {
    const canal = this.r.pondere([['site', 45], ['whatsapp', 30], ['email', 25]] as const)
    const horodatage = jour(contact.date_creation) === date ? this.plusTard(contact.date_creation, 10) : this.h(date, 8, 22)
    this.ev(contact, horodatage, 'demande_ecrite', {
      process: '02',
      canal,
      details: { voyage: depart.offre, depart_id: depart.id },
    })
    this.repondre(contact, date, canal)
    this.changerStatut(contact, this.plusTard(horodatage, 5), 'prospect', { process: '02', auteur: 'solveig' })
  }

  /**
   * Le moteur d'automatismes tourne au 30/11/2026, comme à l'ouverture du CRM : il crée les tâches et
   * les messages depuis sa mise en service (23/11). L'équipe a traité les tâches échues, sauf
   * quelques-unes laissées en retard pour la démonstration (TACHES_EN_RETARD).
   */
  private automatismes(): void {
    const nouvelId = () => this.r3.uuid()
    let base = appliquerChangements(this.base, runAutomations(this.base, REF, { nouvelId, tirage: () => this.r3.suivant() }), false)
    const echues = base.taches
      .filter((t) => t.statut === 'a_faire' && numeroJour(t.echeance) < numeroJour(REF))
      .sort((a, b) => (a.echeance === b.echeance ? (a.cle_unicite < b.cle_unicite ? -1 : 1) : a.echeance < b.echeance ? -1 : 1))
    const gardees = new Set<string>()
    for (const regle of TACHES_EN_RETARD) {
      const tache = echues.find((t) => t.regle_id === regle && !gardees.has(t.id) && (regle !== 'R06' || t.contact_id === this.personas.sarah.id))
      if (tache) gardees.add(tache.id)
    }
    // Les autres tâches échues ont été faites dans les délais, par leur responsable, message compris.
    const faites = echues
      .filter((t) => !gardees.has(t.id))
      .flatMap((t) => {
        const ecart = Math.max(0, ecartJours(t.date_declenchement, t.echeance))
        const date = ajouterJours(t.date_declenchement, this.r3.entier(0, ecart))
        const heure = date === jour(t.echeance) ? t.echeance.slice(11, 16) : `${this.r3.entier(9, 17)}:${this.r3.choix(['00', '15', '30', '45'])}`
        const faitLe = `${date}T${heure.padStart(5, '0')}` < t.date_declenchement ? t.date_declenchement : `${date}T${heure.padStart(5, '0')}`
        return terminerTache(base, t, { date: faitLe, auteur: t.responsable_id, nouvelId })
      })
    base = appliquerChangements(base, faites, false)
    Object.assign(this.base, base)
  }

  // -------------------------------------------------------------------------
  // Orchestration
  // -------------------------------------------------------------------------

  generer(): Base {
    this.voyageursPasses()
    this.abonnements()

    const pris = new Set<Contact>()
    const inactifs = new Map<Contact, DateISO | null>([
      [this.abonneLibre('irlande-2026-09', pris), '2026-10-20'], // sans activité depuis 41 jours
      [this.abonneLibre('cyclades-2026-09', pris), '2026-10-29'], // sans activité depuis 32 jours
      // Abonné le soir du Soli'apéro retour (30/09) et jamais revenu : plus de 60 jours sans activité.
      [this.abonneLibre('basque-2026-09', pris, (a) => a.date_debut === '2026-09-30'), null],
    ])
    const resilies = [this.abonneLibre('irlande-2026-09', pris), this.abonneLibre('basque-2026-09', pris)]
    const parrainSenior = this.abonneLibre('irlande-2026-09', pris)
    const parrainParent = this.abonneLibre('paris-2026-10', pris)
    const reacheteurs = {
      'perigord-2027-03': this.abonneLibre('perigord-2026-10', pris),
      'barcelone-2027-02': this.abonneLibre('hossegor-2026-10', pris),
      'basque-2027-05': this.abonneLibre('basque-2026-09', pris),
    }

    this.resiliations(resilies)
    this.participations({ inactifs, resilies: new Set(resilies) })
    this.presencesNonAbonnes()
    this.reservationsFutures({ parrainSenior, reacheteurs })
    this.annulations()
    this.binomes()
    this.reclamationsEtAvis()
    this.personasPipeline()
    this.pipelineGenere(parrainParent)

    this.base.evenements.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
    this.automatismes()
    this.base.evenements.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
    this.base.version_seed = empreinte(JSON.stringify({ ...this.base, version_seed: '' }))
    this.base.parametres[0].version_seed = this.base.version_seed
    return this.base
  }
}

/** Empreinte courte du contenu : change dès que le jeu de données change. */
function empreinte(texte: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < texte.length; i++) {
    const c = texte.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`
}

export function genererBase(): Base {
  return new Generateur().generer()
}
