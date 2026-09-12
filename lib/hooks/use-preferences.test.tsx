import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PREFERENCIAS_PADRAO, writePreferences } from '@/lib/storage'
import { usePreferences } from './use-preferences'

describe('usePreferences', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('com localStorage vazio, sinaliza hydrated quando os padroes estao prontos', async () => {
    const { result } = renderHook(() => usePreferences())

    // Esperar que hydrated seja true; neste momento preferences deve estar nos padroes
    // e nenhuma mudança pendente.
    await waitFor(() => {
      expect(result.current.hydrated).toBe(true)
    })

    // Verificar que preferences estão nos padrões quando hydrated fica true
    expect(result.current.preferences).toEqual(PREFERENCIAS_PADRAO)
  })

  it('carrega preferencias salvas e sinaliza hydrated no mesmo render', async () => {
    // Preparar uma preferência salva antes de render
    const saved = { providerIds: [8, 119], watchlist: [550], hasOnboarded: true }
    writePreferences(saved)

    const { result } = renderHook(() => usePreferences())

    // Esperar que hydrated seja true
    await waitFor(() => {
      expect(result.current.hydrated).toBe(true)
    })

    // Verificar que preferences também foi carregado no MESMO render
    // Se setHydrated(true) for em um efeito separado e setTimeout atrasar o carregamento,
    // haveria um render onde hydrated=true mas preferences=PREFERENCIAS_PADRAO,
    // o que seria a violação do invariante que Task 9 depende para evitar
    // perda de dados (usuário retornando vê seleção vazia e sobrescreve suas escolhas).
    expect(result.current.preferences).toEqual(saved)
  })

  it('propaga toggleWatchlist de uma instancia para outra instancia montada', async () => {
    // Finding 1 da revisão da Task 14: cada usePreferences() era um
    // useState isolado — escrever numa instância (um botão de watchlist)
    // nunca chegava a outra (a tela Minha Lista) até a página recarregar.
    // Este teste monta duas instâncias independentes, uma que grava e outra
    // que só observa, e falha se a segunda não reagir.
    const instanciaA = renderHook(() => usePreferences())
    const instanciaB = renderHook(() => usePreferences())

    await waitFor(() => {
      expect(instanciaA.result.current.hydrated).toBe(true)
      expect(instanciaB.result.current.hydrated).toBe(true)
    })

    instanciaA.result.current.toggleWatchlist(550)

    await waitFor(() => {
      expect(instanciaB.result.current.preferences.watchlist).toEqual([550])
    })
    expect(instanciaA.result.current.preferences.watchlist).toEqual([550])

    instanciaA.result.current.toggleWatchlist(550)

    await waitFor(() => {
      expect(instanciaB.result.current.preferences.watchlist).toEqual([])
    })
  })
})
