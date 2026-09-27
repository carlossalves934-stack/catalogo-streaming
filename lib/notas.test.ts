import { describe, expect, it } from 'vitest'
import { NOTAS_DISPONIVEIS, notaDaUrl } from './notas'

describe('NOTAS_DISPONIVEIS', () => {
  it('inclui 7.5, a nota usada pelos trilhos curados da home', () => {
    // Um <select> controlado cujo valor nao bate com nenhuma opcao some sem
    // aviso, escondendo o filtro que o usuario precisaria limpar.
    expect(NOTAS_DISPONIVEIS).toContain(7.5)
  })
})

describe('notaDaUrl', () => {
  it('devolve undefined quando o parametro esta ausente', () => {
    expect(notaDaUrl(undefined)).toBeUndefined()
  })

  it('devolve undefined para string vazia', () => {
    expect(notaDaUrl('')).toBeUndefined()
  })

  it('devolve o numero quando o valor e uma das notas oferecidas', () => {
    expect(notaDaUrl('8')).toBe(8)
  })

  it('aceita a nota fracionaria 7.5', () => {
    expect(notaDaUrl('7.5')).toBe(7.5)
  })

  it('ignora valor nao numerico em vez de mandar NaN ao TMDB', () => {
    expect(notaDaUrl('abc')).toBeUndefined()
  })

  it('ignora nota negativa', () => {
    expect(notaDaUrl('-3')).toBeUndefined()
  })

  it('ignora nota fora da lista oferecida pelo seletor', () => {
    // 9.9 filtraria de verdade enquanto o <select> exibiria "Qualquer":
    // o usuario veria uma home quase vazia sem enxergar o filtro que a
    // esvaziou, e sem controle para desfaze-lo.
    expect(notaDaUrl('9.9')).toBeUndefined()
  })
})
