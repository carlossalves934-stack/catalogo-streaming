'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { urlDeEntrar } from '@/lib/auth/proximo'
import { useWatchlist } from './watchlist-provider'

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
  const pathname = usePathname()
  const router = useRouter()
  const { pronto, logado, email, sair } = useWatchlist()

  async function aoSair() {
    await sair()
    // Minha lista exige conta: ficar nela depois de sair só levaria ao login.
    if (pathname === '/minha-lista') router.push('/')
    router.refresh()
  }

  const CONTA =
    'rounded py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lanterna'

  // O cabeçalho flutua sobre a foto do destaque; ao rolar, ganha fundo para
  // não competir com o conteúdo. Componente cliente só por causa disto.
  const [rolou, setRolou] = useState(false)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 24)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        rolou
          ? 'border-b border-borda bg-noite/90 backdrop-blur-md'
          : 'border-b border-transparent bg-gradient-to-b from-noite/80 to-transparent'
      }`}
    >
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-4 sm:px-6"
      >
        <Link
          href="/"
          className="titulo shrink-0 rounded text-base font-semibold text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lanterna"
        >
          Catálogo
        </Link>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {LINKS.slice(1).map((link) => {
            const atual = pathname === link.href

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={atual ? 'page' : undefined}
                  className={`rounded py-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lanterna ${
                    atual
                      ? 'border-b-2 border-lanterna font-medium text-texto'
                      : 'border-b-2 border-transparent text-nevoa hover:text-texto'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="ml-auto flex shrink-0 items-center gap-4">
          {pronto && !logado && pathname !== '/entrar' && (
            <Link
              href={urlDeEntrar(pathname)}
              className={`${CONTA} font-medium text-texto hover:text-lanterna`}
            >
              Entrar
            </Link>
          )}
          {pronto && logado && (
            <>
              <span className="hidden text-sm text-nevoa md:inline">{email}</span>
              <button type="button" onClick={aoSair} className={`${CONTA} text-nevoa hover:text-texto`}>
                Sair
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
