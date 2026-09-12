'use client'

import type { WatchOptions } from '@/lib/tmdb/types'
import { usePreferences } from '@/lib/hooks/use-preferences'
import { WatchProviderBlock } from './watch-provider-block'

type Props = {
  options: WatchOptions
}

/**
 * Ruling T13-a: o destaque "Você assina" é preferência pessoal, não estado
 * de URL — por isso este wrapper é Client Component e lê os serviços do
 * usuário do localStorage via usePreferences(), em vez de recebê-los como
 * prop vinda da URL (que é o mecanismo usado para filtrar os similares).
 * A página de detalhe (Server Component) só carrega e repassa `options`.
 */
export function WatchProviderSection({ options }: Props) {
  const { preferences } = usePreferences()

  return <WatchProviderBlock options={options} subscribedIds={preferences.providerIds} />
}
