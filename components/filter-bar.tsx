'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ORDENACOES } from '@/lib/filtros'
import type { Genre } from '@/lib/tmdb/types'
import { CLASSE_ROTULO, CLASSE_SELECT, RatingSelect } from './rating-select'

/**
 * Prefixos do seletor de Ano.
 *
 * Décadas e anos exatos dividem um controle só: dois seletores para a mesma
 * escala deixavam escolher "1990s" com "2015", que no TMDB vira E lógico,
 * não cruza nada e devolve lista vazia sem explicação. Um valor só, com
 * prefixo, torna as duas escalas mutuamente exclusivas por construção.
 *
 * A década precisa continuar alcançável porque o "Ver mais" do trilho
 * "Vale redescobrir" manda `decada=` na URL: sem uma opção correspondente,
 * o seletor cairia para "Qualquer" e o filtro ficaria invisível.
 */
const PREFIXO_DECADA = 'decada:'
const PREFIXO_ANO = 'ano:'

type Props = {
  genres: Genre[]
  /** Calculados no servidor: no cliente, a virada do ano quebraria a hidratação. */
  anos: number[]
  decadas: number[]
}

export function FilterBar({ genres, anos, decadas }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navegar(params: URLSearchParams) {
    // Trocar um filtro invalida a posição na paginação: a página 3 do
    // conjunto de filtros antigo não corresponde a nada no novo conjunto.
    params.delete('pagina')

    router.push(`${pathname}?${params.toString()}`)
  }

  function aplicar(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (valor === '') {
      params.delete(chave)
    } else {
      params.set(chave, valor)
    }

    navegar(params)
  }

  function aplicarPeriodo(valor: string) {
    const params = new URLSearchParams(searchParams.toString())

    // Os dois sempre saem juntos: é o que garante que década e ano nunca
    // coexistam na URL, em qualquer ordem de cliques.
    params.delete('decada')
    params.delete('ano')

    if (valor.startsWith(PREFIXO_DECADA)) {
      params.set('decada', valor.slice(PREFIXO_DECADA.length))
    } else if (valor.startsWith(PREFIXO_ANO)) {
      params.set('ano', valor.slice(PREFIXO_ANO.length))
    }

    navegar(params)
  }

  const decadaAtual = searchParams.get('decada')
  const anoAtual = searchParams.get('ano')
  const periodoSelecionado = decadaAtual
    ? `${PREFIXO_DECADA}${decadaAtual}`
    : anoAtual
      ? `${PREFIXO_ANO}${anoAtual}`
      : ''

  return (
    <div className="flex flex-wrap gap-3 px-4 py-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-genero" className={CLASSE_ROTULO}>
          Gênero
        </label>
        <select
          id="filtro-genero"
          className={CLASSE_SELECT}
          value={searchParams.get('genero') ?? ''}
          onChange={(evento) => aplicar('genero', evento.target.value)}
        >
          <option value="">Todos</option>
          {genres.map((genero) => (
            <option key={genero.id} value={genero.id}>
              {genero.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-ano" className={CLASSE_ROTULO}>
          Ano
        </label>
        <select
          id="filtro-ano"
          className={CLASSE_SELECT}
          value={periodoSelecionado}
          onChange={(evento) => aplicarPeriodo(evento.target.value)}
        >
          <option value="">Qualquer</option>
          <optgroup label="Décadas">
            {decadas.map((decada) => (
              <option key={decada} value={`${PREFIXO_DECADA}${decada}`}>
                {decada}s
              </option>
            ))}
          </optgroup>
          <optgroup label="Anos">
            {anos.map((ano) => (
              <option key={ano} value={`${PREFIXO_ANO}${ano}`}>
                {ano}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* A lista de notas e a regra do 7.5 moram em lib/notas.ts, ao lado do
          parser da URL que precisa aceitar exatamente os mesmos valores. */}
      <RatingSelect />

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-ordem" className={CLASSE_ROTULO}>
          Ordenar por
        </label>
        <select
          id="filtro-ordem"
          className={CLASSE_SELECT}
          value={searchParams.get('ordenar') ?? 'popularity'}
          onChange={(evento) => aplicar('ordenar', evento.target.value)}
        >
          {ORDENACOES.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
