import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { getProviders } from './providers'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
beforeEach(() => {
  process.env.TMDB_ACCESS_TOKEN = 'token-de-teste'
})

describe('getProviders', () => {
  it('consulta a regiao BR e devolve provedores ordenados por prioridade', async () => {
    let url = ''
    server.use(
      http.get('https://api.themoviedb.org/3/watch/providers/movie', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          results: [
            { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/a.jpg', display_priority: 3 },
            { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 },
          ],
        })
      }),
    )

    const provedores = await getProviders()

    expect(new URL(url).searchParams.get('watch_region')).toBe('BR')
    expect(provedores.map((p) => p.name)).toEqual(['Netflix', 'Amazon Prime Video'])
  })

  it('devolve lista vazia quando results esta ausente', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/watch/providers/movie', () =>
        HttpResponse.json({}),
      ),
    )

    expect(await getProviders()).toEqual([])
  })
})
