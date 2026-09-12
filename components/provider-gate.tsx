'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ProviderPicker } from './provider-picker'
import { usePreferences } from '@/lib/hooks/use-preferences'
import { SEM_FILTRO } from '@/lib/servicos'
import type { Provider } from '@/lib/tmdb/types'

type Props = {
  providers: Provider[]
  /**
   * Na Home (padrão), quem já tem serviços salvos é redirecionado direto
   * para lá com eles na URL, sem ver este formulário de novo. Em /servicos
   * isso precisa ser desligado: a pessoa chegou ali de propósito para
   * editar a seleção (spec §7.1, "a seleção é editável a qualquer
   * momento"), e redirecioná-la de volta tornaria a tela impossível de usar.
   */
  redirectWhenConfigured?: boolean
}

function urlComServicos(ids: number[]): string {
  return `/?servicos=${ids.length > 0 ? ids.join(',') : SEM_FILTRO}`
}

export function ProviderGate({ providers, redirectWhenConfigured = true }: Props) {
  const router = useRouter()
  const { preferences, hydrated } = usePreferences()

  useEffect(() => {
    if (!hydrated || !redirectWhenConfigured) return
    // `hasOnboarded`, não o tamanho de `providerIds`, é quem sabe se a
    // pessoa já decidiu — inclusive quando a decisão foi "ver tudo, sem
    // filtrar", que também salva `providerIds: []`. Gatear no tamanho da
    // lista confundiria esse caso com "ainda não escolheu" e prenderia essa
    // pessoa neste formulário para sempre.
    if (preferences.hasOnboarded) {
      router.replace(urlComServicos(preferences.providerIds))
    }
  }, [hydrated, redirectWhenConfigured, preferences.hasOnboarded, preferences.providerIds, router])

  return (
    <ProviderPicker
      providers={providers}
      onConfirm={(ids) => {
        // Navega com os ids recebidos diretamente do picker, sem reler o
        // localStorage: essa releitura dependeria de a gravação já ter
        // acontecido de forma síncrona, o que o React não garante. Uma
        // seleção vazia é "ver tudo, sem filtrar" — não existe rota
        // /explorar ainda, e mesmo que existisse, "ver tudo" é a própria
        // Home sem filtro, não uma página separada.
        router.push(urlComServicos(ids))
      }}
    />
  )
}
