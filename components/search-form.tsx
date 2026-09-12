'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function SearchForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [termo, setTermo] = useState(searchParams.get('q') ?? '')

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const limpo = termo.trim()
    if (limpo === '') return
    router.push(`/busca?q=${encodeURIComponent(limpo)}`)
  }

  return (
    <form onSubmit={enviar} role="search" className="flex gap-2 px-4 py-4">
      <div className="flex-1">
        <label htmlFor="campo-busca" className="sr-only">
          Buscar filme pelo título
        </label>
        <input
          id="campo-busca"
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Digite o nome de um filme"
          // Ruling T15-b: placeholder:text-neutral-500 sobre bg-neutral-900
          // media 3.79:1, abaixo do mínimo de 4.5:1 — trocado por neutral-400
          // (6.91:1) na auditoria da Task 15.
          //
          // Seguimento (borda, §12.3 — minimo 3:1 para elemento de
          // interface): border-neutral-700 media ~1.9:1 contra a pagina e o
          // proprio fundo do campo; trocado por neutral-500 (4.18:1 / 3.79:1).
          className="w-full rounded-lg border border-neutral-500 bg-neutral-900 px-4 py-2.5 text-neutral-100 placeholder:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        Buscar
      </button>
    </form>
  )
}
