'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-medium text-neutral-100">Algo deu errado</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Não conseguimos carregar esta página. Pode ser uma instabilidade momentânea.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        Tentar de novo
      </button>
    </div>
  )
}
