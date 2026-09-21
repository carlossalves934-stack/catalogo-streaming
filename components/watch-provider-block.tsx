import Image from 'next/image'
import type { Provider, WatchOptions } from '@/lib/tmdb/types'

type Props = {
  options: WatchOptions
  /** Serviços que o usuário assina, para destacar o que já está pago. */
  subscribedIds: number[]
}

function Secao({
  titulo,
  provedores,
  subscribedIds,
}: {
  titulo: string
  provedores: Provider[]
  subscribedIds: number[]
}) {
  if (provedores.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-nevoa">{titulo}</h3>
      <ul className="mt-2 flex flex-wrap gap-3">
        {provedores.map((provedor) => {
          const assinado = subscribedIds.includes(provedor.id)

          return (
            <li
              key={provedor.id}
              // Auditoria da Task 15 (seguimento, §12.3): border-borda
              // aqui mede ~1.9:1, abaixo do 3:1 de contorno de interface —
              // mas deixado como está de propósito. Este <li> não é um
              // controle interativo (não há clique, não há estado que o
              // usuário altere aqui), e quando "assinado" é verdade a
              // informação já é dada por texto explícito logo abaixo
              // ("Você assina"), não só pela cor/borda. A borda é reforço
              // decorativo redundante, não o único meio de identificar o
              // estado — por isso o WCAG 1.4.11 não a exige em 3:1.
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                assinado ? 'border-lanterna bg-lanterna/10' : 'border-borda'
              }`}
            >
              {provedor.logoUrl && (
                <Image src={provedor.logoUrl} alt="" width={28} height={28} className="rounded" />
              )}
              <span className="text-sm text-texto">{provedor.name}</span>
              {assinado && (
                <span className="text-xs font-medium text-lanterna">Você assina</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function WatchProviderBlock({ options, subscribedIds }: Props) {
  const semNada =
    options.flatrate.length === 0 && options.rent.length === 0 && options.buy.length === 0

  return (
    <section aria-labelledby="onde-assistir" className="mt-8">
      <h2 id="onde-assistir" className="text-lg font-semibold text-texto">
        Onde assistir
      </h2>

      {semNada ? (
        <p className="mt-2 text-sm text-nevoa">
          Este filme não está disponível em nenhum serviço no Brasil no momento.
        </p>
      ) : (
        <>
          <Secao
            titulo="Incluso na assinatura"
            provedores={options.flatrate}
            subscribedIds={subscribedIds}
          />
          {/*
            "Você assina" só pode aparecer aqui em cima. Um provedor pode
            vender assinatura E aluguel (a Apple TV é o caso concreto) — se
            "Alugar"/"Comprar" recebessem subscribedIds, alguém que assina
            aquele provedor veria o selo de assinatura ao lado de um preço de
            aluguel, exatamente a confusão que a spec proíbe (rent for
            R$14,90 ≠ incluso no plano). Por isso as duas seções abaixo
            recebem lista vazia, não subscribedIds.
          */}
          <Secao titulo="Alugar" provedores={options.rent} subscribedIds={[]} />
          <Secao titulo="Comprar" provedores={options.buy} subscribedIds={[]} />

          {options.tmdbLink && (
            // Ruling T15-b (texto pequeno, mínimo 4.5:1): `nevoa` sobre
            // a página mede 7.6:1. O hover clareia para `texto` (16.5:1).
            <p className="mt-4 text-xs text-nevoa">
              <a
                href={options.tmdbLink}
                target="_blank"
                rel="noreferrer"
                className="rounded underline hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna"
              >
                Ver preços e opções no JustWatch
              </a>
            </p>
          )}
        </>
      )}
    </section>
  )
}
