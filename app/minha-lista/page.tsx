import { WatchlistView } from '@/components/watchlist-view'

export default function MinhaListaPage() {
  return (
    <div className="mx-auto max-w-6xl py-4">
      <h1 className="px-4 pb-4 text-2xl font-semibold text-neutral-100">Minha lista</h1>
      <WatchlistView />
    </div>
  )
}
