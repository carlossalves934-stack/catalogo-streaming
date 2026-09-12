'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { usePreferences } from '@/lib/hooks/use-preferences'
import type { Provider } from '@/lib/tmdb/types'

type Props = {
  providers: Provider[]
  onConfirm?: (ids: number[]) => void
}

export function ProviderPicker({ providers, onConfirm }: Props) {
  const { preferences, hydrated, setProviders, completeOnboarding } = usePreferences()
  // Ruling F2: usePreferences() sempre retorna PREFERENCIAS_PADRAO no primeiro
  // render (o localStorage só é lido após o mount, para não divergir da
  // hidratação). Se este estado nascesse como `useState(preferences.providerIds)`,
  // ele nasceria vazio mesmo para quem já tinha escolhido serviços, e confirmar
  // sem retocar nada sobrescreveria a seleção salva com `[]`. Por isso o
  // estado nasce vazio e é sincronizado uma única vez, via efeito, quando a
  // hidratação termina.
  const [selecionados, setSelecionados] = useState<number[]>([])
  const sincronizado = useRef(false)

  useEffect(() => {
    if (!hydrated || sincronizado.current) return
    sincronizado.current = true
    // Esta sincronização acontece exatamente uma vez, na transição de
    // "não hidratado" para "hidratado" — não é um efeito que reage a toda
    // mudança de `preferences.providerIds`, então não apaga marcações que o
    // usuário já tenha feito na tela antes da hidratação terminar. O guard
    // acima (early return) também é o motivo de a regra
    // react-hooks/set-state-in-effect não disparar aqui, diferente do
    // efeito incondicional em use-preferences.ts.
    setSelecionados(preferences.providerIds)
  }, [hydrated, preferences.providerIds])

  function alternar(id: number) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((salvo) => salvo !== id) : [...atual, id],
    )
  }

  function confirmar(ids: number[]) {
    setProviders(ids)
    completeOnboarding()
    // Repassa os ids recém-confirmados diretamente, em vez de deixar quem
    // escuta reler o localStorage: essa releitura dependia de a atualização
    // de estado acima já ter sido aplicada de forma síncrona, o que o React
    // não garante.
    onConfirm?.(ids)
  }

  return (
    <section aria-labelledby="titulo-servicos" className="mx-auto max-w-3xl p-6">
      <h1 id="titulo-servicos" className="text-2xl font-semibold text-neutral-100">
        Quais streamings você assina?
      </h1>
      <p className="mt-2 text-neutral-400">
        Vamos mostrar apenas filmes que você pode assistir agora, sem custo extra.
      </p>

      <fieldset className="mt-6">
        <legend className="sr-only">Serviços de streaming disponíveis</legend>

        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {providers.map((provedor) => {
            const marcado = selecionados.includes(provedor.id)

            return (
              <li key={provedor.id}>
                <label
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-400 ${
                    marcado
                      ? 'border-sky-400 bg-sky-950/40'
                      : 'border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(provedor.id)}
                    className="sr-only"
                  />
                  {provedor.logoUrl ? (
                    <Image
                      src={provedor.logoUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="rounded"
                    />
                  ) : null}
                  <span className="text-center text-xs text-neutral-200">{provedor.name}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <p role="status" className="mt-4 text-sm text-neutral-400">
        {selecionados.length === 0
          ? 'Nenhum serviço selecionado'
          : `${selecionados.length} ${selecionados.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}`}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => confirmar(selecionados)}
          className="rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => confirmar([])}
          className="rounded-lg px-5 py-2.5 text-neutral-300 underline transition hover:text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          Ver tudo, sem filtrar
        </button>
      </div>
    </section>
  )
}
