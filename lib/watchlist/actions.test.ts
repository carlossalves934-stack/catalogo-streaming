import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clienteServidorFalso, type ResultadoFalso } from '@/test/supabase-falso'

const mocks = vi.hoisted(() => ({
  cliente: undefined as unknown,
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', async (original) => ({
  ...(await original<typeof import('@/lib/supabase/server')>()),
  criarClienteServidor: async () => mocks.cliente,
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { importarLista, removerDaLista, salvarNaLista } from './actions'

function preparar(opcoes: { usuarioId?: string | null; resultado?: ResultadoFalso } = {}) {
  const falso = clienteServidorFalso(opcoes)
  mocks.cliente = falso.cliente
  return falso
}

beforeEach(() => {
  mocks.revalidatePath.mockReset()
})

describe('salvarNaLista', () => {
  it('insere o filme na lista de quem está na sessão, sem erro se já estiver lá', async () => {
    const { cliente, chamadas } = preparar({ usuarioId: 'usuario-1' })

    expect(await salvarNaLista(550)).toEqual({ ok: true })

    expect(cliente.from).toHaveBeenCalledWith('watchlist')
    expect(chamadas).toEqual([
      {
        metodo: 'upsert',
        args: [
          { user_id: 'usuario-1', movie_id: 550 },
          { onConflict: 'user_id,movie_id', ignoreDuplicates: true },
        ],
      },
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/minha-lista')
  })

  it('recusa sem sessão, sem tocar no banco', async () => {
    const { cliente } = preparar({ usuarioId: null })

    expect(await salvarNaLista(550)).toEqual({ ok: false, motivo: 'sem-sessao' })
    expect(cliente.from).not.toHaveBeenCalled()
  })

  it.each([1.5, -1, 0, '550'])('recusa o id %s antes de abrir a sessão', async (id) => {
    const { cliente } = preparar()

    expect(await salvarNaLista(id as number)).toEqual({ ok: false, motivo: 'id-invalido' })
    expect(cliente.auth.getClaims).not.toHaveBeenCalled()
  })

  it('devolve erro e não revalida quando o banco falha', async () => {
    preparar({ resultado: { data: null, error: { message: 'falhou' } } })

    expect(await salvarNaLista(550)).toEqual({ ok: false, motivo: 'erro' })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('removerDaLista', () => {
  it('apaga só a linha deste usuário e deste filme', async () => {
    const { chamadas } = preparar({ usuarioId: 'usuario-1' })

    expect(await removerDaLista(550)).toEqual({ ok: true })

    expect(chamadas).toEqual([
      { metodo: 'delete', args: [] },
      { metodo: 'eq', args: ['user_id', 'usuario-1'] },
      { metodo: 'eq', args: ['movie_id', 550] },
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/minha-lista')
  })

  it('recusa sem sessão', async () => {
    preparar({ usuarioId: null })

    expect(await removerDaLista(550)).toEqual({ ok: false, motivo: 'sem-sessao' })
  })
})

describe('importarLista', () => {
  it('insere em lote os ids válidos, sem repetição', async () => {
    const { chamadas } = preparar({ usuarioId: 'usuario-1' })

    expect(await importarLista([550, 'x', 13, 550, -2])).toEqual({ ok: true })

    expect(chamadas).toEqual([
      {
        metodo: 'upsert',
        args: [
          [
            { user_id: 'usuario-1', movie_id: 550 },
            { user_id: 'usuario-1', movie_id: 13 },
          ],
          { onConflict: 'user_id,movie_id', ignoreDuplicates: true },
        ],
      },
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/minha-lista')
  })

  it('não toca no banco quando não sobra nenhum id válido', async () => {
    const { cliente } = preparar()

    expect(await importarLista(['x', -1])).toEqual({ ok: true })
    expect(cliente.from).not.toHaveBeenCalled()
  })

  it('recusa sem sessão', async () => {
    preparar({ usuarioId: null })

    expect(await importarLista([550])).toEqual({ ok: false, motivo: 'sem-sessao' })
  })
})
