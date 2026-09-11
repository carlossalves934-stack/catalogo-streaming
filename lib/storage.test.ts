import { afterEach, describe, expect, it, vi } from 'vitest'
import { PREFERENCIAS_PADRAO, readPreferences, writePreferences } from './storage'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('readPreferences', () => {
  it('devolve os padroes quando nao ha nada salvo', () => {
    expect(readPreferences()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('le o que foi escrito', () => {
    writePreferences({ providerIds: [8, 119], watchlist: [550], hasOnboarded: true })

    expect(readPreferences()).toEqual({
      providerIds: [8, 119],
      watchlist: [550],
      hasOnboarded: true,
    })
  })

  it('devolve os padroes quando o conteudo salvo nao e JSON valido', () => {
    window.localStorage.setItem('streaming-catalog:v1', 'isto nao e json')

    expect(readPreferences()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('descarta campos com o tipo errado', () => {
    // Um valor antigo ou corrompido nao pode derrubar o app.
    window.localStorage.setItem(
      'streaming-catalog:v1',
      JSON.stringify({ providerIds: 'oito', watchlist: null, hasOnboarded: 'sim' }),
    )

    expect(readPreferences()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('ignora entradas nao numericas dentro das listas', () => {
    window.localStorage.setItem(
      'streaming-catalog:v1',
      JSON.stringify({ providerIds: [8, 'x', 119], watchlist: [1, null], hasOnboarded: true }),
    )

    expect(readPreferences()).toEqual({
      providerIds: [8, 119],
      watchlist: [1],
      hasOnboarded: true,
    })
  })

  it('devolve os padroes quando o localStorage lanca excecao', () => {
    // Acontece em aba anonima com cookies bloqueados.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('acesso negado')
    })

    expect(readPreferences()).toEqual(PREFERENCIAS_PADRAO)
  })
})

describe('writePreferences', () => {
  it('nao lanca quando o localStorage esta indisponivel', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cota excedida')
    })

    expect(() =>
      writePreferences({ providerIds: [], watchlist: [], hasOnboarded: false }),
    ).not.toThrow()
  })
})
