'use client'

import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { MovieGrid } from '@/components/movie-grid'
import { MovieCardSkeleton } from '@/components/skeletons'
import { usePreferences } from '@/lib/hooks/use-preferences'
import type { Movie } from '@/lib/tmdb/types'

export function WatchlistView() {
  const { preferences, hydrated } = usePreferences()
  const [filmes, setFilmes] = useState<Movie[]>([])
  const [carregando, setCarregando] = useState(true)

  const ids = preferences.watchlist.join(',')

  // Lista vazia é conhecida de imediato assim que hidrata — não é um estado
  // "carregando" que precise de round-trip à API, então essa condição é
  // resolvida direto no render abaixo em vez de sincronizada via setState
  // dentro do efeito (que só existe para o caso que de fato busca dados).
  //
  // `carregando` nasce true e só é desligado dentro do `.finally` — nunca
  // ligado de volta a true de forma síncrona no corpo do efeito — porque
  // react-hooks/set-state-in-effect proíbe setState direto ali (só abre
  // exceção para setState guardado por uma ref, como em provider-picker.tsx).
  // Uma troca de watchlist enquanto a página já está montada refaz a busca
  // sem reexibir o esqueleto, o que é aceitável: essa tela não promete
  // recarregar visivelmente a cada mudança, só carregar corretamente uma vez.
  useEffect(() => {
    // ids === '' não precisa de fetch — não há nada para buscar. O estado
    // "lista vazia" para esse caso é decidido direto no render abaixo a
    // partir de `ids` (não de `filmes`), então não é preciso zerar `filmes`
    // aqui: ver o comentário junto do `if (ids === '')` mais abaixo.
    if (!hydrated || ids === '') return

    let ativo = true

    fetch(`/api/filmes?ids=${ids}`)
      .then((resposta) => resposta.json())
      .then((dados: { movies: Movie[] }) => {
        if (ativo) setFilmes(dados.movies)
      })
      .catch(() => {
        if (ativo) setFilmes([])
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [hydrated, ids])

  if (!hydrated || (ids !== '' && carregando)) {
    return (
      <div
        className="flex flex-wrap justify-center gap-6 px-4"
        role="status"
        aria-label="Carregando sua lista"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (ids === '') {
    // Autoritativo por `ids`, não por `filmes`: `ids` vem de
    // preferences.watchlist, que agora se propaga em tempo real entre
    // instâncias de usePreferences() (ver lib/storage.ts). `filmes`, por
    // outro lado, só é atualizado quando um fetch resolve — e não existe
    // fetch para disparar quando a lista fica vazia (o efeito acima nem
    // tenta buscar nesse caso). Se este branch dependesse de
    // `filmes.length === 0`, o último filme removido ficaria preso na
    // tela: era exatamente esse o defeito ainda aberto após a correção
    // anterior desta revisão. Decidir por `ids` corrige isso na mesma
    // renderização do clique, sem esperar (e sem precisar) nenhum fetch.
    return (
      <EmptyState
        title="Sua lista está vazia"
        hint="Toque na estrela de qualquer filme para guardá-lo aqui e assistir depois."
      />
    )
  }

  if (filmes.length === 0) {
    // Chegou aqui com `ids` preenchido: a pessoa salvou algo, só que nenhum
    // id resolveu no TMDB agora (ex.: 404 upstream). Mensagem distinta da
    // acima — "nunca salvou nada" e "salvou, mas não carregou" não podem
    // compartilhar o mesmo texto.
    return (
      <EmptyState
        title="Não foi possível carregar sua lista"
        hint="Os filmes salvos não puderam ser encontrados agora. Tente novamente mais tarde."
      />
    )
  }

  // Minha lista não é filtrada por serviço, então `servicos` fica de
  // propósito sem valor — mesmo raciocínio da Busca em app/busca/page.tsx.
  return <MovieGrid movies={filmes} />
}
