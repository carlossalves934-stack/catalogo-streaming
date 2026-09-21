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
          // Ruling T15-b (texto pequeno, mínimo 4.5:1): o placeholder usa
          // `nevoa`, que mede 7.0:1 sobre o fundo do campo.
          //
          // Seguimento (borda, §12.3 — mínimo 3:1 para elemento de
          // interface): `borda` mede ~1.3:1 contra a página e contra o
          // próprio fundo do campo; aqui vale `contorno` (3.3:1 / 3.0:1).
          className="w-full rounded-lg border border-contorno bg-sala px-4 py-2.5 text-texto placeholder:text-nevoa focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-lanterna px-5 py-2.5 font-medium text-noite transition hover:bg-[#ffcb60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna"
      >
        Buscar
      </button>
    </form>
  )
}
