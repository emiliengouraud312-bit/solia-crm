// Le jeu de démonstration respecte docs/03-donnees-fictives.md et les critères de recette (section 10 du cahier des charges).
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed.generated.json'
import { ecartJours, jour as jourDe, numeroJour } from '../domain/dates'
import { indexerBase, planningDe } from '../domain/donneesContact'
import { placesRestantes } from '../domain/planning'
import { computeConversion, computeEngagement, scorePrincipal } from '../domain/scoring'
import type { Base } from '../domain/types'
import { genererBase } from './generer'

const base = seedJson as unknown as Base
const REF = '2026-11-30'
const donnees = indexerBase(base)
const planning = planningDe(base)

function contact(prenomNom: string) {
  const trouve = base.contacts.find((c) => `${c.prenom} ${c.nom}` === prenomNom)
  if (!trouve) throw new Error(`${prenomNom} absent du seed`)
  return trouve
}

describe('génération du seed', () => {
  it('est déterministe et le fichier généré est à jour (sinon lancer npm run seed)', () => {
    expect(JSON.parse(JSON.stringify(genererBase()))).toEqual(base)
  })

  it('reprend les référentiels de data/ et la date de démo', () => {
    expect(base.equipe).toHaveLength(6)
    expect(base.departs).toHaveLength(36)
    expect(base.activites).toHaveLength(52)
    expect(base.parametres[0].date_reference).toBe(REF)
  })
})

describe('personas fixes au 30/11/2026', () => {
  it('Marc Leroy : 22, Froid', () => {
    const s = scorePrincipal(donnees(contact('Marc Leroy').id), planning, REF)
    expect([s.type, s.score, s.palier]).toEqual(['conversion', 22, 'Froid'])
  })

  it('Monique Bernard : 77, Prêt à réserver, statut Devis envoyé', () => {
    const monique = contact('Monique Bernard')
    expect(monique.statut).toBe('devis_envoye')
    const s = scorePrincipal(donnees(monique.id), planning, REF)
    expect([s.type, s.score, s.palier]).toEqual(['conversion', 77, 'Prêt à réserver'])
  })

  it('Sarah Martin : 39, Tiède, parrainée par Julie Petit', () => {
    const sarah = contact('Sarah Martin')
    expect(sarah.parrain_id).toBe(contact('Julie Petit').id)
    const s = scorePrincipal(donnees(sarah.id), planning, REF)
    expect([s.type, s.score, s.palier]).toEqual(['conversion', 39, 'Tiède'])
  })

  it('Jacqueline Morel : abonnée, 81, Fidèle', () => {
    const jacqueline = contact('Jacqueline Morel')
    expect(jacqueline.statut).toBe('abonne')
    const s = scorePrincipal(donnees(jacqueline.id), planning, REF)
    expect([s.type, s.score, s.palier]).toEqual(['engagement', 81, 'Fidèle'])
  })

  it('Thomas Garnier : abonné, Ambassadeur, son filleul a réglé son acompte pour Barcelone en décembre', () => {
    const thomas = contact('Thomas Garnier')
    expect(thomas.ambassadeur).toBe(true)
    const parrainage = base.parrainages.find((p) => p.parrain_id === thomas.id)
    const resa = base.reservations.find((r) => r.contact_id === parrainage?.filleul_id)
    expect(resa?.depart_id).toBe('barcelone-2026-12')
    expect(resa?.acompte_date && numeroJour(resa.acompte_date) <= numeroJour(REF)).toBe(true)
  })

  it('Monique vise Lumières de Malte de janvier : la totalité sera exigible (moins de 60 jours)', () => {
    const monique = contact('Monique Bernard')
    const depart = base.departs.find((d) => d.id === monique.envie_depart_id)
    expect(depart?.id).toBe('malte-2027-01')
    expect(ecartJours(REF, depart?.date_depart ?? REF)).toBeLessThan(60)
  })
})

describe('volumes', () => {
  const passes = base.reservations.filter((r) => {
    const d = base.departs.find((x) => x.id === r.depart_id)
    return d && numeroJour(d.date_retour) <= numeroJour(REF) && r.statut !== 'annulee'
  })
  const futures = base.reservations.filter((r) => {
    const d = base.departs.find((x) => x.id === r.depart_id)
    return d && numeroJour(d.date_depart) > numeroJour(REF) && r.statut !== 'annulee'
  })
  const pipeline = base.contacts.filter(
    (c) => ['contact', 'prospect', 'devis_envoye', 'perdu'].includes(c.statut) && !base.reservations.some((r) => r.contact_id === c.id),
  )

  it('110 à 130 voyageurs sur les 9 départs passés, remplis de 60 à 85 %', () => {
    expect(passes.length).toBeGreaterThanOrEqual(110)
    expect(passes.length).toBeLessThanOrEqual(130)
    for (const d of base.departs.filter((x) => numeroJour(x.date_retour) <= numeroJour(REF))) {
      const taux = passes.filter((r) => r.depart_id === d.id).length / d.places_max
      expect(taux).toBeGreaterThanOrEqual(0.6)
      expect(taux).toBeLessThanOrEqual(0.85)
    }
  })

  it('70 à 90 réservations sur les départs à venir', () => {
    expect(futures.length).toBeGreaterThanOrEqual(70)
    expect(futures.length).toBeLessThanOrEqual(90)
  })

  it('un pipeline de 45 à 55 fiches : 20 Contacts, 12 Prospects, 8 Devis envoyés, 10 Perdus', () => {
    const compte = (statut: string) => pipeline.filter((c) => c.statut === statut).length
    expect(pipeline.length).toBeGreaterThanOrEqual(45)
    expect(pipeline.length).toBeLessThanOrEqual(55)
    expect([compte('contact'), compte('prospect'), compte('devis_envoye'), compte('perdu')]).toEqual([20, 12, 8, 10])
  })

  it('paliers du pipeline proches de 45 % Froid, 25 % Tiède, 20 % Chaud, 10 % Prêt à réserver', () => {
    const paliers: Record<string, number> = {}
    for (const c of pipeline) {
      const palier = computeConversion(donnees(c.id), planning, REF).palier
      paliers[palier] = (paliers[palier] ?? 0) + 1
    }
    const part = (palier: string) => (paliers[palier] ?? 0) / pipeline.length
    expect(part('Froid')).toBeCloseTo(0.45, 1)
    expect(part('Tiède')).toBeCloseTo(0.25, 1)
    expect(part('Chaud')).toBeCloseTo(0.2, 1)
    expect(part('Prêt à réserver')).toBeCloseTo(0.1, 1)
  })

  it('30 à 40 abonnés, dont 2 résiliations', () => {
    const abonnes = base.abonnements.filter((a) => a.decision === 'abonne')
    expect(abonnes.length).toBeGreaterThanOrEqual(30)
    expect(abonnes.length).toBeLessThanOrEqual(40)
    expect(abonnes.filter((a) => a.date_fin && a.motif_resiliation)).toHaveLength(2)
    expect(base.contacts.filter((c) => c.statut === 'ancien_abonne')).toHaveLength(2)
  })
})

describe('situations à inclure pour la démo', () => {
  it('notes à chaud : environ 60 % de 9 ou 10, 30 % de 7 ou 8, 10 % de 6 ou moins', () => {
    const notes = base.reservations.map((r) => r.note_chaud).filter((n): n is number => n !== null)
    const part = (filtre: (n: number) => boolean) => notes.filter(filtre).length / notes.length
    expect(part((n) => n >= 9)).toBeCloseTo(0.6, 1)
    expect(part((n) => n === 7 || n === 8)).toBeCloseTo(0.3, 1)
    expect(part((n) => n <= 6)).toBeCloseTo(0.1, 1)
  })

  it('environ un tiers des 9 et 10 ont publié un avis Google', () => {
    const recommandeurs = base.enquetes.filter((e) => (e.nps ?? 0) >= 9)
    const part = recommandeurs.filter((e) => e.avis_google_publie).length / recommandeurs.length
    expect(part).toBeGreaterThan(0.25)
    expect(part).toBeLessThan(0.42)
  })

  it('Paris Insolite de décembre est complet (16 sur 16) avec 2 personnes en liste d\'attente', () => {
    const paris = base.departs.find((d) => d.id === 'paris-2026-12')
    expect(paris && placesRestantes(paris, base.reservations, REF)).toBe(0)
    expect(base.liste_attente.filter((l) => l.depart_id === 'paris-2026-12')).toHaveLength(2)
  })

  it('un solde en retard sur un départ de janvier, avec mise en demeure', () => {
    const retards = base.reservations.filter((r) => r.mise_en_demeure_date && !r.solde_date)
    expect(retards).toHaveLength(1)
    expect(retards[0].depart_id.endsWith('2027-01')).toBe(true)
  })

  it('4 réclamations : 2 résolues sous 7 jours, 1 en cours, 1 ouverte depuis plus de 7 jours', () => {
    const r = base.reclamations
    expect(r).toHaveLength(4)
    expect(r.filter((x) => x.statut === 'resolue' && x.date_resolution && ecartJours(x.date_ouverture, x.date_resolution) <= 7)).toHaveLength(2)
    expect(r.filter((x) => x.statut === 'en_cours')).toHaveLength(1)
    expect(r.filter((x) => x.statut === 'ouverte' && ecartJours(x.date_ouverture, REF) > 7)).toHaveLength(1)
  })

  it('1 avis Google à 3 étoiles avec réponse publique et réclamation associée', () => {
    const negatifs = base.avis.filter((a) => a.note <= 3)
    expect(negatifs).toHaveLength(1)
    expect(negatifs[0].reponse).toBeTruthy()
    expect(base.reclamations.some((r) => r.id === negatifs[0].reclamation_id)).toBe(true)
  })

  it('2 annulations (plus de 60 jours, entre 30 et 15 jours) et 1 report', () => {
    const annulees = base.reservations.filter((r) => r.statut === 'annulee')
    const joursAvant = annulees.map((r) => {
      const d = base.departs.find((x) => x.id === r.depart_id)
      return ecartJours(r.annulation_date ?? REF, d?.date_depart ?? REF)
    })
    expect(joursAvant.some((j) => j > 60)).toBe(true)
    expect(joursAvant.some((j) => j >= 15 && j <= 30)).toBe(true)
    expect(base.reservations.filter((r) => r.report_utilise)).toHaveLength(1)
  })

  it('3 abonnés sans activité depuis plus de 30 jours, dont 1 depuis plus de 60 jours', () => {
    const jours = base.abonnements
      .filter((a) => a.decision === 'abonne' && a.date_debut && !a.date_fin)
      .map((a) => {
        const presences = base.participations
          .filter((p) => p.contact_id === a.contact_id && p.present === true)
          .map((p) => base.activites.find((x) => x.id === p.activite_id)?.date ?? '')
          .filter((d) => d && numeroJour(d) <= numeroJour(REF))
        const derniere = [a.date_debut as string, ...presences].sort().reverse()[0]
        return ecartJours(derniere, REF)
      })
    expect(jours.filter((j) => j > 30)).toHaveLength(3)
    expect(jours.filter((j) => j > 60)).toHaveLength(1)
  })

  it('4 parrainages, dont 2 avec acompte du filleul encaissé (badge Ambassadeur)', () => {
    expect(base.parrainages).toHaveLength(4)
    const avecAcompte = base.parrainages.filter((p) =>
      base.reservations.some((r) => r.contact_id === p.filleul_id && numeroJour(r.acompte_date) <= numeroJour(REF)),
    )
    expect(avecAcompte).toHaveLength(2)
    expect(base.contacts.filter((c) => c.ambassadeur)).toHaveLength(2)
  })

  it('le Séjour Barcelonnais de novembre est rentré le 29/11 : ses voyageurs sont Voyageurs', () => {
    const voyageurs = base.reservations.filter((r) => r.depart_id === 'barcelone-2026-11')
    expect(voyageurs.length).toBeGreaterThan(0)
    for (const r of voyageurs) {
      expect(base.contacts.find((c) => c.id === r.contact_id)?.statut).toBe('voyageur')
    }
  })

  it('chaque client voyageur a un score d\'engagement calculable', () => {
    const voyageurs = base.contacts.filter((c) => c.statut === 'voyageur')
    for (const c of voyageurs) {
      expect(computeEngagement(donnees(c.id), planning, REF).score).not.toBeNull()
    }
  })
})

describe('cohérence du jeu de données', () => {
  it('rien n\'est daté après le 30/11/2026, sauf le planifié', () => {
    const apres = (date: string) => numeroJour(date) > numeroJour(REF)
    expect(base.evenements.filter((e) => apres(e.date))).toEqual([])
    expect(base.consentements.filter((c) => apres(c.date))).toEqual([])
    expect(base.contacts.filter((c) => apres(c.date_creation))).toEqual([])
    expect(base.reservations.filter((r) => apres(r.date_reservation) || (r.solde_date && apres(r.solde_date)))).toEqual([])
    expect(base.enquetes.filter((e) => apres(e.date))).toEqual([])
    expect(base.avis.filter((a) => apres(a.date))).toEqual([])
  })

  it('le statut de chaque fiche correspond au dernier changement de statut du journal', () => {
    for (const c of base.contacts) {
      const changements = base.evenements.filter((e) => e.contact_id === c.id && e.type === 'statut')
      const dernier = changements.length ? (changements[changements.length - 1].details.vers as string) : 'contact'
      expect(dernier, `${c.prenom} ${c.nom}`).toBe(c.statut)
    }
  })

  it('chronologie de chaque fiche : création, puis demande, puis devis, puis réservation', () => {
    const demandes = ['demande_ecrite', 'appel_entrant', 'visite_agence']
    for (const c of base.contacts) {
      const journal = base.evenements.filter((e) => e.contact_id === c.id)
      expect(journal[0]?.type, `${c.prenom} ${c.nom}`).toBe('creation')
      const premiereDemande = journal.find((e) => demandes.includes(e.type))
      const premierDevis = journal.find((e) => e.type === 'devis_envoye')
      if (premierDevis) expect(premiereDemande && premiereDemande.date <= premierDevis.date, `${c.prenom} ${c.nom}`).toBe(true)
      const premierRdv = journal.find((e) => e.type === 'rdv_realise')
      if (premierRdv && premiereDemande) expect(premiereDemande.date <= premierRdv.date, `${c.prenom} ${c.nom}`).toBe(true)
      for (const r of base.reservations.filter((x) => x.contact_id === c.id)) {
        const devis = journal.find((e) => e.type === 'devis_envoye' && e.details.depart_id === (r.depart_initial_id ?? r.depart_id))
        if (devis) expect(jourDe(devis.date) <= r.date_reservation, `${c.prenom} ${c.nom}`).toBe(true)
      }
    }
  })

  it('la référente correspond à la cible', () => {
    const referentes = { senior: 'jezabel', celibataire: 'lilou', parent_solo: 'solveig' }
    expect(base.contacts.every((c) => c.referente_id === referentes[c.cible])).toBe(true)
  })

  it('coordonnées visiblement fictives et codes parrain uniques', () => {
    expect(base.contacts.every((c) => c.email?.endsWith('@exemple.fr') && c.telephone?.startsWith('06 00 '))).toBe(true)
    const codes = base.contacts.map((c) => c.code_parrain).filter(Boolean)
    expect(new Set(codes).size).toBe(codes.length)
    expect(new Set(base.contacts.map((c) => `${c.prenom} ${c.nom}`)).size).toBe(base.contacts.length)
  })

  it('le code critère de chaque événement est celui de la table de correspondance', async () => {
    const { critereDeLEvenement } = await import('../domain/criteres')
    expect(base.evenements.every((e) => e.code_critere === critereDeLEvenement(e))).toBe(true)
  })
})
