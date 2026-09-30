// @vitest-environment node
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type CookieParaGravar = { name: string; value: string; options: Record<string, unknown> }
type SetAll = (cookies: CookieParaGravar[], cabecalhos: Record<string, string>) => void

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  setAll: undefined as SetAll | undefined,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _chave: string, opcoes: { cookies: { setAll: SetAll } }) => {
    mocks.setAll = opcoes.cookies.setAll
    return { auth: { getClaims: mocks.getClaims } }
  },
}))

import { atualizarSessao } from './proxy'

const LOGADO = { data: { claims: { sub: 'usuario-1' } }, error: null }
const DESLOGADO = { data: null, error: null }

function pedido(caminho: string) {
  return new NextRequest(new URL(caminho, 'http://localhost:3000'))
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
  mocks.getClaims.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('atualizarSessao', () => {
  it('deixa a home passar sem sessão', async () => {
    mocks.getClaims.mockResolvedValue(DESLOGADO)

    const resposta = await atualizarSessao(pedido('/'))

    expect(resposta.headers.get('location')).toBeNull()
  })

  it('manda /minha-lista sem sessão para /entrar, guardando o destino', async () => {
    mocks.getClaims.mockResolvedValue(DESLOGADO)

    const resposta = await atualizarSessao(pedido('/minha-lista'))

    const destino = new URL(resposta.headers.get('location') ?? '')
    expect(resposta.status).toBe(307)
    expect(destino.pathname).toBe('/entrar')
    expect(destino.searchParams.get('proximo')).toBe('/minha-lista')
  })

  it('deixa /minha-lista passar com sessão', async () => {
    mocks.getClaims.mockResolvedValue(LOGADO)

    const resposta = await atualizarSessao(pedido('/minha-lista'))

    expect(resposta.headers.get('location')).toBeNull()
  })

  it('grava na resposta os cookies e cabeçalhos que o Supabase renovou', async () => {
    mocks.getClaims.mockImplementation(async () => {
      mocks.setAll?.([{ name: 'sb-token', value: 'novo', options: { path: '/' } }], {
        'Cache-Control': 'private, no-store',
      })
      return LOGADO
    })

    const resposta = await atualizarSessao(pedido('/explorar'))

    expect(resposta.cookies.get('sb-token')?.value).toBe('novo')
    expect(resposta.headers.get('cache-control')).toBe('private, no-store')
  })

  it('leva os cookies renovados junto no redirecionamento', async () => {
    // Sessão expirada que o Supabase limpou: o cookie limpo tem de chegar
    // ao navegador mesmo quando a resposta é um redirecionamento.
    mocks.getClaims.mockImplementation(async () => {
      mocks.setAll?.([{ name: 'sb-token', value: '', options: { path: '/', maxAge: 0 } }], {
        'Cache-Control': 'private, no-store',
      })
      return DESLOGADO
    })

    const resposta = await atualizarSessao(pedido('/minha-lista'))

    expect(resposta.headers.get('location')).not.toBeNull()
    expect(resposta.cookies.get('sb-token')?.value).toBe('')
    expect(resposta.headers.get('cache-control')).toBe('private, no-store')
  })
})
