import { notaDaUrl } from './notas'
import type { SortBy } from './tmdb/types'

/**
 * Ano mais antigo oferecido pelo seletor.
 *
 * O TMDB tem filmes desde 1874, mas um seletor com 150 anos é inutilizável,
 * e o catálogo de streaming brasileiro praticamente não alcança o que vem
 * antes disto. 1970 também é onde a lista de décadas já começava.
 */
export const PRIMEIRO_ANO = 1970

export const ORDENACOES: { valor: SortBy; rotulo: string }[] = [
  { valor: 'popularity', rotulo: 'Mais populares' },
  { valor: 'rating', rotulo: 'Melhores notas' },
  { valor: 'ratingAsc', rotulo: 'Piores notas' },
  { valor: 'releaseDate', rotulo: 'Mais recentes' },
]

/** Ordenação usada quando a URL não pede nenhuma. */
export const ORDENACAO_PADRAO: SortBy = 'popularity'

export type FiltrosDaUrl = {
  genreId?: number
  year?: number
  decade?: number
  minRating?: number
  sortBy: SortBy
}

/** Os parâmetros como chegam da URL, antes de qualquer validação. */
export type ParametrosBrutos = {
  genero?: string
  ano?: string
  decada?: string
  nota?: string
  ordenar?: string
}

export function anosDisponiveis(hoje: Date): number[] {
  const atual = hoje.getUTCFullYear()

  return Array.from({ length: atual - PRIMEIRO_ANO + 1 }, (_, i) => atual - i)
}

export function decadasDisponiveis(hoje: Date): number[] {
  const primeira = Math.floor(PRIMEIRO_ANO / 10) * 10
  const atual = Math.floor(hoje.getUTCFullYear() / 10) * 10

  return Array.from({ length: (atual - primeira) / 10 + 1 }, (_, i) => atual - i * 10)
}

function inteiroPositivo(bruto: string | undefined): number | undefined {
  if (!bruto) return undefined

  const n = Number(bruto)

  return Number.isInteger(n) && n > 0 ? n : undefined
}

function umDaLista(bruto: string | undefined, permitidos: number[]): number | undefined {
  const n = inteiroPositivo(bruto)

  return n !== undefined && permitidos.includes(n) ? n : undefined
}

function ehSortBy(bruto: string | undefined): bruto is SortBy {
  return ORDENACOES.some((opcao) => opcao.valor === bruto)
}

/**
 * Lê os filtros da URL, descartando tudo que o seletor correspondente não
 * ofereceria.
 *
 * A validação é por lista, não por faixa: um valor numericamente plausível
 * mas ausente do seletor (ano 1969, nota 9.9) filtraria de verdade enquanto
 * o controle exibiria "Qualquer" — o filtro ficaria invisível, sem como
 * desfazê-lo. Mesma regra que `notaDaUrl` já aplica.
 *
 * Existe em um só lugar porque a Home e /explorar leem exatamente os mesmos
 * parâmetros: duas cópias desta validação divergiriam, que foi o bug que a
 * Task 11 corrigiu ao extrair `idsDeServicos`.
 */
export function lerFiltros(brutos: ParametrosBrutos, hoje: Date): FiltrosDaUrl {
  return {
    genreId: inteiroPositivo(brutos.genero),
    year: umDaLista(brutos.ano, anosDisponiveis(hoje)),
    decade: umDaLista(brutos.decada, decadasDisponiveis(hoje)),
    minRating: notaDaUrl(brutos.nota),
    sortBy: ehSortBy(brutos.ordenar) ? brutos.ordenar : ORDENACAO_PADRAO,
  }
}

/**
 * A Home deve trocar os trilhos por uma grade de resultados?
 *
 * Gênero, ano, década e ordenação CONTRADIZEM os títulos curados: com
 * gênero Comédia o trilho "Terror para hoje" mostraria comédias, e com
 * "Piores notas" o trilho "Muito bem avaliados" abriria pelos piores. Nesses
 * casos os títulos passariam a mentir, então a Home vira grade.
 *
 * A nota é a exceção: ela COMPÕE com a curadoria em vez de contradizê-la
 * (`comNotaMinima` toma sempre a mais estrita das duas), então a nota
 * sozinha mantém os trilhos.
 */
export function temFiltroDeGrade(filtros: FiltrosDaUrl): boolean {
  return (
    filtros.genreId !== undefined ||
    filtros.year !== undefined ||
    filtros.decade !== undefined ||
    filtros.sortBy !== ORDENACAO_PADRAO
  )
}
