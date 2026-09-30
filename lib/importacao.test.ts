import { afterEach, describe, expect, it } from 'vitest'
import { jaDecidiu, registrarDecisao } from './importacao'

afterEach(() => {
  window.localStorage.clear()
})

describe('decisão de importação', () => {
  it('ninguém decidiu ainda', () => {
    expect(jaDecidiu('usuario-1')).toBe(false)
  })

  it('vale por usuário: outra conta no mesmo navegador ainda não decidiu', () => {
    registrarDecisao('usuario-1')

    expect(jaDecidiu('usuario-1')).toBe(true)
    expect(jaDecidiu('usuario-2')).toBe(false)
  })

  it('registrar duas vezes não duplica', () => {
    registrarDecisao('usuario-1')
    registrarDecisao('usuario-1')

    expect(JSON.parse(window.localStorage.getItem('streaming-catalog:importacao-v1') ?? '')).toEqual([
      'usuario-1',
    ])
  })

  it('valor corrompido conta como ninguém decidiu', () => {
    window.localStorage.setItem('streaming-catalog:importacao-v1', '{não é json')

    expect(jaDecidiu('usuario-1')).toBe(false)
  })

  it('não mexe nas preferências (serviços e lista antiga)', () => {
    window.localStorage.setItem('streaming-catalog:v1', '{"watchlist":[550]}')

    registrarDecisao('usuario-1')

    expect(window.localStorage.getItem('streaming-catalog:v1')).toBe('{"watchlist":[550]}')
  })
})
