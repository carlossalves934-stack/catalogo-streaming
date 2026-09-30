import { describe, expect, it, vi } from 'vitest'
import { clienteServidorFalso, type ResultadoFalso } from '@/test/supabase-falso'

const mocks = vi.hoisted(() => ({ cliente: undefined as unknown }))

vi.mock('@/lib/supabase/server', async (original) => ({
  ...(await original<typeof import('@/lib/supabase/server')>()),
  criarClienteServidor: async () => mocks.cliente,
}))

import { lerMinhaLista } from './leitura'

function preparar(opcoes: { usuarioId?: string | null; resultado?: ResultadoFalso } = {}) {
  const falso = clienteServidorFalso(opcoes)
  mocks.cliente = falso.cliente
  return falso
}

describe('lerMinhaLista', () => {
  it('sem sessão, diz que não está logado e não consulta a tabela', async () => {
    const { cliente } = preparar({ usuarioId: null })

    expect(await lerMinhaLista()).toEqual({ logado: false })
    expect(cliente.from).not.toHaveBeenCalled()
  })

  it('com sessão, lê os ids na ordem em que foram salvos, até 50', async () => {
    const { chamadas } = preparar({
      usuarioId: 'usuario-1',
      resultado: { data: [{ movie_id: 550 }, { movie_id: 13 }], error: null },
    })

    expect(await lerMinhaLista()).toEqual({
      logado: true,
      usuarioId: 'usuario-1',
      ids: [550, 13],
      erro: false,
    })
    expect(chamadas).toEqual([
      { metodo: 'select', args: ['movie_id'] },
      { metodo: 'order', args: ['created_at', { ascending: true }] },
      { metodo: 'order', args: ['movie_id', { ascending: true }] },
      { metodo: 'limit', args: [50] },
    ])
  })

  it('com falha do banco, sinaliza erro com lista vazia', async () => {
    preparar({ resultado: { data: null, error: { message: 'falhou' } } })

    expect(await lerMinhaLista()).toEqual({
      logado: true,
      usuarioId: 'usuario-1',
      ids: [],
      erro: true,
    })
  })
})
