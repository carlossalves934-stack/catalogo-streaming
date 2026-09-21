import { WatchlistView } from '@/components/watchlist-view'

export default function MinhaListaPage() {
  return (
    <div className="mx-auto max-w-7xl py-8">
      <h1 className="titulo px-4 text-2xl font-semibold text-texto sm:px-6 sm:text-3xl pb-4">Minha lista</h1>
      <WatchlistView />
    </div>
  )
}
