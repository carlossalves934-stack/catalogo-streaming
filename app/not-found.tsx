import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-medium text-texto">Página não encontrada</h1>
      <p className="mt-2 text-sm text-nevoa">
        O filme que você procura pode ter saído do catálogo ou o endereço está errado.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-lanterna px-5 py-2.5 font-medium text-noite transition hover:bg-[#ffcb60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
