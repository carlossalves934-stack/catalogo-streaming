'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { NOTAS_DISPONIVEIS } from '@/lib/notas'

// Ruling do controller (Task 15, seguimento): border-borda contra
// bg-noite/bg-sala mede ~1.3:1, abaixo do mínimo de 3:1 que o
// spec (§12.3) exige para o contorno de um controle de interface. Trocado
// por `contorno` (3.3:1 contra a página, 3.0:1 contra o próprio fundo
// do select) — o tom mais escuro que ainda soa "quase invisível" no visual
// escuro, mas cruza o mínimo nos dois contextos.
//
// Exportado daqui porque a FilterBar usa as mesmas classes nos outros três
// seletores: duas cópias desta regra divergiriam na próxima auditoria.
export const CLASSE_SELECT =
  'rounded-lg border border-contorno bg-sala px-3 py-2 text-sm text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna'

export const CLASSE_ROTULO = 'text-xs text-nevoa'

/**
 * Seletor de nota mínima, compartilhado entre a Home e /explorar.
 *
 * Escreve o filtro na URL em vez de guardá-lo em estado local: é o mesmo
 * lugar de onde a Home e /explorar leem os filtros no servidor, e faz o
 * botão voltar e o link compartilhado funcionarem sem código extra.
 */
export function RatingSelect() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function aplicar(valor: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (valor === '') {
      params.delete('nota')
    } else {
      params.set('nota', valor)
    }

    // Trocar a nota invalida a posição na paginação: a página 3 do conjunto
    // antigo não corresponde a nada no novo. A Home não pagina, mas o mesmo
    // componente serve /explorar, que pagina.
    params.delete('pagina')

    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="filtro-nota" className={CLASSE_ROTULO}>
        Nota mínima
      </label>
      <select
        id="filtro-nota"
        className={CLASSE_SELECT}
        value={searchParams.get('nota') ?? ''}
        onChange={(evento) => aplicar(evento.target.value)}
      >
        <option value="">Qualquer</option>
        {NOTAS_DISPONIVEIS.map((nota) => (
          <option key={nota} value={nota}>
            {nota.toLocaleString('pt-BR')} ou mais
          </option>
        ))}
      </select>
    </div>
  )
}
