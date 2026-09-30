import { describe, expect, it } from 'vitest'
import { MAXIMO_NA_LISTA, idValido, sanitizarIds } from './ids'

describe('idValido', () => {
  it.each([1, 550, 2_147_483_647])('aceita %s', (valor) => {
    expect(idValido(valor)).toBe(true)
  })

  it.each([0, -1, 1.5, Number.NaN, Infinity, 2_147_483_648, '550', null, undefined])(
    'recusa %s',
    (valor) => {
      expect(idValido(valor)).toBe(false)
    },
  )
})

describe('sanitizarIds', () => {
  it('mantém só inteiros positivos, sem repetição, na ordem original', () => {
    expect(sanitizarIds([550, 'x', 13, -4, 550, 1.5, 13, 7])).toEqual([550, 13, 7])
  })

  it(`corta em ${MAXIMO_NA_LISTA}`, () => {
    const muitos = Array.from({ length: 80 }, (_, i) => i + 1)
    expect(sanitizarIds(muitos)).toHaveLength(MAXIMO_NA_LISTA)
  })

  it('devolve lista vazia para o que não é array', () => {
    expect(sanitizarIds('550,13')).toEqual([])
    expect(sanitizarIds(null)).toEqual([])
    expect(sanitizarIds({ 0: 550 })).toEqual([])
  })
})
