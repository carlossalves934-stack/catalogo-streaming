import 'server-only'
import { tmdbFetch } from './client'
import { CACHE, WATCH_REGION } from './config'
import { toProvider } from './mappers'
import type { Provider } from './types'

type Resposta = {
  results?: Array<{
    provider_id: number
    provider_name: string
    logo_path?: string | null
    display_priority?: number
  }>
}

/** Provedores de filmes disponíveis na região configurada, do mais relevante ao menos. */
export async function getProviders(): Promise<Provider[]> {
  const resposta = await tmdbFetch<Resposta>('/watch/providers/movie', {
    params: { watch_region: WATCH_REGION },
    revalidate: CACHE.providers,
  })

  return (resposta.results ?? [])
    .map(toProvider)
    .sort((a, b) => a.displayPriority - b.displayPriority)
}
