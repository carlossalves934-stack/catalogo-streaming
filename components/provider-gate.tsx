'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ProviderPicker } from './provider-picker'
import { usePreferences } from '@/lib/hooks/use-preferences'
import { readPreferences } from '@/lib/storage'
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

export function ProviderGate({ providers, redirectWhenConfigured = true }: Props) {
  const router = useRouter()
  const { preferences, hydrated } = usePreferences()

  // Quem já escolheu antes não deve ver esta tela de novo — exceto quando
  // o redirecionamento foi explicitamente desligado (tela de edição).
  useEffect(() => {
    if (!hydrated || !redirectWhenConfigured) return
    if (preferences.providerIds.length > 0) {
      router.replace(`/?servicos=${preferences.providerIds.join(',')}`)
    }
  }, [hydrated, redirectWhenConfigured, preferences.providerIds, router])

  return (
    <ProviderPicker
      providers={providers}
      onConfirm={() => {
        // Ruling T11-a: lê pelo módulo que sabe o formato salvo, em vez de
        // reimplementar o parse aqui. Isso evita duplicar conhecimento do
        // formato fora de lib/storage.ts e, principalmente, ganha de graça
        // o try/catch que protege contra localStorage indisponível (aba
        // anônima) — um JSON.parse cru quebraria esta tela nesse caso.
        const { providerIds } = readPreferences()
        router.push(providerIds.length > 0 ? `/?servicos=${providerIds.join(',')}` : '/explorar')
      }}
    />
  )
}
