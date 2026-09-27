'use client'

import { useEffect, useState } from 'react'
import { jaDecidiu, registrarDecisao } from '@/lib/importacao'
import { readPreferences } from '@/lib/storage'
import { importarLista } from '@/lib/watchlist/actions'
import { sanitizarIds } from '@/lib/watchlist/ids'
import { useWatchlist } from './watchlist-provider'

type Pergunta = { ids: number[]; estado: 'perguntando' | 'enviando' | 'falhou' }

const BOTAO =
  'rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna'

export function ImportarLista({ usuarioId }: { usuarioId: string }) {
  const { recarregar } = useWatchlist()
  const [pergunta, setPergunta] = useState<Pergunta | null>(null)

  useEffect(() => {
    // Mesmo requisito do usePreferences(): o localStorage só pode ser lido
    // depois do mount, senão o HTML do servidor diverge do primeiro render.
    if (jaDecidiu(usuarioId)) return
    const ids = sanitizarIds(readPreferences().watchlist)
    if (ids.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPergunta({ ids, estado: 'perguntando' })
  }, [usuarioId])

  if (!pergunta) return null

  async function trazer(ids: number[]) {
    setPergunta({ ids, estado: 'enviando' })
    const resultado = await importarLista(ids)
    if (!resultado.ok) {
      setPergunta({ ids, estado: 'falhou' })
      return
    }
    registrarDecisao(usuarioId)
    recarregar()
    setPergunta(null)
  }

  function descartar() {
    // Só registra a decisão. A lista local fica onde está, recuperável.
    registrarDecisao(usuarioId)
    setPergunta(null)
  }

  const total = pergunta.ids.length
  const enviando = pergunta.estado === 'enviando'

  return (
    <section
      aria-labelledby="importar-titulo"
      className="mx-4 mb-6 rounded-lg border border-contorno bg-sala p-4 sm:mx-6"
    >
      <h2 id="importar-titulo" className="font-medium text-texto">
        {total === 1 ? '1 filme salvo neste navegador.' : `${total} filmes salvos neste navegador.`}
      </h2>
      <p className="mt-1 text-sm text-nevoa">Trazer para sua conta?</p>

      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-texto">
        {pergunta.estado === 'falhou' ? 'Não foi possível trazer agora. Tente de novo.' : ''}
      </p>

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => trazer(pergunta.ids)}
          disabled={enviando}
          className={`${BOTAO} bg-lanterna text-noite hover:bg-[#ffcb60]`}
        >
          Trazer
        </button>
        <button
          type="button"
          onClick={descartar}
          disabled={enviando}
          className={`${BOTAO} border border-contorno text-texto hover:bg-noite`}
        >
          Descartar
        </button>
      </div>
    </section>
  )
}
