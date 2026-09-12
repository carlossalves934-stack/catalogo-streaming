import type { DiscoverFilters } from './tmdb/types'

export type RailDefinition = {
  id: string
  title: string
  filters: Omit<DiscoverFilters, 'providerIds' | 'page'>
  href: string
}

/** Gêneros do TMDB que rendem um trilho interessante. */
const GENEROS_EM_DESTAQUE = [
  { id: 27, nome: 'Terror' },
  { id: 35, nome: 'Comédia' },
  { id: 16, nome: 'Animação' },
  { id: 878, nome: 'Ficção científica' },
  { id: 53, nome: 'Suspense' },
  { id: 18, nome: 'Drama' },
  { id: 10749, nome: 'Romance' },
]

function diaDoAno(data: Date): number {
  const inicio = Date.UTC(data.getUTCFullYear(), 0, 0)
  const atual = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())
  return Math.floor((atual - inicio) / 86_400_000)
}

export function railDefinitions(hoje: Date): RailDefinition[] {
  const destaque = GENEROS_EM_DESTAQUE[diaDoAno(hoje) % GENEROS_EM_DESTAQUE.length]
  const anoAtual = hoje.getUTCFullYear()
  const decadaRedescobrir = Math.floor((anoAtual - 20) / 10) * 10

  return [
    {
      id: 'em-alta',
      title: 'Em alta nos seus serviços',
      filters: { sortBy: 'popularity' },
      href: '/explorar?ordenar=popularity',
    },
    {
      id: 'bem-avaliados',
      title: 'Muito bem avaliados',
      filters: { sortBy: 'rating', minRating: 7.5 },
      href: '/explorar?ordenar=rating&nota=7.5',
    },
    {
      id: 'estreias',
      // Data de estreia do filme, não de entrada no catálogo: o TMDB não
      // expõe a segunda, e prometer isso seria mentir ao usuário.
      title: 'Estreias recentes disponíveis',
      filters: { sortBy: 'releaseDate' },
      href: '/explorar?ordenar=releaseDate',
    },
    {
      id: 'genero-destaque',
      title: `${destaque.nome} para hoje`,
      filters: { sortBy: 'popularity', genreId: destaque.id },
      href: `/explorar?genero=${destaque.id}`,
    },
    {
      id: 'redescobrir',
      title: 'Vale redescobrir',
      filters: { sortBy: 'rating', minRating: 7.5, decade: decadaRedescobrir },
      href: `/explorar?ordenar=rating&decada=${decadaRedescobrir}`,
    },
  ]
}
