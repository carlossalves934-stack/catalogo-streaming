import { redirect } from 'next/navigation'
import { ImportarLista } from '@/components/importar-lista'
import { MinhaListaConteudo } from '@/components/minha-lista-conteudo'
import { urlDeEntrar } from '@/lib/auth/proximo'
import { getMoviesById } from '@/lib/tmdb/movies'
import { lerMinhaLista } from '@/lib/watchlist/leitura'

export default async function MinhaListaPage() {
  const lista = await lerMinhaLista()

  // Segunda barreira: o proxy.ts já redireciona, mas é só uma checagem otimista.
  if (!lista.logado) redirect(urlDeEntrar('/minha-lista'))

  const filmes = await getMoviesById(lista.ids)

  return (
    <div className="mx-auto max-w-7xl py-8">
      <h1 className="titulo px-4 pb-4 text-2xl font-semibold text-texto sm:px-6 sm:text-3xl">
        Minha lista
      </h1>
      <ImportarLista usuarioId={lista.usuarioId} />
      <MinhaListaConteudo totalSalvo={lista.ids.length} filmes={filmes} erro={lista.erro} />
    </div>
  )
}
