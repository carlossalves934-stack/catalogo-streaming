import Link from 'next/link'

const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/explorar', label: 'Explorar' },
  { href: '/busca', label: 'Buscar' },
  { href: '/minha-lista', label: 'Minha lista' },
  // Ruling T9-b: a seleção de serviços precisa ser editável a qualquer
  // momento (spec §7.1). Sem este link, quem termina o onboarding não tem
  // como voltar à tela de escolha de serviços.
  { href: '/servicos', label: 'Meus serviços' },
]

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-800">
      <nav aria-label="Principal" className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <Link
          href="/"
          className="rounded font-semibold text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          Catálogo de Streamings
        </Link>

        <ul className="flex gap-4 text-sm">
          {LINKS.slice(1).map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded text-neutral-300 transition hover:text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
