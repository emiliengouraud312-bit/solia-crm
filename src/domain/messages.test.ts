// Rendu des 41 modèles de messages (data/messages.json) sur le jeu de démonstration.
import { describe, expect, it } from 'vitest'
import seedJson from '../data/seed.generated.json'
import { rendreMessage, rendreTexte } from './messages'
import { MESSAGES } from './referentiel'
import type { Base } from './types'

const base = seedJson as unknown as Base
const voyageuse = base.contacts.find((c) => `${c.prenom} ${c.nom}` === 'Jacqueline Morel')!
const reservation = base.reservations.find((r) => r.contact_id === voyageuse.id)!

describe('rendu des messages', () => {
  it('une variable sans valeur s\'affiche entre crochets, jamais vide', () => {
    expect(rendreTexte('Votre lien : {{lien_enquete}}, {{prenom}}', { prenom: 'Monique', lien_enquete: null })).toBe('Votre lien : [lien_enquete], Monique')
  })

  it('les 41 modèles se rendent sans variable brute ni tiret long', () => {
    expect(MESSAGES).toHaveLength(41)
    for (const modele of MESSAGES) {
      const rendu = rendreMessage(modele.code, { base, contact: voyageuse, date: '2026-11-30T10:00', reservation })
      const texte = `${rendu.objet ?? ''}\n${rendu.corps}`
      expect(texte, modele.code).not.toMatch(/\{\{|\}\}/)
      expect(texte, modele.code).not.toMatch(/[\u2014\u2013]/)
      expect(rendu.expediteur, modele.code).not.toBe('')
    }
  })

  it('M01 : bienvenue personnelle, signée par la référente, au canal préféré', () => {
    const rendu = rendreMessage('M01', { base, contact: voyageuse, date: '2026-11-30T10:00' })
    expect(rendu.corps).toContain(voyageuse.prenom)
    expect(rendu.expediteur).toBe('Jezabel')
  })

  it('M10 : la confirmation reprend les montants de la réservation au format 1 490', () => {
    const rendu = rendreMessage('M10', { base, contact: voyageuse, date: '2026-11-30T10:00', reservation })
    expect(rendu.corps).not.toContain('[montant_acompte]')
    expect(rendu.corps).toMatch(/\d{1,3}( \d{3})* €|\d+ €/)
  })
})
