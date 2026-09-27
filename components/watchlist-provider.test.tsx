import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoFalso } from '@/test/supabase-falso'

type AoMudarSessao = (evento: string, sessao: unknown) => void

const mocks = vi.hoisted(() => ({
  aoMudarSessao: undefined as AoMudarSessao | undefined,
  resultadoDaLista: { data: [], error: null } as ResultadoFalso,
  consultas: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  salvarNaLista: vi.fn(),
  removerDaLista: vi.fn(),
}))

vi.mock('@/lib/supabase/browser', async () => {
  const { consultaFalsa } = await import('@/test/supabase-falso')
  return {
    clienteNavegador: () => ({
      auth: {
        onAuthStateChange: (callback: AoMudarSessao) => {
          mocks.aoMudarSessao = callback
          return { data: { subscription: { unsubscribe: () => {} } } }
        },
        signOut: mocks.signOut,
      },
      from: (tabela: string) => {
        mocks.consultas(tabela)
        return consultaFalsa(mocks.resultadoDaLista).consulta
      },
    }),
  }
})

vi.mock('@/lib/watchlist/actions', () => ({
  salvarNaLista: mocks.salvarNaLista,
  removerDaLista: mocks.removerDaLista,
}))

import { WatchlistProvider, useWatchlist } from './watchlist-provider'

const ANA = { user: { id: 'usuario-1', email: 'ana@exemplo.com' } }

function montar() {
  return renderHook(() => useWatchlist(), { wrapper: WatchlistProvider })
}

function sessao(evento: string, valor: unknown) {
  act(() => mocks.aoMudarSessao?.(evento, valor))
}

beforeEach(() => {
  mocks.resultadoDaLista = { data: [], error: null }
  mocks.consultas.mockReset()
  mocks.salvarNaLista.mockReset()
  mocks.removerDaLista.mockReset()
  mocks.signOut.mockClear()
})

describe('useWatchlist', () => {
  it('fora do provider, não está pronto', () => {
    const { result } = renderHook(() => useWatchlist())

    expect(result.current.pronto).toBe(false)
    expect(result.current.ids).toEqual([])
  })

  it('não está pronto antes de saber se há sessão', () => {
    const { result } = montar()

    expect(result.current.pronto).toBe(false)
  })

  it('sem sessão, fica pronto e deslogado sem consultar a tabela', () => {
    const { result } = montar()

    sessao('INITIAL_SESSION', null)

    expect(result.current).toMatchObject({ pronto: true, logado: false, email: null, ids: [] })
    expect(mocks.consultas).not.toHaveBeenCalled()
  })

  it('com sessão, carrega os ids e o email', async () => {
    mocks.resultadoDaLista = { data: [{ movie_id: 550 }, { movie_id: 13 }], error: null }
    const { result } = montar()

    sessao('INITIAL_SESSION', ANA)
    expect(result.current.pronto).toBe(false)

    await waitFor(() => expect(result.current.pronto).toBe(true))
    expect(result.current).toMatchObject({
      logado: true,
      email: 'ana@exemplo.com',
      ids: [550, 13],
    })
    expect(mocks.consultas).toHaveBeenCalledWith('watchlist')
  })

  it('não relê a lista quando só o token foi renovado', async () => {
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    sessao('TOKEN_REFRESHED', ANA)

    expect(mocks.consultas).toHaveBeenCalledTimes(1)
  })

  it('salva na hora, antes da resposta do servidor', async () => {
    mocks.salvarNaLista.mockReturnValue(new Promise(() => {}))
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    act(() => result.current.alternar(550))

    expect(result.current.ids).toEqual([550])
    expect(mocks.salvarNaLista).toHaveBeenCalledWith(550)
  })

  it('desfaz quando o servidor recusa', async () => {
    mocks.salvarNaLista.mockResolvedValue({ ok: false, motivo: 'erro' })
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    act(() => result.current.alternar(550))

    await waitFor(() => expect(result.current.ids).toEqual([]))
  })

  it('desfaz quando a chamada falha na rede', async () => {
    mocks.salvarNaLista.mockRejectedValue(new Error('sem rede'))
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    act(() => result.current.alternar(550))

    await waitFor(() => expect(result.current.ids).toEqual([]))
  })

  it('tira da lista um filme já salvo', async () => {
    mocks.resultadoDaLista = { data: [{ movie_id: 550 }], error: null }
    mocks.removerDaLista.mockResolvedValue({ ok: true })
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.ids).toEqual([550]))

    act(() => result.current.alternar(550))

    expect(result.current.ids).toEqual([])
    expect(mocks.removerDaLista).toHaveBeenCalledWith(550)
  })

  it('recarregar relê a lista do banco', async () => {
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    mocks.resultadoDaLista = { data: [{ movie_id: 7 }], error: null }
    act(() => result.current.recarregar())

    await waitFor(() => expect(result.current.ids).toEqual([7]))
  })

  it('sair encerra a sessão no Supabase', async () => {
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)

    await act(() => result.current.sair())

    expect(mocks.signOut).toHaveBeenCalled()
  })

  it('ao sair, esquece os ids', async () => {
    mocks.resultadoDaLista = { data: [{ movie_id: 550 }], error: null }
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.ids).toEqual([550]))

    sessao('SIGNED_OUT', null)

    expect(result.current).toMatchObject({ pronto: true, logado: false, ids: [] })
  })
})
