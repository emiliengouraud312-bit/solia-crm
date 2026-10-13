import { describe, expect, it } from 'vitest'
import { membreDuCompte } from './equipe'
import { EQUIPE } from './referentiel'

describe('membre de l\'équipe du compte connecté', () => {
  it('par l\'e-mail de démo, sans tenir compte des majuscules', () => {
    expect(membreDuCompte('Jezabel@Solia.demo', EQUIPE)?.id).toBe('jezabel')
    expect(membreDuCompte('jury@solia.demo', EQUIPE)?.id).toBe('jury')
  })

  it('par le prénom, si l\'équipe utilise d\'autres adresses', () => {
    expect(membreDuCompte('emilien.gouraud+lilou@gmail.com', EQUIPE)?.id).toBe('lilou')
    expect(membreDuCompte('solveig@agence-solia.fr', EQUIPE)?.id).toBe('solveig')
  })

  it('le membre choisi à la première connexion passe avant l\'adresse', () => {
    expect(membreDuCompte('marie.durand@gmail.com', EQUIPE, 'florentine')?.id).toBe('florentine')
    expect(membreDuCompte('jezabel@solia.demo', EQUIPE, 'lilou')?.id).toBe('lilou')
    expect(membreDuCompte('marie.durand@gmail.com', EQUIPE, 'inconnu')).toBeNull()
  })

  it('aucun membre pour une adresse inconnue', () => {
    expect(membreDuCompte('inconnu@exemple.fr', EQUIPE)).toBeNull()
    expect(membreDuCompte(null, EQUIPE)).toBeNull()
  })
})
