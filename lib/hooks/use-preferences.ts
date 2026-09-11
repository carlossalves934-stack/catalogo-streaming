'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  PREFERENCIAS_PADRAO,
  readPreferences,
  writePreferences,
  type Preferences,
} from '@/lib/storage'

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(PREFERENCIAS_PADRAO)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPreferences(readPreferences())
    setHydrated(true)
  }, [])

  const atualizar = useCallback((mudanca: Partial<Preferences>) => {
    setPreferences((atual) => {
      const proximo = { ...atual, ...mudanca }
      writePreferences(proximo)
      return proximo
    })
  }, [])

  const setProviders = useCallback(
    (providerIds: number[]) => atualizar({ providerIds }),
    [atualizar],
  )

  const toggleWatchlist = useCallback(
    (id: number) => {
      setPreferences((atual) => {
        const jaSalvo = atual.watchlist.includes(id)
        const watchlist = jaSalvo
          ? atual.watchlist.filter((salvo) => salvo !== id)
          : [...atual.watchlist, id]
        const proximo = { ...atual, watchlist }
        writePreferences(proximo)
        return proximo
      })
    },
    [],
  )

  const completeOnboarding = useCallback(
    () => atualizar({ hasOnboarded: true }),
    [atualizar],
  )

  return { preferences, hydrated, setProviders, toggleWatchlist, completeOnboarding }
}
