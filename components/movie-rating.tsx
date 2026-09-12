type Props = {
  rating: number | null
}

/**
 * Nota do filme, renderizada como "★ 8.2". Retorna null quando não há nota
 * (filme sem votos) — mostrar "★ 0.0" seria enganoso.
 *
 * O nome acessível vai em `role="group"` porque `aria-label` sozinho num
 * elemento de papel genérico (`span` sem role) é uma violação de ARIA
 * (aria-prohibited-attr): a Task 8 corrigiu esse defeito uma vez em
 * MovieCard, e a Task 13 o reintroduziu ao duplicar a marcação na página de
 * detalhe. Este componente existe para que a marcação exista em um só
 * lugar, corrigida uma vez, usada nos dois.
 */
export function MovieRating({ rating }: Props) {
  if (rating === null) return null

  return (
    <span role="group" aria-label={`Nota ${rating.toFixed(1)} de 10`}>
      <span aria-hidden="true">★ {rating.toFixed(1)}</span>
    </span>
  )
}
