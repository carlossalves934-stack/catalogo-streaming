'use client'

import { irParaEntrar } from '@/lib/auth/navegacao'
import { useWatchlist } from './watchlist-provider'

type Props = {
  movieId: number
  title: string
  /**
   * 'icone' é o botão que fica sobre o pôster nos cards — só a estrela,
   * com o nome acessível no aria-label. 'rotulo' é o botão do destaque da
   * Home, que tem espaço para dizer a ação por extenso.
   */
  variante?: 'icone' | 'rotulo'
}

// Componente cliente: precisa de interatividade (onClick) e da lista da
// conta via useWatchlist(), então hidrata separado do MovieCard.
export function WatchlistButton({ movieId, title, variante = 'icone' }: Props) {
  const { pronto, logado, ids, alternar } = useWatchlist()
  const salvo = ids.includes(movieId)

  const comum =
    'transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna disabled:opacity-50'

  const aparencia =
    variante === 'rotulo'
      ? 'flex items-center gap-2 rounded-full border border-contorno bg-sala/80 px-5 py-3 text-sm font-medium text-texto backdrop-blur hover:bg-sala'
      : 'rounded-full bg-noite/70 p-2 text-texto backdrop-blur hover:bg-noite'

  return (
    <button
      type="button"
      onClick={() => (logado ? alternar(movieId) : irParaEntrar())}
      aria-pressed={salvo}
      aria-label={salvo ? `Remover ${title} da minha lista` : `Salvar ${title} na minha lista`}
      disabled={!pronto}
      className={`${aparencia} ${comum}`}
    >
      <span aria-hidden="true" className={salvo ? 'text-lanterna' : undefined}>
        {salvo ? '★' : '☆'}
      </span>
      {variante === 'rotulo' && (
        <span aria-hidden="true">{salvo ? 'Na minha lista' : 'Salvar na minha lista'}</span>
      )}
    </button>
  )
}
