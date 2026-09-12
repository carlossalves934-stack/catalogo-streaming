'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Genre } from '@/lib/tmdb/types'

const DECADAS = [2020, 2010, 2000, 1990, 1980, 1970]
// 7.5 precisa estar na lista: é o valor que o trilho "Muito bem avaliados"
// usa (vote_average.gte=7.5), e um <select> controlado cujo valor não bate
// com nenhuma opção some sem aviso, escondendo o filtro que o usuário
// precisaria limpar.
const NOTAS = [6, 7, 7.5, 8]
const ORDENACOES = [
  { valor: 'popularity', rotulo: 'Mais populares' },
  { valor: 'rating', rotulo: 'Melhores notas' },
  { valor: 'releaseDate', rotulo: 'Mais recentes' },
]

// Ruling do controller (Task 15, seguimento): border-neutral-700 contra
// bg-neutral-950/bg-neutral-900 media ~1.9:1, abaixo do minimo de 3:1 que o
// spec (§12.3) exige para o contorno de um controle de interface. Trocado
// por neutral-500 (4.18:1 contra a pagina, 3.79:1 contra o proprio fundo
// do select) — o tom mais claro da escala que ainda soa "quase invisivel"
// no visual escuro, mas cruza o minimo nos dois contextos.
const CLASSE_SELECT =
  'rounded-lg border border-neutral-500 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400'

const CLASSE_ROTULO = 'text-xs text-neutral-400'

type Props = {
  genres: Genre[]
}

export function FilterBar({ genres }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function aplicar(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (valor === '') {
      params.delete(chave)
    } else {
      params.set(chave, valor)
    }

    // Trocar um filtro invalida a posição na paginação: a página 3 do
    // conjunto de filtros antigo não corresponde a nada no novo conjunto.
    params.delete('pagina')

    router.push(`${pathname}?${params.toString()}`)
  }

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
        <label htmlFor="filtro-decada" className={CLASSE_ROTULO}>
          Década
        </label>
        <select
          id="filtro-decada"
          className={CLASSE_SELECT}
          value={searchParams.get('decada') ?? ''}
          onChange={(evento) => aplicar('decada', evento.target.value)}
        >
          <option value="">Qualquer</option>
          {DECADAS.map((decada) => (
            <option key={decada} value={decada}>
              {decada}s
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-nota" className={CLASSE_ROTULO}>
          Nota mínima
        </label>
        <select
          id="filtro-nota"
          className={CLASSE_SELECT}
          value={searchParams.get('nota') ?? ''}
          onChange={(evento) => aplicar('nota', evento.target.value)}
        >
          <option value="">Qualquer</option>
          {NOTAS.map((nota) => (
            <option key={nota} value={nota}>
              {nota.toLocaleString('pt-BR')} ou mais
            </option>
          ))}
        </select>
      </div>

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
