import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'
import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { WatchlistProvider } from '@/components/watchlist-provider'
import './globals.css'

// Uma família só, com eixo de largura: a classe .titulo usa a versão larga
// para os títulos, o corpo usa a largura normal. Sem segunda família.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Catálogo de Streamings',
  description:
    'Descubra o que assistir hoje nos serviços de streaming que você já assina.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={archivo.variable}>
      <body className="min-h-screen bg-noite font-sans text-texto antialiased">
        <WatchlistProvider>
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-lanterna focus:px-4 focus:py-2 focus:font-medium focus:text-noite"
          >
            Pular para o conteúdo
          </a>

          <SiteHeader />
          {/*
            O cabeçalho é fixo, então o conteúdo começa abaixo dele. A Home
            anula esta folga com -mt-16 para o destaque nascer atrás do menu.
          */}
          <main id="conteudo" className="pt-16">
            {children}
          </main>
          <SiteFooter />
        </WatchlistProvider>
      </body>
    </html>
  )
}
