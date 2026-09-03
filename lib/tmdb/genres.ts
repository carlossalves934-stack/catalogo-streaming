import 'server-only'
import { tmdbFetch } from './client'
import { CACHE } from './config'
import type { Genre } from './types'

type Resposta = { genres?: Genre[] }

export async function getGenres(): Promise<Genre[]> {
  const resposta = await tmdbFetch<Resposta>('/genre/movie/list', {
    revalidate: CACHE.genres,
  })

  return resposta.genres ?? []
}
