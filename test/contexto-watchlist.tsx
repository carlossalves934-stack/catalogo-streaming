import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { ContextoWatchlist, type WatchlistContexto } from '@/components/watchlist-provider'

/** Contexto pronto e logado, sem nada salvo. Cada teste muda só o que importa. */
export function contextoDeTeste(sobrescrever: Partial<WatchlistContexto> = {}): WatchlistContexto {
  return {
    pronto: true,
    logado: true,
    email: 'ana@exemplo.com',
    ids: [],
    alternar: vi.fn(),
    recarregar: vi.fn(),
    sair: vi.fn(async () => {}),
    ...sobrescrever,
  }
}

export function ComContexto({ valor, children }: { valor: WatchlistContexto; children: ReactNode }) {
  return <ContextoWatchlist.Provider value={valor}>{children}</ContextoWatchlist.Provider>
}
