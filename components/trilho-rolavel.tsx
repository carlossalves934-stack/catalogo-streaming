'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Props = {
  /** Nome do trilho, usado nos rótulos das setas. */
  rotulo: string
  /** Os <li> com os cards. Vêm do servidor: este componente não os monta. */
  children: ReactNode
}

/** Margem de erro em pixels para o cálculo de "chegou ao fim". */
const FOLGA = 8

/**
 * Faixa rolável com setas laterais.
 *
 * As setas só aparecem quando existe conteúdo escondido do lado
 * correspondente: seta que não leva a lugar nenhum é promessa falsa. Elas
 * também não substituem nada — a rolagem por gesto, por roda e por teclado
 * (o <ul> recebe foco) continua funcionando sem JavaScript nenhum.
 */
export function TrilhoRolavel({ rotulo, children }: Props) {
  const faixa = useRef<HTMLUListElement>(null)
  const [podeVoltar, setPodeVoltar] = useState(false)
  const [podeAvancar, setPodeAvancar] = useState(false)

  const medir = useCallback(() => {
    const elemento = faixa.current
    if (!elemento) return

    const { scrollLeft, scrollWidth, clientWidth } = elemento
    setPodeVoltar(scrollLeft > FOLGA)
    setPodeAvancar(scrollLeft + clientWidth < scrollWidth - FOLGA)
  }, [])

  useEffect(() => {
    const elemento = faixa.current
    if (!elemento) return

    medir()

    // O pôster pode chegar depois da primeira medição (imagem carregando,
    // janela mudando de tamanho), e aí o trilho passa a ter ou deixa de ter
    // conteúdo escondido. O observador mantém as setas honestas.
    const observador = new ResizeObserver(medir)
    observador.observe(elemento)

    return () => observador.disconnect()
  }, [medir])

  function mover(direcao: -1 | 1) {
    const elemento = faixa.current
    if (!elemento) return

    // Uma "tela" de trilho por clique, com uma sobra para o filme da borda
    // não sumir: quem clica não perde o fio de onde estava.
    const passo = elemento.clientWidth * 0.85
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    elemento.scrollBy({ left: passo * direcao, behavior: suave ? 'smooth' : 'auto' })
  }

  const seta =
    'absolute top-[42%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-contorno bg-noite/80 text-lg text-texto backdrop-blur transition hover:bg-noite hover:text-lanterna focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna sm:flex'

  return (
    <div className="group/faixa relative">
      {podeVoltar && (
        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label={`Voltar em ${rotulo}`}
          className={`${seta} left-1 opacity-0 focus-visible:opacity-100 group-hover/faixa:opacity-100 sm:left-2`}
        >
          <span aria-hidden="true">‹</span>
        </button>
      )}

      {/*
        tabIndex=0 torna a faixa rolável alcançável pelo teclado: sem isso,
        quem navega por teclado não consegue rolar o conteúdo horizontal.
        O padding vertical dá folga para o anel de foco do card não ser
        cortado pelo overflow da faixa.
      */}
      <ul
        ref={faixa}
        tabIndex={0}
        onScroll={medir}
        className="trilho mx-auto flex max-w-7xl snap-x gap-4 overflow-x-auto px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna motion-reduce:scroll-auto sm:gap-5 sm:px-6"
      >
        {children}
      </ul>

      {podeAvancar && (
        <button
          type="button"
          onClick={() => mover(1)}
          aria-label={`Avançar em ${rotulo}`}
          className={`${seta} right-1 opacity-0 focus-visible:opacity-100 group-hover/faixa:opacity-100 sm:right-2`}
        >
          <span aria-hidden="true">›</span>
        </button>
      )}
    </div>
  )
}
