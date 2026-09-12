import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-medium text-neutral-100">Página não encontrada</h1>
      <p className="mt-2 text-sm text-neutral-400">
        O filme que você procura pode ter saído do catálogo ou o endereço está errado.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
