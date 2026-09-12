'use client'

import { usePreferences } from '@/lib/hooks/use-preferences'

type Props = {
  movieId: number
  title: string
}

// Componente cliente: precisa de interatividade (onClick) e do estado do
// localStorage via usePreferences, então hidrata separado do MovieCard.
export function WatchlistButton({ movieId, title }: Props) {
  const { preferences, hydrated, toggleWatchlist } = usePreferences()
  const salvo = preferences.watchlist.includes(movieId)

  return (
    <button
      type="button"
      onClick={() => toggleWatchlist(movieId)}
      aria-pressed={salvo}
      aria-label={salvo ? `Remover ${title} da minha lista` : `Salvar ${title} na minha lista`}
      disabled={!hydrated}
      className="rounded-full bg-neutral-900/80 p-2 text-white transition hover:bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:opacity-50"
    >
      <span aria-hidden="true">{salvo ? '★' : '☆'}</span>
    </button>
  )
}
