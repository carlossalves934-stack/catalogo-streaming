'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  PREFERENCIAS_PADRAO,
  readPreferences,
  subscribe,
  writePreferences,
  type Preferences,
} from '@/lib/storage'

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(PREFERENCIAS_PADRAO)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Este efeito roda exatamente uma vez após o mount (deps vazias) e existe
    // para satisfazer um requisito rígido: o localStorage só pode ser lido
    // após o mount, senão o HTML renderizado no servidor diverge do primeiro
    // render do cliente. Ler localStorage durante o render quebraria a hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferences(readPreferences())
    setHydrated(true)
  }, [])

  // Mantém esta instância em dia com escritas feitas por qualquer outra
  // instância de usePreferences() (outro botão, outra página). O setState
  // fica dentro do callback passado a subscribe(), não no corpo do efeito —
  // é isso (como o .then()/.finally() em watchlist-view.tsx) que mantém a
  // regra react-hooks/set-state-in-effect satisfeita sem eslint-disable:
  // ela não é acionada por um setState assíncrono, só por um síncrono no
  // topo do efeito.
  useEffect(() => subscribe(() => setPreferences(readPreferences())), [])

  // Lê de readPreferences() (a fonte real), não do `preferences` fechado no
  // closure deste callback: agora que outras instâncias também escrevem,
  // o estado local desta pode estar um passo atrás do localStorage no
  // instante do clique. Escrever e depois já aplicar `proximo` localmente
  // (em vez de só esperar a notificação de subscribe()) evita um piscar
  // onde esta instância mostraria o valor antigo por um instante.
  const atualizar = useCallback((mudanca: Partial<Preferences>) => {
    const proximo = { ...readPreferences(), ...mudanca }
    writePreferences(proximo)
    setPreferences(proximo)
  }, [])

  const setProviders = useCallback(
    (providerIds: number[]) => atualizar({ providerIds }),
    [atualizar],
  )

  const toggleWatchlist = useCallback((id: number) => {
    const atual = readPreferences()
    const jaSalvo = atual.watchlist.includes(id)
    const watchlist = jaSalvo
      ? atual.watchlist.filter((salvo) => salvo !== id)
      : [...atual.watchlist, id]
    const proximo = { ...atual, watchlist }
    writePreferences(proximo)
    setPreferences(proximo)
  }, [])

  const completeOnboarding = useCallback(
    () => atualizar({ hasOnboarded: true }),
    [atualizar],
  )

  return { preferences, hydrated, setProviders, toggleWatchlist, completeOnboarding }
}
