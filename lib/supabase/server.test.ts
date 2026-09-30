import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { clienteServidorFalso } from '@/test/supabase-falso'
import { idDoUsuario } from './server'

function comoCliente(cliente: unknown) {
  return cliente as SupabaseClient
}

describe('idDoUsuario', () => {
  it('devolve o id (sub) de quem está na sessão', async () => {
    const { cliente } = clienteServidorFalso({ usuarioId: 'usuario-42' })

    expect(await idDoUsuario(comoCliente(cliente))).toBe('usuario-42')
  })

  it('devolve null sem sessão', async () => {
    const { cliente } = clienteServidorFalso({ usuarioId: null })

    expect(await idDoUsuario(comoCliente(cliente))).toBeNull()
  })
})
