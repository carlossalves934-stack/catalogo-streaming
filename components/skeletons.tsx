// Placeholders de carregamento com as mesmas dimensões do MovieCard, para
// evitar deslocamento de layout (CLS) quando os dados chegam.
export function MovieCardSkeleton() {
  return (
    <div className="w-40 shrink-0 animate-pulse sm:w-44" aria-hidden="true">
      <div className="aspect-[2/3] rounded-lg bg-neutral-800" />
      <div className="mt-2 h-4 w-3/4 rounded bg-neutral-800" />
      <div className="mt-1 h-3 w-1/2 rounded bg-neutral-800" />
    </div>
  )
}

export function MovieRailSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" role="status" aria-label="Carregando filmes">
      {Array.from({ length: 6 }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  )
}
