import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { TmdbError, tmdbFetch } from './client'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
  process.env.TMDB_ACCESS_TOKEN = 'token-de-teste'
})

describe('tmdbFetch', () => {
  it('envia o token no header Authorization', async () => {
    let recebido: string | null = null
    server.use(
      http.get('https://api.themoviedb.org/3/teste', ({ request }) => {
        recebido = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )

    await tmdbFetch('/teste', { revalidate: 60 })

    expect(recebido).toBe('Bearer token-de-teste')
  })

  it('aplica o idioma pt-BR em toda requisicao', async () => {
    let url = ''
    server.use(
      http.get('https://api.themoviedb.org/3/teste', ({ request }) => {
        url = request.url
        return HttpResponse.json({ ok: true })
      }),
    )

    await tmdbFetch('/teste', { revalidate: 60 })

    expect(new URL(url).searchParams.get('language')).toBe('pt-BR')
  })

  it('serializa os parametros e ignora os indefinidos', async () => {
    let url = ''
    server.use(
      http.get('https://api.themoviedb.org/3/teste', ({ request }) => {
        url = request.url
        return HttpResponse.json({ ok: true })
      }),
    )

    await tmdbFetch('/teste', {
      revalidate: 60,
      params: { page: 2, genero: undefined, texto: 'oi' },
    })

    const params = new URL(url).searchParams
    expect(params.get('page')).toBe('2')
    expect(params.get('texto')).toBe('oi')
    expect(params.has('genero')).toBe(false)
  })

  it('devolve o corpo em JSON tipado', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/teste', () =>
        HttpResponse.json({ nome: 'Duna' }),
      ),
    )

    const resultado = await tmdbFetch<{ nome: string }>('/teste', { revalidate: 60 })

    expect(resultado.nome).toBe('Duna')
  })

  it('repete a requisicao apos um 429 e devolve o segundo resultado', async () => {
    let tentativas = 0
    server.use(
      http.get('https://api.themoviedb.org/3/teste', () => {
        tentativas += 1
        if (tentativas === 1) {
          return new HttpResponse(null, { status: 429, headers: { 'retry-after': '0' } })
        }
        return HttpResponse.json({ ok: true })
      }),
    )

    const resultado = await tmdbFetch<{ ok: boolean }>('/teste', {
      revalidate: 60,
      retryBaseMs: 0,
    })

    expect(tentativas).toBe(2)
    expect(resultado.ok).toBe(true)
  })

  it('repete uma unica vez apos um 500 e entao desiste', async () => {
    let tentativas = 0
    server.use(
      http.get('https://api.themoviedb.org/3/teste', () => {
        tentativas += 1
        return new HttpResponse(null, { status: 500 })
      }),
    )

    await expect(
      tmdbFetch('/teste', { revalidate: 60, retryBaseMs: 0 }),
    ).rejects.toBeInstanceOf(TmdbError)

    expect(tentativas).toBe(2)
  })

  it('nao repete em erro 404 e expoe o status', async () => {
    let tentativas = 0
    server.use(
      http.get('https://api.themoviedb.org/3/teste', () => {
        tentativas += 1
        return new HttpResponse(null, { status: 404 })
      }),
    )

    await expect(
      tmdbFetch('/teste', { revalidate: 60, retryBaseMs: 0 }),
    ).rejects.toMatchObject({ status: 404 })

    expect(tentativas).toBe(1)
  })

  it('falha com mensagem clara quando o token nao esta configurado', async () => {
    delete process.env.TMDB_ACCESS_TOKEN

    await expect(tmdbFetch('/teste', { revalidate: 60 })).rejects.toThrow(
      /TMDB_ACCESS_TOKEN/,
    )
  })
})
