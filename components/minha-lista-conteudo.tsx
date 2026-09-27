import { EmptyState } from '@/components/empty-state'
import { MovieGrid } from '@/components/movie-grid'
import type { Movie } from '@/lib/tmdb/types'

type Props = {
  /** Quantos filmes estão salvos no banco. */
  totalSalvo: number
  /** Os que o TMDB devolveu. Pode ser menos que totalSalvo. */
  filmes: Movie[]
  /** A leitura do banco falhou. */
  erro: boolean
}

export function MinhaListaConteudo({ totalSalvo, filmes, erro }: Props) {
  if (!erro && totalSalvo === 0) {
    return (
      <EmptyState
        title="Sua lista está vazia"
        hint="Toque na estrela de qualquer filme para guardá-lo aqui e assistir depois."
      />
    )
  }

  // "Nunca salvou nada" e "salvou, mas não carregou" não podem compartilhar
  // o mesmo texto: o segundo precisa dizer que a lista existe.
  if (erro || filmes.length === 0) {
    return (
      <EmptyState
        title="Não foi possível carregar sua lista"
        hint="Os filmes salvos não puderam ser encontrados agora. Tente novamente mais tarde."
      />
    )
  }

  // Minha lista não é filtrada por serviço, então `servicos` fica de
  // propósito sem valor, pelo mesmo raciocínio da Busca.
  return <MovieGrid movies={filmes} />
}
