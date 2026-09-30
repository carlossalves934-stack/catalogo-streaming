import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Genre } from '@/lib/tmdb/types'
import { FilterBar } from './filter-bar'

// As listas chegam prontas do servidor: calcula-las no cliente faria
// servidor e cliente discordarem na virada do ano, e a hidratacao quebraria.
const ANOS = [2026, 2025, 2015, 1990, 1970]
const DECADAS = [2020, 2010, 2000, 1990, 1980, 1970]

function renderizar() {
  return render(<FilterBar genres={generos} anos={ANOS} decadas={DECADAS} />)
}

const push = vi.fn()

// Mutável para permitir que testes individuais simulem outra query string
// (ex.: nota=7.5 vinda da URL) sem recriar o mock inteiro.
let searchParamsString = 'servicos=8'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  usePathname: () => '/explorar',
  useSearchParams: () => new URLSearchParams(searchParamsString),
}))

const generos: Genre[] = [
  { id: 27, name: 'Terror' },
  { id: 35, name: 'Comédia' },
]

beforeEach(() => {
  push.mockClear()
  searchParamsString = 'servicos=8'
})

describe('FilterBar', () => {
  it('oferece um seletor rotulado para cada filtro', () => {
    renderizar()

    expect(screen.getByLabelText('Gênero')).toBeInTheDocument()
    expect(screen.getByLabelText('Ano')).toBeInTheDocument()
    expect(screen.getByLabelText('Nota mínima')).toBeInTheDocument()
    expect(screen.getByLabelText('Ordenar por')).toBeInTheDocument()
  })

  it('nao oferece mais um seletor separado de decada', () => {
    // As decadas passaram para dentro do seletor de Ano: dois controles
    // para a mesma escala deixavam o usuario escolher 1990s com ano 2015,
    // que nao cruza nada e devolve vazio sem explicacao.
    renderizar()

    expect(screen.queryByLabelText('Década')).not.toBeInTheDocument()
  })

  it('preserva os servicos selecionados ao mudar um filtro', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.selectOptions(screen.getByLabelText('Gênero'), '27')

    expect(push).toHaveBeenCalledTimes(1)
    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.get('servicos')).toBe('8')
    expect(destino.searchParams.get('genero')).toBe('27')
  })

  it('remove o parametro ao voltar para a opcao vazia', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.selectOptions(screen.getByLabelText('Gênero'), '')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.has('genero')).toBe(false)
  })

  it('volta para a primeira pagina ao trocar um filtro', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.selectOptions(screen.getByLabelText('Nota mínima'), '7')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.has('pagina')).toBe(false)
  })

  it('oferece uma opcao de nota 7,5, valor usado pelo trilho "Muito bem avaliados"', () => {
    renderizar()

    const select = screen.getByLabelText('Nota mínima') as HTMLSelectElement
    const valores = Array.from(select.options).map((opcao) => opcao.value)

    expect(valores).toContain('7.5')
  })

  it('exibe nota=7.5 da URL selecionado, em vez de cair para "Qualquer"', () => {
    searchParamsString = 'servicos=8&nota=7.5'
    renderizar()

    const select = screen.getByLabelText('Nota mínima') as HTMLSelectElement

    expect(select.value).toBe('7.5')
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = renderizar()

    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('FilterBar: seletor de ano', () => {
  function seletorDeAno(): HTMLSelectElement {
    return screen.getByLabelText('Ano') as HTMLSelectElement
  }

  it('agrupa decadas e anos no mesmo seletor', () => {
    renderizar()

    const grupos = Array.from(seletorDeAno().querySelectorAll('optgroup')).map(
      (g) => g.label,
    )

    expect(grupos).toEqual(['Décadas', 'Anos'])
  })

  it('escreve o ano escolhido na URL', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.selectOptions(seletorDeAno(), 'ano:2015')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.get('ano')).toBe('2015')
  })

  it('limpa a decada ao escolher um ano exato', async () => {
    // Os dois juntos viram E logico no TMDB e devolvem lista vazia.
    searchParamsString = 'servicos=8&decada=2000'
    const usuario = userEvent.setup()
    renderizar()

    await usuario.selectOptions(seletorDeAno(), 'ano:2015')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.has('decada')).toBe(false)
  })

  it('escreve a decada escolhida e limpa o ano', async () => {
    searchParamsString = 'servicos=8&ano=2015'
    const usuario = userEvent.setup()
    renderizar()

    await usuario.selectOptions(seletorDeAno(), 'decada:1990')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.get('decada')).toBe('1990')
    expect(destino.searchParams.has('ano')).toBe(false)
  })

  it('exibe a decada vinda da URL como selecionada', () => {
    // E o que o link "Ver mais" do trilho "Vale redescobrir" manda. Sem
    // isso o seletor cairia para "Qualquer" e o filtro ficaria invisivel.
    searchParamsString = 'servicos=8&decada=2000'
    renderizar()

    expect(seletorDeAno().value).toBe('decada:2000')
  })

  it('exibe o ano vindo da URL como selecionado', () => {
    searchParamsString = 'servicos=8&ano=2015'
    renderizar()

    expect(seletorDeAno().value).toBe('ano:2015')
  })

  it('limpa os dois ao voltar para "Qualquer"', async () => {
    searchParamsString = 'servicos=8&decada=2000'
    const usuario = userEvent.setup()
    renderizar()

    await usuario.selectOptions(seletorDeAno(), '')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.has('decada')).toBe(false)
    expect(destino.searchParams.has('ano')).toBe(false)
  })
})

describe('FilterBar: ordenacao', () => {
  it('oferece "Piores notas" para ver da menor nota para a maior', () => {
    renderizar()

    const select = screen.getByLabelText('Ordenar por') as HTMLSelectElement
    const valores = Array.from(select.options).map((opcao) => opcao.value)

    expect(valores).toContain('ratingAsc')
  })
})
