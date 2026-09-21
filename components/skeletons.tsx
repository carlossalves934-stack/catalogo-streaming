// Placeholders de carregamento com as mesmas dimensões do MovieCard, para
// evitar deslocamento de layout (CLS) quando os dados chegam.
export function MovieCardSkeleton() {
  return (
    <div className="w-40 shrink-0 animate-pulse sm:w-48" aria-hidden="true">
      <div className="aspect-[2/3] rounded-xl bg-sala" />
      <div className="mt-3 h-4 w-3/4 rounded bg-sala" />
      <div className="mt-1.5 h-3 w-1/2 rounded bg-sala" />
    </div>
  )
}

export function MovieRailSkeleton() {
  return (
    <div
      className="mx-auto flex max-w-7xl gap-4 overflow-hidden px-4 py-8 sm:gap-5 sm:px-6"
      role="status"
      aria-label="Carregando filmes"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Espaço do destaque da Home enquanto o TMDB responde. Só a altura, sem
 * pulso: é um bloco do tamanho da tela e piscar isso é desagradável.
 */
export function HeroSkeleton() {
  return (
    <div
      className="h-[78vh] min-h-[460px] w-full bg-gradient-to-b from-sala to-noite"
      role="status"
      aria-label="Carregando destaque do dia"
    />
  )
}
