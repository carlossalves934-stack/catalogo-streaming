import { NextResponse } from 'next/server'
import { getMovie } from '@/lib/tmdb/movies'
import type { Movie } from '@/lib/tmdb/types'

/** Teto defensivo: a watchlist é do usuário, mas a rota é pública. */
const MAXIMO_DE_IDS = 50

/**
 * Ruling T14-a: getMovie devolve MovieDetail (elenco, gêneros, trailer,
 * watchOptions inclusos) — o TypeScript aceita atribuir isso a Movie[] por
 * ser um supertipo, mas o JSON de fato enviado carregaria tudo isso para um
 * cliente que só desenha cards. Este mapeamento explícito é o que de fato
 * reduz o payload; a anotação de tipo sozinha não faz isso.
 */
function paraMovie(filme: Awaited<ReturnType<typeof getMovie>>): Movie {
  return {
    id: filme.id,
    title: filme.title,
    originalTitle: filme.originalTitle,
    overview: filme.overview,
    posterUrl: filme.posterUrl,
    backdropUrl: filme.backdropUrl,
    releaseYear: filme.releaseYear,
    rating: filme.rating,
    voteCount: filme.voteCount,
    genreIds: filme.genreIds,
  }
}

export async function GET(request: Request) {
  const brutos = (new URL(request.url).searchParams.get('ids') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)

  // Dedupe antes do teto: "ids=1,1,1,…" (50 vezes) sem isso vira 50 chamadas
  // concorrentes a getMovie(1) contra as credenciais do TMDB — pura
  // amplificação, já que ids repetidos nunca produzem um resultado a mais.
  const ids = Array.from(new Set(brutos)).slice(0, MAXIMO_DE_IDS)

  if (ids.length === 0) {
    return NextResponse.json({ movies: [] })
  }

  const resultados = await Promise.all(
    ids.map(async (id) => {
      try {
        return paraMovie(await getMovie(id))
      } catch {
        // Um id da watchlist pode não existir mais no TMDB (filme removido).
        // Melhor omitir esse item do que quebrar a lista inteira.
        return null
      }
    }),
  )

  const movies: Movie[] = resultados.filter((filme): filme is Movie => filme !== null)

  return NextResponse.json({ movies })
}
