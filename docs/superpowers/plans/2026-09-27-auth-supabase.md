# Conta com email e senha (Supabase) para a Minha lista — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Minha lista passa do `localStorage` para uma tabela no Supabase, acessada com conta de email e senha.

**Architecture:** Sessão em cookies via `@supabase/ssr`, renovada por um `proxy.ts` (o antigo `middleware.ts`, renomeado no Next 16). A tabela `watchlist` é protegida por RLS. Um `WatchlistProvider` no layout lê os ids no navegador e alterna de forma otimista, gravando por Server Actions. `/minha-lista` vira Server Component que lê o banco e o TMDB no servidor.

**Tech Stack:** Next 16.3.4 (App Router), React 19, TypeScript, Tailwind 4, Vitest + Testing Library + jest-axe + msw, `@supabase/supabase-js` 2.x, `@supabase/ssr` 0.12.x.

**Spec:** [docs/superpowers/specs/2026-09-27-auth-supabase-design.md](../specs/2026-09-27-auth-supabase-design.md)

## Global Constraints

- **Leia antes de usar qualquer API do Next:** `node_modules/next/dist/docs/` (regra do `AGENTS.md`). O arquivo é `proxy.ts` com export `proxy`. **Nunca** criar `middleware.ts`.
- **Variáveis:** `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A chave secreta (`service_role` / `sb_secret_…`) não é usada em lugar nenhum.
- **Teto da lista:** `MAXIMO_NA_LISTA = 50`, para exibir e para importar.
- **Mensagens de erro do login** (texto exato): "Email ou senha incorretos." / "Já existe uma conta com esse email. Use Entrar." / "A senha precisa ter pelo menos 6 caracteres." / "Não foi possível entrar agora. Tente de novo."
- **Textos dos estados vazios** (os de hoje, sem mudança): "Sua lista está vazia" + "Toque na estrela de qualquer filme para guardá-lo aqui e assistir depois." / "Não foi possível carregar sua lista" + "Os filmes salvos não puderam ser encontrados agora. Tente novamente mais tarde."
- **Chave da decisão de importação:** `streaming-catalog:importacao-v1`. A chave `streaming-catalog:v1` nunca é apagada nem tem a `watchlist` reescrita.
- **Idioma:** nomes de funções, variáveis e comentários em português, com acentuação correta nos comentários. Commits no formato `feat: …` / `test: …` / `docs: …`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Lint do projeto:** `react-hooks/set-state-in-effect` proíbe `setState` síncrono no corpo de um efeito. `setState` dentro de callback (`.then`, `onAuthStateChange`) é permitido. Nada de `any` explícito.
- **Portões de cada tarefa:** `npm test`, `npm run lint` e `npx tsc --noEmit` passando antes do commit.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/supabase/config.ts` | Lê e valida as duas variáveis públicas |
| `lib/supabase/browser.ts` | Cliente Supabase do navegador (singleton da lib) |
| `lib/supabase/server.ts` | Cliente de servidor sobre `cookies()` e `idDoUsuario()` |
| `lib/supabase/proxy.ts` | `atualizarSessao()`: renova a sessão e barra `/minha-lista` sem conta |
| `proxy.ts` | Liga `atualizarSessao` ao Next, com `matcher` |
| `supabase/schema.sql` | Tabela e políticas RLS, versionadas |
| `lib/auth/proximo.ts` | `proximoSeguro()` e `urlDeEntrar()` |
| `lib/auth/mensagens.ts` | Código de erro do Supabase → mensagem em português |
| `lib/auth/navegacao.ts` | `irParaEntrar()` (navegação de página inteira) |
| `lib/watchlist/ids.ts` | `idValido()`, `sanitizarIds()`, `MAXIMO_NA_LISTA` |
| `lib/watchlist/actions.ts` | Server Actions: salvar, remover, importar |
| `lib/watchlist/leitura.ts` | `lerMinhaLista()` para a página do servidor |
| `lib/importacao.ts` | Quem já decidiu sobre a importação, no `localStorage` |
| `components/watchlist-provider.tsx` | `WatchlistProvider`, `useWatchlist()`, `ContextoWatchlist` |
| `components/minha-lista-conteudo.tsx` | Estados da Minha lista (vazia, falhou, grade) |
| `components/entrar-form.tsx` | Formulário Entrar / Criar conta |
| `components/importar-lista.tsx` | Faixa "Trazer para sua conta?" |
| `app/entrar/page.tsx` | Página `/entrar` |
| `test/supabase-falso.ts` | Dublês do cliente Supabase para os testes |
| `test/contexto-watchlist.tsx` | Contexto de teste para componentes que usam `useWatchlist()` |
| `scripts/verificar-rls.mjs` | Verificação do RLS contra o projeto real |

**Removidos:** `app/api/filmes/route.ts`, `app/api/filmes/route.test.ts`, `components/watchlist-view.tsx`, `components/watchlist-view.test.tsx`.

---

### Task 1: Fundação Supabase (dependências, configuração, clientes, schema)

**Files:**
- Modify: `package.json` (via `npm install`)
- Modify: `.env.example`
- Create: `lib/supabase/config.ts`, `lib/supabase/config.test.ts`
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/server.ts`, `lib/supabase/server.test.ts`
- Create: `test/supabase-falso.ts`
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: `configSupabase(): { url: string; chave: string }`
- Produces: `clienteNavegador(): SupabaseClient`
- Produces: `criarClienteServidor(): Promise<SupabaseClient>`, `idDoUsuario(supabase: Pick<SupabaseClient, 'auth'>): Promise<string | null>`
- Produces (testes): `consultaFalsa(resultado?)`, `clienteServidorFalso({ usuarioId?, resultado? })`, `type ResultadoFalso = { data: unknown; error: unknown }`

- [ ] **Step 1: Instalar as dependências**

Run: `npm install @supabase/supabase-js@^2 @supabase/ssr@^0.12`
Expected: as duas aparecem em `dependencies` do `package.json`.

- [ ] **Step 2: Documentar as variáveis no `.env.example`**

Acrescentar ao fim de `.env.example`:

```
# Supabase: Project Settings → API Keys
# As duas são públicas por natureza (vão para o navegador). Quem protege os
# dados é o RLS da tabela watchlist (supabase/schema.sql).
# NUNCA coloque aqui a chave secreta (service_role / sb_secret_...).
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- [ ] **Step 3: Escrever o teste de `configSupabase`**

`lib/supabase/config.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { configSupabase } from './config'

describe('configSupabase', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('devolve url e chave quando as duas existem', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')

    expect(configSupabase()).toEqual({
      url: 'https://abc.supabase.co',
      chave: 'sb_publishable_teste',
    })
  })

  it('falha apontando o .env.local quando falta a url', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')

    expect(() => configSupabase()).toThrow(/\.env\.local/)
  })

  it('falha apontando o .env.local quando falta a chave', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')

    expect(() => configSupabase()).toThrow(/\.env\.local/)
  })
})
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run lib/supabase/config.test.ts`
Expected: FAIL, `Cannot find module './config'` (ou equivalente de import).

- [ ] **Step 5: Implementar `configSupabase`**

`lib/supabase/config.ts`:

```ts
/**
 * As duas variáveis são públicas por natureza: o prefixo NEXT_PUBLIC_ as
 * embute no JavaScript do navegador. Quem protege os dados é o RLS da
 * tabela, não o segredo da chave. O acesso é literal (process.env.NOME)
 * porque o Next só substitui as NEXT_PUBLIC_* escritas assim.
 */
export function configSupabase(): { url: string; chave: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !chave) {
    throw new Error(
      'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env.local (veja .env.example).',
    )
  }

  return { url, chave }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run lib/supabase/config.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 7: Criar os dublês de teste**

`test/supabase-falso.ts`:

```ts
import { vi } from 'vitest'

export type ResultadoFalso = { data: unknown; error: unknown }

/**
 * Dublê do construtor de consultas do supabase-js. Todo método encadeia
 * (from().select().order()...) e fica registrado em `chamadas`, na ordem;
 * o `await` no fim da cadeia resolve `resultado`. Assim o teste confere a
 * consulta montada sem depender da forma interna do supabase-js.
 */
export function consultaFalsa(resultado: ResultadoFalso = { data: null, error: null }) {
  const chamadas: Array<{ metodo: string; args: unknown[] }> = []

  const consulta: object = new Proxy(
    {},
    {
      get(_alvo, propriedade) {
        if (typeof propriedade === 'symbol') return undefined
        if (propriedade === 'then') {
          return (ok: (valor: ResultadoFalso) => unknown, falha?: (erro: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, falha)
        }
        return (...args: unknown[]) => {
          chamadas.push({ metodo: propriedade, args })
          return consulta
        }
      },
    },
  )

  return { consulta, chamadas }
}

/**
 * Cliente de servidor falso: `auth.getClaims()` devolve a sessão de
 * `usuarioId` (ou nenhuma, com `usuarioId: null`), e `from()` devolve uma
 * consultaFalsa que resolve `resultado`.
 */
export function clienteServidorFalso(
  opcoes: { usuarioId?: string | null; resultado?: ResultadoFalso } = {},
) {
  const usuarioId = opcoes.usuarioId === undefined ? 'usuario-1' : opcoes.usuarioId
  const { consulta, chamadas } = consultaFalsa(opcoes.resultado)

  const cliente = {
    auth: {
      getClaims: vi.fn(async () => ({
        data: usuarioId ? { claims: { sub: usuarioId, email: 'ana@exemplo.com' } } : null,
        error: null,
      })),
    },
    from: vi.fn(() => consulta),
  }

  return { cliente, chamadas }
}
```

- [ ] **Step 8: Escrever o teste de `idDoUsuario`**

`lib/supabase/server.test.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { clienteServidorFalso } from '@/test/supabase-falso'
import { idDoUsuario } from './server'

function comoCliente(cliente: unknown) {
  return cliente as SupabaseClient
}

describe('idDoUsuario', () => {
  it('devolve o id (sub) de quem está na sessão', async () => {
    const { cliente } = clienteServidorFalso({ usuarioId: 'usuario-42' })

    expect(await idDoUsuario(comoCliente(cliente))).toBe('usuario-42')
  })

  it('devolve null sem sessão', async () => {
    const { cliente } = clienteServidorFalso({ usuarioId: null })

    expect(await idDoUsuario(comoCliente(cliente))).toBeNull()
  })
})
```

- [ ] **Step 9: Rodar e ver falhar**

Run: `npx vitest run lib/supabase/server.test.ts`
Expected: FAIL, módulo `./server` não encontrado.

- [ ] **Step 10: Implementar os dois clientes**

`lib/supabase/server.ts`:

```ts
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { configSupabase } from './config'

/**
 * Um cliente por requisição: ele carrega os cookies desta requisição, e
 * reaproveitá-lo entre requisições misturaria sessões de pessoas diferentes.
 */
export async function criarClienteServidor(): Promise<SupabaseClient> {
  const { url, chave } = configSupabase()
  const cookieStore = await cookies()

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Component não pode gravar cookie; só Server Action e o
          // proxy podem. Aqui é seguro ignorar: quem renova a sessão em
          // toda requisição é o proxy.ts.
        }
      },
    },
  })
}

/**
 * getClaims() valida o token antes de confiar nele (getSession() não
 * valida). Sem sessão ou com token inválido, devolve null.
 */
export async function idDoUsuario(supabase: Pick<SupabaseClient, 'auth'>): Promise<string | null> {
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
}
```

`lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { configSupabase } from './config'

/**
 * No navegador, createBrowserClient devolve sempre a mesma instância. Por
 * isso o formulário de /entrar e o WatchlistProvider enxergam a mesma
 * sessão: o login feito por um dispara o onAuthStateChange do outro.
 */
export function clienteNavegador(): SupabaseClient {
  const { url, chave } = configSupabase()
  return createBrowserClient(url, chave)
}
```

- [ ] **Step 11: Rodar e ver passar**

Run: `npx vitest run lib/supabase`
Expected: PASS (5 testes).

- [ ] **Step 12: Versionar o schema**

`supabase/schema.sql`:

```sql
-- Minha lista: um filme por linha, por usuário.
-- Rode no SQL Editor do Supabase. Idempotente: pode rodar de novo.

create table if not exists public.watchlist (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  movie_id   integer     not null check (movie_id > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

-- A linha mais importante deste arquivo. A chave publishable é pública:
-- sem RLS, qualquer pessoa com ela lê e apaga a lista de todo mundo.
alter table public.watchlist enable row level security;

drop policy if exists "le a propria lista" on public.watchlist;
create policy "le a propria lista" on public.watchlist
  for select using ((select auth.uid()) = user_id);

drop policy if exists "insere na propria lista" on public.watchlist;
create policy "insere na propria lista" on public.watchlist
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "remove da propria lista" on public.watchlist;
create policy "remove da propria lista" on public.watchlist
  for delete using ((select auth.uid()) = user_id);

-- Sem política de update: a linha não tem campo mutável.
```

- [ ] **Step 13: Portões e commit**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: tudo verde.

```bash
git add package.json package-lock.json .env.example lib/supabase test/supabase-falso.ts supabase/schema.sql
git commit -m "feat: clientes Supabase, configuracao e schema com RLS"
```

---

### Task 2: Funções puras de segurança e validação

**Files:**
- Create: `lib/auth/proximo.ts`, `lib/auth/proximo.test.ts`
- Create: `lib/auth/mensagens.ts`, `lib/auth/mensagens.test.ts`
- Create: `lib/watchlist/ids.ts`, `lib/watchlist/ids.test.ts`

**Interfaces:**
- Produces: `DESTINO_PADRAO = '/minha-lista'`, `proximoSeguro(valor: unknown): string`, `urlDeEntrar(caminhoAtual: string): string`
- Produces: `MENSAGEM_GENERICA`, `MENSAGEM_SEM_SESSAO`, `mensagemDeErro(erro: { code?: string } | null | undefined): string`
- Produces: `MAXIMO_NA_LISTA = 50`, `idValido(valor: unknown): valor is number`, `sanitizarIds(valor: unknown): number[]`

- [ ] **Step 1: Escrever os testes de `proximo`**

`lib/auth/proximo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { proximoSeguro, urlDeEntrar } from './proximo'

describe('proximoSeguro', () => {
  it.each(['/filme/550', '/minha-lista', '/explorar?genero=18&nota=8', '/'])(
    'aceita o caminho interno %s',
    (valor) => {
      expect(proximoSeguro(valor)).toBe(valor)
    },
  )

  it.each([
    ['ausente', undefined],
    ['vazio', ''],
    ['url absoluta', 'https://site-falso.com'],
    ['url sem protocolo', '//site-falso.com'],
    ['barra invertida', '/\\site-falso.com'],
    ['javascript:', 'javascript:alert(1)'],
    ['relativo sem barra', 'filme/550'],
    // O navegador remove tab e quebra de linha de URLs: "/\t/site" vira "//site".
    ['tab escondido', '/\t/site-falso.com'],
    ['quebra de linha escondida', '/\n/site-falso.com'],
    ['parâmetro repetido (array)', ['/filme/1', '/filme/2']],
  ])('recusa %s e volta para /minha-lista', (_caso, valor) => {
    expect(proximoSeguro(valor)).toBe('/minha-lista')
  })
})

describe('urlDeEntrar', () => {
  it('leva o caminho atual, codificado, no parâmetro proximo', () => {
    expect(urlDeEntrar('/filme/550?servicos=8')).toBe(
      '/entrar?proximo=%2Ffilme%2F550%3Fservicos%3D8',
    )
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/auth/proximo.test.ts`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 3: Implementar**

`lib/auth/proximo.ts`:

```ts
export const DESTINO_PADRAO = '/minha-lista'

/**
 * Só aceita caminho interno. Sem esta checagem,
 * /entrar?proximo=https://site-falso.com vira um open redirect: a vítima vê
 * o domínio do app no link, entra, e cai no site do atacante.
 *
 * "//site" e "/\site" também saem do domínio: o navegador lê os dois como
 * endereço de outro host. Caracteres de controle são recusados porque o
 * navegador remove tab e quebra de linha de URLs, e "/\t/site" vira "//site".
 */
export function proximoSeguro(valor: unknown): string {
  if (typeof valor !== 'string') return DESTINO_PADRAO
  if (!valor.startsWith('/')) return DESTINO_PADRAO
  if (valor.startsWith('//') || valor.startsWith('/\\')) return DESTINO_PADRAO
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(valor)) return DESTINO_PADRAO
  return valor
}

export function urlDeEntrar(caminhoAtual: string): string {
  return `/entrar?proximo=${encodeURIComponent(caminhoAtual)}`
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/auth/proximo.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever os testes de `mensagens`**

`lib/auth/mensagens.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MENSAGEM_GENERICA, mensagemDeErro } from './mensagens'

describe('mensagemDeErro', () => {
  it.each([
    ['invalid_credentials', 'Email ou senha incorretos.'],
    ['user_already_exists', 'Já existe uma conta com esse email. Use Entrar.'],
    ['weak_password', 'A senha precisa ter pelo menos 6 caracteres.'],
  ])('traduz %s', (code, esperado) => {
    expect(mensagemDeErro({ code })).toBe(esperado)
  })

  it('usa a mensagem genérica para código desconhecido', () => {
    expect(mensagemDeErro({ code: 'over_request_rate_limit' })).toBe(MENSAGEM_GENERICA)
  })

  it('usa a mensagem genérica sem código', () => {
    expect(mensagemDeErro({})).toBe(MENSAGEM_GENERICA)
    expect(mensagemDeErro(null)).toBe(MENSAGEM_GENERICA)
  })

  it('não confunde código com propriedade herdada de Object', () => {
    expect(mensagemDeErro({ code: 'constructor' })).toBe(MENSAGEM_GENERICA)
  })
})
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run lib/auth/mensagens.test.ts`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 7: Implementar**

`lib/auth/mensagens.ts`:

```ts
/** Códigos do Supabase Auth que têm mensagem própria. */
const MENSAGENS: Record<string, string> = {
  invalid_credentials: 'Email ou senha incorretos.',
  user_already_exists: 'Já existe uma conta com esse email. Use Entrar.',
  weak_password: 'A senha precisa ter pelo menos 6 caracteres.',
}

export const MENSAGEM_GENERICA = 'Não foi possível entrar agora. Tente de novo.'

/**
 * Cadastro que volta sem sessão: acontece se a confirmação por email
 * estiver ligada no painel do Supabase (spec §9, passo 1). Sem esta
 * mensagem, o botão não faria nada visível.
 */
export const MENSAGEM_SEM_SESSAO =
  'Conta criada, mas o login não foi concluído. Tente Entrar.'

export function mensagemDeErro(erro: { code?: string } | null | undefined): string {
  const codigo = erro?.code
  // Object.hasOwn: MENSAGENS['constructor'] existe por herança e não é mensagem.
  if (codigo && Object.hasOwn(MENSAGENS, codigo)) return MENSAGENS[codigo]
  return MENSAGEM_GENERICA
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run lib/auth/mensagens.test.ts`
Expected: PASS.

- [ ] **Step 9: Escrever os testes de `ids`**

`lib/watchlist/ids.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MAXIMO_NA_LISTA, idValido, sanitizarIds } from './ids'

describe('idValido', () => {
  it.each([1, 550, 2_147_483_647])('aceita %s', (valor) => {
    expect(idValido(valor)).toBe(true)
  })

  it.each([0, -1, 1.5, Number.NaN, Infinity, 2_147_483_648, '550', null, undefined])(
    'recusa %s',
    (valor) => {
      expect(idValido(valor)).toBe(false)
    },
  )
})

describe('sanitizarIds', () => {
  it('mantém só inteiros positivos, sem repetição, na ordem original', () => {
    expect(sanitizarIds([550, 'x', 13, -4, 550, 1.5, 13, 7])).toEqual([550, 13, 7])
  })

  it(`corta em ${MAXIMO_NA_LISTA}`, () => {
    const muitos = Array.from({ length: 80 }, (_, i) => i + 1)
    expect(sanitizarIds(muitos)).toHaveLength(MAXIMO_NA_LISTA)
  })

  it('devolve lista vazia para o que não é array', () => {
    expect(sanitizarIds('550,13')).toEqual([])
    expect(sanitizarIds(null)).toEqual([])
    expect(sanitizarIds({ 0: 550 })).toEqual([])
  })
})
```

- [ ] **Step 10: Rodar e ver falhar**

Run: `npx vitest run lib/watchlist/ids.test.ts`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 11: Implementar**

`lib/watchlist/ids.ts`:

```ts
/** Teto da lista exibida e importada. Ver as limitações conhecidas no spec, §8. */
export const MAXIMO_NA_LISTA = 50

/** Maior valor da coluna `integer` do Postgres. */
const MAIOR_INTEGER = 2_147_483_647

export function idValido(valor: unknown): valor is number {
  return (
    typeof valor === 'number' && Number.isInteger(valor) && valor > 0 && valor <= MAIOR_INTEGER
  )
}

/**
 * Para ids que vêm de fora: do localStorage (que qualquer script da página
 * pode ter escrito) ou do argumento de uma Server Action (que qualquer um
 * pode chamar com o que quiser).
 */
export function sanitizarIds(valor: unknown): number[] {
  if (!Array.isArray(valor)) return []
  return Array.from(new Set(valor.filter(idValido))).slice(0, MAXIMO_NA_LISTA)
}
```

- [ ] **Step 12: Rodar e ver passar**

Run: `npx vitest run lib/auth lib/watchlist`
Expected: PASS.

- [ ] **Step 13: Portões e commit**

Run: `npm test && npm run lint && npx tsc --noEmit`

```bash
git add lib/auth lib/watchlist
git commit -m "feat: validacao de redirecionamento, mensagens de login e ids da lista"
```

---

### Task 3: `proxy.ts` — renovar a sessão e barrar `/minha-lista` sem conta

**Files:**
- Create: `lib/supabase/proxy.ts`, `lib/supabase/proxy.test.ts`
- Create: `proxy.ts`

**Interfaces:**
- Consumes: `configSupabase()` (Task 1)
- Produces: `atualizarSessao(request: NextRequest): Promise<NextResponse>`

Antes de começar, leia `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

- [ ] **Step 1: Escrever o teste**

`lib/supabase/proxy.test.ts`. A primeira linha força o ambiente Node: `NextRequest` e `NextResponse` precisam do `Request`/`Response` nativos, não os do jsdom.

```ts
// @vitest-environment node
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type CookieParaGravar = { name: string; value: string; options: Record<string, unknown> }
type SetAll = (cookies: CookieParaGravar[], cabecalhos: Record<string, string>) => void

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  setAll: undefined as SetAll | undefined,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _chave: string, opcoes: { cookies: { setAll: SetAll } }) => {
    mocks.setAll = opcoes.cookies.setAll
    return { auth: { getClaims: mocks.getClaims } }
  },
}))

import { atualizarSessao } from './proxy'

const LOGADO = { data: { claims: { sub: 'usuario-1' } }, error: null }
const DESLOGADO = { data: null, error: null }

function pedido(caminho: string) {
  return new NextRequest(new URL(caminho, 'http://localhost:3000'))
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
  mocks.getClaims.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('atualizarSessao', () => {
  it('deixa a home passar sem sessão', async () => {
    mocks.getClaims.mockResolvedValue(DESLOGADO)

    const resposta = await atualizarSessao(pedido('/'))

    expect(resposta.headers.get('location')).toBeNull()
  })

  it('manda /minha-lista sem sessão para /entrar, guardando o destino', async () => {
    mocks.getClaims.mockResolvedValue(DESLOGADO)

    const resposta = await atualizarSessao(pedido('/minha-lista'))

    const destino = new URL(resposta.headers.get('location') ?? '')
    expect(resposta.status).toBe(307)
    expect(destino.pathname).toBe('/entrar')
    expect(destino.searchParams.get('proximo')).toBe('/minha-lista')
  })

  it('deixa /minha-lista passar com sessão', async () => {
    mocks.getClaims.mockResolvedValue(LOGADO)

    const resposta = await atualizarSessao(pedido('/minha-lista'))

    expect(resposta.headers.get('location')).toBeNull()
  })

  it('grava na resposta os cookies e cabeçalhos que o Supabase renovou', async () => {
    mocks.getClaims.mockImplementation(async () => {
      mocks.setAll?.([{ name: 'sb-token', value: 'novo', options: { path: '/' } }], {
        'Cache-Control': 'private, no-store',
      })
      return LOGADO
    })

    const resposta = await atualizarSessao(pedido('/explorar'))

    expect(resposta.cookies.get('sb-token')?.value).toBe('novo')
    expect(resposta.headers.get('cache-control')).toBe('private, no-store')
  })

  it('leva os cookies renovados junto no redirecionamento', async () => {
    // Sessão expirada que o Supabase limpou: o cookie limpo tem de chegar
    // ao navegador mesmo quando a resposta é um redirecionamento.
    mocks.getClaims.mockImplementation(async () => {
      mocks.setAll?.([{ name: 'sb-token', value: '', options: { path: '/', maxAge: 0 } }], {
        'Cache-Control': 'private, no-store',
      })
      return DESLOGADO
    })

    const resposta = await atualizarSessao(pedido('/minha-lista'))

    expect(resposta.headers.get('location')).not.toBeNull()
    expect(resposta.cookies.get('sb-token')?.value).toBe('')
    expect(resposta.headers.get('cache-control')).toBe('private, no-store')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/supabase/proxy.test.ts`
Expected: FAIL, módulo `./proxy` não encontrado.

- [ ] **Step 3: Implementar `atualizarSessao`**

`lib/supabase/proxy.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { configSupabase } from './config'

const ROTAS_COM_CONTA = ['/minha-lista']

function exigeConta(caminho: string): boolean {
  return ROTAS_COM_CONTA.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`))
}

/**
 * Roda antes de toda rota (ver proxy.ts). Faz duas coisas:
 *
 * 1. Renova a sessão. getClaims() troca um token expirado por um novo e o
 *    Supabase devolve os cookies novos por setAll. Sem isso a pessoa é
 *    deslogada sem motivo quando o token vence.
 * 2. Redireciona /minha-lista sem sessão para /entrar. É uma checagem
 *    otimista (guia de autenticação do Next): a página confere a sessão de
 *    novo no servidor, e o RLS é quem de fato protege os dados.
 */
export async function atualizarSessao(request: NextRequest): Promise<NextResponse> {
  const { url, chave } = configSupabase()
  let resposta = NextResponse.next({ request })
  let cabecalhosDeCache: Record<string, string> = {}

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesParaGravar, cabecalhos) {
        // O pedido também recebe os cookies novos: é dele que as páginas
        // leem a sessão nesta mesma requisição.
        cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value))
        resposta = NextResponse.next({ request })
        cookiesParaGravar.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options),
        )
        // Resposta que grava cookie de sessão não pode ficar em cache de
        // CDN, senão o token de uma pessoa é servido a outra.
        cabecalhosDeCache = cabecalhos
        Object.entries(cabecalhos).forEach(([nome, valor]) => resposta.headers.set(nome, valor))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()

  if (data?.claims || !exigeConta(request.nextUrl.pathname)) {
    return resposta
  }

  const destino = request.nextUrl.clone()
  destino.pathname = '/entrar'
  destino.search = ''
  destino.searchParams.set('proximo', request.nextUrl.pathname)

  const redirecionamento = NextResponse.redirect(destino)
  resposta.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie))
  Object.entries(cabecalhosDeCache).forEach(([nome, valor]) =>
    redirecionamento.headers.set(nome, valor),
  )
  return redirecionamento
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/supabase/proxy.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Ligar ao Next**

`proxy.ts` (raiz do projeto, ao lado de `app/`):

```ts
import type { NextRequest } from 'next/server'
import { atualizarSessao } from '@/lib/supabase/proxy'

// Next 16: "middleware.ts" foi renomeado para "proxy.ts", com export "proxy".
export async function proxy(request: NextRequest) {
  return atualizarSessao(request)
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens: renovar sessão ali é custo sem ganho.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

- [ ] **Step 6: Portões e commit**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`
Expected: tudo verde. A saída do build lista `ƒ Proxy (Middleware)` ou equivalente, e nenhum aviso de `middleware` deprecado.

```bash
git add proxy.ts lib/supabase/proxy.ts lib/supabase/proxy.test.ts
git commit -m "feat: proxy renova a sessao e barra /minha-lista sem conta"
```

---

### Task 4: Server Actions e leitura da lista no servidor

**Files:**
- Create: `lib/watchlist/actions.ts`, `lib/watchlist/actions.test.ts`
- Create: `lib/watchlist/leitura.ts`, `lib/watchlist/leitura.test.ts`

**Interfaces:**
- Consumes: `criarClienteServidor()`, `idDoUsuario()` (Task 1); `idValido`, `sanitizarIds`, `MAXIMO_NA_LISTA` (Task 2)
- Produces:
  - `type ResultadoDaLista = { ok: true } | { ok: false; motivo: 'sem-sessao' | 'id-invalido' | 'erro' }`
  - `salvarNaLista(id: number): Promise<ResultadoDaLista>`
  - `removerDaLista(id: number): Promise<ResultadoDaLista>`
  - `importarLista(ids: unknown): Promise<ResultadoDaLista>`
  - `type MinhaLista = { logado: false } | { logado: true; usuarioId: string; ids: number[]; erro: boolean }`
  - `lerMinhaLista(): Promise<MinhaLista>`

- [ ] **Step 1: Escrever os testes das actions**

`lib/watchlist/actions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clienteServidorFalso, type ResultadoFalso } from '@/test/supabase-falso'

const mocks = vi.hoisted(() => ({
  cliente: undefined as unknown,
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', async (original) => ({
  ...(await original<typeof import('@/lib/supabase/server')>()),
  criarClienteServidor: async () => mocks.cliente,
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { importarLista, removerDaLista, salvarNaLista } from './actions'

function preparar(opcoes: { usuarioId?: string | null; resultado?: ResultadoFalso } = {}) {
  const falso = clienteServidorFalso(opcoes)
  mocks.cliente = falso.cliente
  return falso
}

beforeEach(() => {
  mocks.revalidatePath.mockReset()
})

describe('salvarNaLista', () => {
  it('insere o filme na lista de quem está na sessão, sem erro se já estiver lá', async () => {
    const { cliente, chamadas } = preparar({ usuarioId: 'usuario-1' })

    expect(await salvarNaLista(550)).toEqual({ ok: true })

    expect(cliente.from).toHaveBeenCalledWith('watchlist')
    expect(chamadas).toEqual([
      {
        metodo: 'upsert',
        args: [
          { user_id: 'usuario-1', movie_id: 550 },
          { onConflict: 'user_id,movie_id', ignoreDuplicates: true },
        ],
      },
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/minha-lista')
  })

  it('recusa sem sessão, sem tocar no banco', async () => {
    const { cliente } = preparar({ usuarioId: null })

    expect(await salvarNaLista(550)).toEqual({ ok: false, motivo: 'sem-sessao' })
    expect(cliente.from).not.toHaveBeenCalled()
  })

  it.each([1.5, -1, 0, '550'])('recusa o id %s antes de abrir a sessão', async (id) => {
    const { cliente } = preparar()

    expect(await salvarNaLista(id as number)).toEqual({ ok: false, motivo: 'id-invalido' })
    expect(cliente.auth.getClaims).not.toHaveBeenCalled()
  })

  it('devolve erro e não revalida quando o banco falha', async () => {
    preparar({ resultado: { data: null, error: { message: 'falhou' } } })

    expect(await salvarNaLista(550)).toEqual({ ok: false, motivo: 'erro' })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('removerDaLista', () => {
  it('apaga só a linha deste usuário e deste filme', async () => {
    const { chamadas } = preparar({ usuarioId: 'usuario-1' })

    expect(await removerDaLista(550)).toEqual({ ok: true })

    expect(chamadas).toEqual([
      { metodo: 'delete', args: [] },
      { metodo: 'eq', args: ['user_id', 'usuario-1'] },
      { metodo: 'eq', args: ['movie_id', 550] },
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/minha-lista')
  })

  it('recusa sem sessão', async () => {
    preparar({ usuarioId: null })

    expect(await removerDaLista(550)).toEqual({ ok: false, motivo: 'sem-sessao' })
  })
})

describe('importarLista', () => {
  it('insere em lote os ids válidos, sem repetição', async () => {
    const { chamadas } = preparar({ usuarioId: 'usuario-1' })

    expect(await importarLista([550, 'x', 13, 550, -2])).toEqual({ ok: true })

    expect(chamadas).toEqual([
      {
        metodo: 'upsert',
        args: [
          [
            { user_id: 'usuario-1', movie_id: 550 },
            { user_id: 'usuario-1', movie_id: 13 },
          ],
          { onConflict: 'user_id,movie_id', ignoreDuplicates: true },
        ],
      },
    ])
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/minha-lista')
  })

  it('não toca no banco quando não sobra nenhum id válido', async () => {
    const { cliente } = preparar()

    expect(await importarLista(['x', -1])).toEqual({ ok: true })
    expect(cliente.from).not.toHaveBeenCalled()
  })

  it('recusa sem sessão', async () => {
    preparar({ usuarioId: null })

    expect(await importarLista([550])).toEqual({ ok: false, motivo: 'sem-sessao' })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/watchlist/actions.test.ts`
Expected: FAIL, módulo `./actions` não encontrado.

- [ ] **Step 3: Implementar as actions**

`lib/watchlist/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteServidor, idDoUsuario } from '@/lib/supabase/server'
import { idValido, sanitizarIds } from './ids'

export type ResultadoDaLista =
  | { ok: true }
  | { ok: false; motivo: 'sem-sessao' | 'id-invalido' | 'erro' }

// Filme já salvo não é erro: salvar de novo e reimportar não fazem nada.
const SEM_DUPLICATA = { onConflict: 'user_id,movie_id', ignoreDuplicates: true }

/*
 * Server Actions são endpoints públicos: qualquer um pode chamá-las com
 * qualquer argumento. Por isso cada uma valida o id e confere a sessão por
 * conta própria, sem confiar no proxy.ts. O user_id vem sempre da sessão,
 * nunca do argumento, e o RLS confere de novo no banco.
 */

export async function salvarNaLista(id: number): Promise<ResultadoDaLista> {
  if (!idValido(id)) return { ok: false, motivo: 'id-invalido' }

  const supabase = await criarClienteServidor()
  const usuarioId = await idDoUsuario(supabase)
  if (!usuarioId) return { ok: false, motivo: 'sem-sessao' }

  const { error } = await supabase
    .from('watchlist')
    .upsert({ user_id: usuarioId, movie_id: id }, SEM_DUPLICATA)
  if (error) return { ok: false, motivo: 'erro' }

  revalidatePath('/minha-lista')
  return { ok: true }
}

export async function removerDaLista(id: number): Promise<ResultadoDaLista> {
  if (!idValido(id)) return { ok: false, motivo: 'id-invalido' }

  const supabase = await criarClienteServidor()
  const usuarioId = await idDoUsuario(supabase)
  if (!usuarioId) return { ok: false, motivo: 'sem-sessao' }

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', usuarioId)
    .eq('movie_id', id)
  if (error) return { ok: false, motivo: 'erro' }

  revalidatePath('/minha-lista')
  return { ok: true }
}

export async function importarLista(ids: unknown): Promise<ResultadoDaLista> {
  const validos = sanitizarIds(ids)

  const supabase = await criarClienteServidor()
  const usuarioId = await idDoUsuario(supabase)
  if (!usuarioId) return { ok: false, motivo: 'sem-sessao' }
  if (validos.length === 0) return { ok: true }

  const linhas = validos.map((movieId) => ({ user_id: usuarioId, movie_id: movieId }))
  const { error } = await supabase.from('watchlist').upsert(linhas, SEM_DUPLICATA)
  if (error) return { ok: false, motivo: 'erro' }

  revalidatePath('/minha-lista')
  return { ok: true }
}
```

Atenção à ordem no `importarLista`: a sessão é conferida antes do "nada para importar". O teste "recusa sem sessão" usa `[550]`, então as duas ordens passam; esta é a escolhida porque não revela a quem está deslogado se a lista estava vazia.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/watchlist/actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever os testes da leitura**

`lib/watchlist/leitura.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { clienteServidorFalso, type ResultadoFalso } from '@/test/supabase-falso'

const mocks = vi.hoisted(() => ({ cliente: undefined as unknown }))

vi.mock('@/lib/supabase/server', async (original) => ({
  ...(await original<typeof import('@/lib/supabase/server')>()),
  criarClienteServidor: async () => mocks.cliente,
}))

import { lerMinhaLista } from './leitura'

function preparar(opcoes: { usuarioId?: string | null; resultado?: ResultadoFalso } = {}) {
  const falso = clienteServidorFalso(opcoes)
  mocks.cliente = falso.cliente
  return falso
}

describe('lerMinhaLista', () => {
  it('sem sessão, diz que não está logado e não consulta a tabela', async () => {
    const { cliente } = preparar({ usuarioId: null })

    expect(await lerMinhaLista()).toEqual({ logado: false })
    expect(cliente.from).not.toHaveBeenCalled()
  })

  it('com sessão, lê os ids na ordem em que foram salvos, até 50', async () => {
    const { chamadas } = preparar({
      usuarioId: 'usuario-1',
      resultado: { data: [{ movie_id: 550 }, { movie_id: 13 }], error: null },
    })

    expect(await lerMinhaLista()).toEqual({
      logado: true,
      usuarioId: 'usuario-1',
      ids: [550, 13],
      erro: false,
    })
    expect(chamadas).toEqual([
      { metodo: 'select', args: ['movie_id'] },
      { metodo: 'order', args: ['created_at', { ascending: true }] },
      { metodo: 'limit', args: [50] },
    ])
  })

  it('com falha do banco, sinaliza erro com lista vazia', async () => {
    preparar({ resultado: { data: null, error: { message: 'falhou' } } })

    expect(await lerMinhaLista()).toEqual({
      logado: true,
      usuarioId: 'usuario-1',
      ids: [],
      erro: true,
    })
  })
})
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run lib/watchlist/leitura.test.ts`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 7: Implementar a leitura**

`lib/watchlist/leitura.ts`:

```ts
import 'server-only'
import { criarClienteServidor, idDoUsuario } from '@/lib/supabase/server'
import { MAXIMO_NA_LISTA } from './ids'

export type MinhaLista =
  | { logado: false }
  | { logado: true; usuarioId: string; ids: number[]; erro: boolean }

export async function lerMinhaLista(): Promise<MinhaLista> {
  const supabase = await criarClienteServidor()
  const usuarioId = await idDoUsuario(supabase)
  if (!usuarioId) return { logado: false }

  // Sem filtro por user_id: o RLS já devolve só as linhas desta sessão.
  const { data, error } = await supabase
    .from('watchlist')
    .select('movie_id')
    .order('created_at', { ascending: true })
    .limit(MAXIMO_NA_LISTA)

  if (error || !data) return { logado: true, usuarioId, ids: [], erro: true }

  return {
    logado: true,
    usuarioId,
    ids: data.map((linha: { movie_id: number }) => linha.movie_id),
    erro: false,
  }
}
```

- [ ] **Step 8: Rodar, portões e commit**

Run: `npx vitest run lib/watchlist && npm test && npm run lint && npx tsc --noEmit`
Expected: tudo verde.

```bash
git add lib/watchlist/actions.ts lib/watchlist/actions.test.ts lib/watchlist/leitura.ts lib/watchlist/leitura.test.ts
git commit -m "feat: server actions da lista e leitura no servidor"
```

---

### Task 5: `WatchlistProvider` e `useWatchlist()`

**Files:**
- Create: `components/watchlist-provider.tsx`, `components/watchlist-provider.test.tsx`
- Create: `test/contexto-watchlist.tsx`
- Modify: `app/layout.tsx` (envolver o conteúdo do `<body>` com o provider)

**Interfaces:**
- Consumes: `clienteNavegador()` (Task 1); `salvarNaLista`, `removerDaLista`, `ResultadoDaLista` (Task 4)
- Produces:
  ```ts
  type WatchlistContexto = {
    pronto: boolean
    logado: boolean
    email: string | null
    ids: number[]
    alternar: (id: number) => void
    recarregar: () => void
    sair: () => Promise<void>
  }
  ```
  `ContextoWatchlist`, `WatchlistProvider({ children })`, `useWatchlist(): WatchlistContexto`
- Produces (testes): `ComContexto({ valor?, children })` e `contextoDeTeste(sobrescrever?): WatchlistContexto`

- [ ] **Step 1: Escrever o teste**

`components/watchlist-provider.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoFalso } from '@/test/supabase-falso'

type AoMudarSessao = (evento: string, sessao: unknown) => void

const mocks = vi.hoisted(() => ({
  aoMudarSessao: undefined as AoMudarSessao | undefined,
  resultadoDaLista: { data: [], error: null } as ResultadoFalso,
  consultas: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  salvarNaLista: vi.fn(),
  removerDaLista: vi.fn(),
}))

vi.mock('@/lib/supabase/browser', async () => {
  const { consultaFalsa } = await import('@/test/supabase-falso')
  return {
    clienteNavegador: () => ({
      auth: {
        onAuthStateChange: (callback: AoMudarSessao) => {
          mocks.aoMudarSessao = callback
          return { data: { subscription: { unsubscribe: () => {} } } }
        },
        signOut: mocks.signOut,
      },
      from: (tabela: string) => {
        mocks.consultas(tabela)
        return consultaFalsa(mocks.resultadoDaLista).consulta
      },
    }),
  }
})

vi.mock('@/lib/watchlist/actions', () => ({
  salvarNaLista: mocks.salvarNaLista,
  removerDaLista: mocks.removerDaLista,
}))

import { WatchlistProvider, useWatchlist } from './watchlist-provider'

const ANA = { user: { id: 'usuario-1', email: 'ana@exemplo.com' } }

function montar() {
  return renderHook(() => useWatchlist(), { wrapper: WatchlistProvider })
}

function sessao(evento: string, valor: unknown) {
  act(() => mocks.aoMudarSessao?.(evento, valor))
}

beforeEach(() => {
  mocks.resultadoDaLista = { data: [], error: null }
  mocks.consultas.mockReset()
  mocks.salvarNaLista.mockReset()
  mocks.removerDaLista.mockReset()
  mocks.signOut.mockClear()
})

describe('useWatchlist', () => {
  it('fora do provider, não está pronto', () => {
    const { result } = renderHook(() => useWatchlist())

    expect(result.current.pronto).toBe(false)
    expect(result.current.ids).toEqual([])
  })

  it('não está pronto antes de saber se há sessão', () => {
    const { result } = montar()

    expect(result.current.pronto).toBe(false)
  })

  it('sem sessão, fica pronto e deslogado sem consultar a tabela', () => {
    const { result } = montar()

    sessao('INITIAL_SESSION', null)

    expect(result.current).toMatchObject({ pronto: true, logado: false, email: null, ids: [] })
    expect(mocks.consultas).not.toHaveBeenCalled()
  })

  it('com sessão, carrega os ids e o email', async () => {
    mocks.resultadoDaLista = { data: [{ movie_id: 550 }, { movie_id: 13 }], error: null }
    const { result } = montar()

    sessao('INITIAL_SESSION', ANA)
    expect(result.current.pronto).toBe(false)

    await waitFor(() => expect(result.current.pronto).toBe(true))
    expect(result.current).toMatchObject({
      logado: true,
      email: 'ana@exemplo.com',
      ids: [550, 13],
    })
    expect(mocks.consultas).toHaveBeenCalledWith('watchlist')
  })

  it('não relê a lista quando só o token foi renovado', async () => {
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    sessao('TOKEN_REFRESHED', ANA)

    expect(mocks.consultas).toHaveBeenCalledTimes(1)
  })

  it('salva na hora, antes da resposta do servidor', async () => {
    mocks.salvarNaLista.mockReturnValue(new Promise(() => {}))
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    act(() => result.current.alternar(550))

    expect(result.current.ids).toEqual([550])
    expect(mocks.salvarNaLista).toHaveBeenCalledWith(550)
  })

  it('desfaz quando o servidor recusa', async () => {
    mocks.salvarNaLista.mockResolvedValue({ ok: false, motivo: 'erro' })
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    act(() => result.current.alternar(550))

    await waitFor(() => expect(result.current.ids).toEqual([]))
  })

  it('desfaz quando a chamada falha na rede', async () => {
    mocks.salvarNaLista.mockRejectedValue(new Error('sem rede'))
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    act(() => result.current.alternar(550))

    await waitFor(() => expect(result.current.ids).toEqual([]))
  })

  it('tira da lista um filme já salvo', async () => {
    mocks.resultadoDaLista = { data: [{ movie_id: 550 }], error: null }
    mocks.removerDaLista.mockResolvedValue({ ok: true })
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.ids).toEqual([550]))

    act(() => result.current.alternar(550))

    expect(result.current.ids).toEqual([])
    expect(mocks.removerDaLista).toHaveBeenCalledWith(550)
  })

  it('recarregar relê a lista do banco', async () => {
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.pronto).toBe(true))

    mocks.resultadoDaLista = { data: [{ movie_id: 7 }], error: null }
    act(() => result.current.recarregar())

    await waitFor(() => expect(result.current.ids).toEqual([7]))
  })

  it('sair encerra a sessão no Supabase', async () => {
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)

    await act(() => result.current.sair())

    expect(mocks.signOut).toHaveBeenCalled()
  })

  it('ao sair, esquece os ids', async () => {
    mocks.resultadoDaLista = { data: [{ movie_id: 550 }], error: null }
    const { result } = montar()
    sessao('INITIAL_SESSION', ANA)
    await waitFor(() => expect(result.current.ids).toEqual([550]))

    sessao('SIGNED_OUT', null)

    expect(result.current).toMatchObject({ pronto: true, logado: false, ids: [] })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run components/watchlist-provider.test.tsx`
Expected: FAIL, módulo `./watchlist-provider` não encontrado.

- [ ] **Step 3: Implementar**

`components/watchlist-provider.tsx`:

```tsx
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clienteNavegador } from '@/lib/supabase/browser'
import { removerDaLista, salvarNaLista, type ResultadoDaLista } from '@/lib/watchlist/actions'

export type WatchlistContexto = {
  /** Já sabe se há sessão e, havendo, quais filmes estão salvos. */
  pronto: boolean
  logado: boolean
  email: string | null
  /** Na ordem em que foram salvos. */
  ids: number[]
  /** Salva ou tira da lista. Muda na hora e desfaz se o servidor recusar. */
  alternar: (id: number) => void
  /** Relê a lista do banco (depois de uma importação, por exemplo). */
  recarregar: () => void
  sair: () => Promise<void>
}

const SEM_IDS: number[] = []

/**
 * Valor fora do provider (testes de componente isolado): o mesmo estado de
 * antes da hidratação, com o botão desabilitado e sem saber de nada.
 */
export const ContextoWatchlist = createContext<WatchlistContexto>({
  pronto: false,
  logado: false,
  email: null,
  ids: SEM_IDS,
  alternar: () => {},
  recarregar: () => {},
  sair: async () => {},
})

type Usuario = { id: string; email: string | null }
type Sessao = { user?: { id: string; email?: string } } | null

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [sessaoConhecida, setSessaoConhecida] = useState(false)
  const [ids, setIds] = useState<number[]>(SEM_IDS)
  // De quem são os `ids` carregados. Evita mostrar a lista de uma conta
  // como se fosse da seguinte, na troca de usuário no mesmo navegador.
  const [idsDoUsuario, setIdsDoUsuario] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    const { data } = clienteNavegador().auth.onAuthStateChange((_evento, sessao: Sessao) => {
      // Só guarda o que chegou. Chamar o Supabase de dentro deste callback
      // trava o cliente (aviso da documentação do supabase-js); a leitura
      // da lista fica no efeito abaixo, disparado pela troca de usuário.
      const user = sessao?.user
      setUsuario(user ? { id: user.id, email: user.email ?? null } : null)
      setSessaoConhecida(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const usuarioId = usuario?.id ?? null

  useEffect(() => {
    if (!usuarioId) return

    let ativo = true
    // Sem filtro por user_id: o RLS já devolve só as linhas desta sessão.
    clienteNavegador()
      .from('watchlist')
      .select('movie_id')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!ativo) return
        setIds(error || !data ? SEM_IDS : data.map((linha: { movie_id: number }) => linha.movie_id))
        setIdsDoUsuario(usuarioId)
      })

    return () => {
      ativo = false
    }
  }, [usuarioId, versao])

  const alternar = useCallback(
    (id: number) => {
      const jaSalvo = ids.includes(id)
      const aplicar = (salvar: boolean) =>
        setIds((atual) =>
          salvar ? (atual.includes(id) ? atual : [...atual, id]) : atual.filter((x) => x !== id),
        )

      aplicar(!jaSalvo)
      const acao: Promise<ResultadoDaLista> = jaSalvo ? removerDaLista(id) : salvarNaLista(id)
      acao.then(
        (resultado) => {
          if (!resultado.ok) aplicar(jaSalvo)
        },
        () => aplicar(jaSalvo),
      )
    },
    [ids],
  )

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  const sair = useCallback(async () => {
    await clienteNavegador().auth.signOut()
  }, [])

  const logado = usuarioId !== null
  const pronto = sessaoConhecida && (!logado || idsDoUsuario === usuarioId)

  const valor = useMemo<WatchlistContexto>(
    () => ({
      pronto,
      logado,
      email: usuario?.email ?? null,
      ids: logado ? ids : SEM_IDS,
      alternar,
      recarregar,
      sair,
    }),
    [pronto, logado, usuario?.email, ids, alternar, recarregar, sair],
  )

  return <ContextoWatchlist.Provider value={valor}>{children}</ContextoWatchlist.Provider>
}

export function useWatchlist(): WatchlistContexto {
  return useContext(ContextoWatchlist)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run components/watchlist-provider.test.tsx`
Expected: PASS (12 testes).

- [ ] **Step 5: Criar o contexto de teste para as próximas tarefas**

`test/contexto-watchlist.tsx`:

```tsx
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { ContextoWatchlist, type WatchlistContexto } from '@/components/watchlist-provider'

/** Contexto pronto e logado, sem nada salvo. Cada teste muda só o que importa. */
export function contextoDeTeste(sobrescrever: Partial<WatchlistContexto> = {}): WatchlistContexto {
  return {
    pronto: true,
    logado: true,
    email: 'ana@exemplo.com',
    ids: [],
    alternar: vi.fn(),
    recarregar: vi.fn(),
    sair: vi.fn(async () => {}),
    ...sobrescrever,
  }
}

export function ComContexto({ valor, children }: { valor: WatchlistContexto; children: ReactNode }) {
  return <ContextoWatchlist.Provider value={valor}>{children}</ContextoWatchlist.Provider>
}
```

- [ ] **Step 6: Colocar o provider no layout**

Em `app/layout.tsx`, importar `import { WatchlistProvider } from '@/components/watchlist-provider'` e envolver **tudo dentro de `<body>`** (o link "Pular para o conteúdo", `SiteHeader`, `main` e `SiteFooter`) com `<WatchlistProvider>…</WatchlistProvider>`. Nada mais muda no layout.

- [ ] **Step 7: Portões e commit**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: tudo verde.

```bash
git add components/watchlist-provider.tsx components/watchlist-provider.test.tsx test/contexto-watchlist.tsx app/layout.tsx
git commit -m "feat: WatchlistProvider le a lista da conta e alterna de forma otimista"
```

---

### Task 6: `/minha-lista` no servidor

**Files:**
- Modify: `lib/tmdb/mappers.ts` (acrescentar `resumirFilme`), `lib/tmdb/mappers.test.ts`
- Modify: `lib/tmdb/movies.ts` (acrescentar `getMoviesById`), `lib/tmdb/movies.test.ts`
- Create: `components/minha-lista-conteudo.tsx`, `components/minha-lista-conteudo.test.tsx`
- Modify: `app/minha-lista/page.tsx` (reescrita)
- Modify: `test/a11y.test.tsx`
- Delete: `app/api/filmes/route.ts`, `app/api/filmes/route.test.ts`, `components/watchlist-view.tsx`, `components/watchlist-view.test.tsx`

**Interfaces:**
- Consumes: `lerMinhaLista()` (Task 4); `urlDeEntrar()` (Task 2)
- Produces: `resumirFilme(filme: MovieDetail): Movie`, `getMoviesById(ids: number[]): Promise<Movie[]>`, `MinhaListaConteudo({ totalSalvo, filmes, erro })`

Até a Task 7, o botão de estrela ainda grava no `localStorage` enquanto esta página lê do banco. Até a Task 8, o redirecionamento para `/entrar` cai num 404. As duas coisas são esperadas no meio do plano.

- [ ] **Step 1: Ler o que sai**

Leia `app/api/filmes/route.ts` e `app/api/filmes/route.test.ts`. O comportamento que precisa sobreviver é: o mapeamento enxuto (só os 10 campos de `Movie`), a omissão de um id que falha no TMDB e a ordem dos ids. A deduplicação e o teto de 50 agora ficam no banco (chave primária) e em `lerMinhaLista` (`limit(50)`).

- [ ] **Step 2: Escrever o teste de `resumirFilme`**

Acrescentar a `lib/tmdb/mappers.test.ts` (ajuste o import existente para incluir `resumirFilme`, e importe `MovieDetail` de `./types`):

```ts
describe('resumirFilme', () => {
  it('fica só com os campos de Movie, sem elenco, trailer nem provedores', () => {
    const detalhe: MovieDetail = {
      id: 550,
      title: 'Clube da Luta',
      originalTitle: 'Fight Club',
      overview: 'Sinopse.',
      posterUrl: null,
      backdropUrl: null,
      releaseYear: 1999,
      rating: 8.4,
      voteCount: 900,
      genreIds: [18],
      runtimeMinutes: 139,
      genres: [{ id: 18, name: 'Drama' }],
      cast: [],
      trailerYoutubeKey: 'abc',
      watchOptions: { flatrate: [], rent: [], buy: [], tmdbLink: null },
    }

    expect(Object.keys(resumirFilme(detalhe)).sort()).toEqual(
      [
        'backdropUrl',
        'genreIds',
        'id',
        'originalTitle',
        'overview',
        'posterUrl',
        'rating',
        'releaseYear',
        'title',
        'voteCount',
      ].sort(),
    )
  })
})
```

O import do topo de `mappers.test.ts` passa a ser `import { resumirFilme, toMovie, toMovieDetail, toProvider, toWatchOptions } from './mappers'`, mais `import type { MovieDetail } from './types'`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run lib/tmdb/mappers.test.ts`
Expected: FAIL, `resumirFilme` não exportado.

- [ ] **Step 4: Implementar `resumirFilme`**

Acrescentar a `lib/tmdb/mappers.ts` (importe `Movie` e `MovieDetail` de `./types` se ainda não estiverem):

```ts
/**
 * Ruling T14-a (movido de app/api/filmes/route.ts): MovieDetail carrega
 * elenco, gêneros, trailer e provedores. O TypeScript aceita usá-lo onde se
 * espera Movie, por ser um supertipo, mas tudo isso iria junto para uma
 * tela que só desenha cards. Este mapeamento explícito é o que de fato
 * reduz o que é enviado; a anotação de tipo sozinha não faz isso.
 */
export function resumirFilme(filme: MovieDetail): Movie {
  return {
    id: filme.id,
    title: filme.title,
    originalTitle: filme.originalTitle,
    overview: filme.overview,
    posterUrl: filme.posterUrl,
    backdropUrl: filme.backdropUrl,
    releaseYear: filme.releaseYear,
    rating: filme.rating,
    voteCount: filme.voteCount,
    genreIds: filme.genreIds,
  }
}
```

- [ ] **Step 5: Escrever o teste de `getMoviesById`**

Acrescentar a `lib/tmdb/movies.test.ts` (incluir `getMoviesById` no import; o arquivo já tem `server.listen`, `resetHandlers` e o token no `beforeEach`):

```ts
describe('getMoviesById', () => {
  it('busca cada id, mantém a ordem pedida e omite o que falhou', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/movie/13', () =>
        HttpResponse.json({ id: 13, title: 'Forrest Gump', vote_average: 8.5, vote_count: 800 }),
      ),
      http.get('https://api.themoviedb.org/3/movie/404', () =>
        HttpResponse.json({ status_message: 'not found' }, { status: 404 }),
      ),
      http.get('https://api.themoviedb.org/3/movie/550', () =>
        HttpResponse.json({ id: 550, title: 'Clube da Luta', vote_average: 8.4, vote_count: 900 }),
      ),
    )

    const filmes = await getMoviesById([550, 404, 13])

    expect(filmes.map((f) => f.title)).toEqual(['Clube da Luta', 'Forrest Gump'])
    expect(filmes[0]).not.toHaveProperty('cast')
  })

  it('não faz requisição nenhuma para lista vazia', async () => {
    expect(await getMoviesById([])).toEqual([])
  })
})
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run lib/tmdb/movies.test.ts`
Expected: FAIL, `getMoviesById` não exportado.

- [ ] **Step 7: Implementar `getMoviesById`**

Acrescentar a `lib/tmdb/movies.ts` (incluir `resumirFilme` no import de `./mappers`):

```ts
/**
 * Vários filmes pelo id, na ordem pedida. Um id que não existe mais no
 * TMDB (filme removido) é omitido, em vez de derrubar a lista inteira.
 */
export async function getMoviesById(ids: number[]): Promise<Movie[]> {
  const resultados = await Promise.all(
    ids.map(async (id) => {
      try {
        return resumirFilme(await getMovie(id))
      } catch {
        return null
      }
    }),
  )

  return resultados.filter((filme): filme is Movie => filme !== null)
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run lib/tmdb`
Expected: PASS.

- [ ] **Step 9: Escrever o teste de `MinhaListaConteudo`**

`components/minha-lista-conteudo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/tmdb/types'
import { MinhaListaConteudo } from './minha-lista-conteudo'

function filme(id: number, title: string): Movie {
  return {
    id,
    title,
    originalTitle: title,
    overview: '',
    posterUrl: null,
    backdropUrl: null,
    releaseYear: 2021,
    rating: 8,
    voteCount: 100,
    genreIds: [],
  }
}

describe('MinhaListaConteudo', () => {
  it('lista vazia: convida a salvar', async () => {
    const { container } = render(<MinhaListaConteudo totalSalvo={0} filmes={[]} erro={false} />)

    expect(screen.getByText('Sua lista está vazia')).toBeInTheDocument()
    expect(
      screen.getByText('Toque na estrela de qualquer filme para guardá-lo aqui e assistir depois.'),
    ).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('salvou, mas nenhum filme carregou: mensagem diferente da lista vazia', () => {
    render(<MinhaListaConteudo totalSalvo={2} filmes={[]} erro={false} />)

    expect(screen.getByText('Não foi possível carregar sua lista')).toBeInTheDocument()
  })

  it('falha ao ler o banco: mensagem de falha, não de lista vazia', () => {
    render(<MinhaListaConteudo totalSalvo={0} filmes={[]} erro={true} />)

    expect(screen.getByText('Não foi possível carregar sua lista')).toBeInTheDocument()
    expect(screen.queryByText('Sua lista está vazia')).not.toBeInTheDocument()
  })

  it('com filmes: mostra a grade', () => {
    render(
      <MinhaListaConteudo
        totalSalvo={2}
        filmes={[filme(550, 'Clube da Luta'), filme(13, 'Forrest Gump')]}
        erro={false}
      />,
    )

    expect(screen.getByText('Clube da Luta')).toBeInTheDocument()
    expect(screen.getByText('Forrest Gump')).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Rodar e ver falhar**

Run: `npx vitest run components/minha-lista-conteudo.test.tsx`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 11: Implementar**

`components/minha-lista-conteudo.tsx`:

```tsx
import { EmptyState } from '@/components/empty-state'
import { MovieGrid } from '@/components/movie-grid'
import type { Movie } from '@/lib/tmdb/types'

type Props = {
  /** Quantos filmes estão salvos no banco. */
  totalSalvo: number
  /** Os que o TMDB devolveu. Pode ser menos que totalSalvo. */
  filmes: Movie[]
  /** A leitura do banco falhou. */
  erro: boolean
}

export function MinhaListaConteudo({ totalSalvo, filmes, erro }: Props) {
  if (!erro && totalSalvo === 0) {
    return (
      <EmptyState
        title="Sua lista está vazia"
        hint="Toque na estrela de qualquer filme para guardá-lo aqui e assistir depois."
      />
    )
  }

  // "Nunca salvou nada" e "salvou, mas não carregou" não podem compartilhar
  // o mesmo texto: o segundo precisa dizer que a lista existe.
  if (erro || filmes.length === 0) {
    return (
      <EmptyState
        title="Não foi possível carregar sua lista"
        hint="Os filmes salvos não puderam ser encontrados agora. Tente novamente mais tarde."
      />
    )
  }

  // Minha lista não é filtrada por serviço, então `servicos` fica de
  // propósito sem valor, pelo mesmo raciocínio da Busca.
  return <MovieGrid movies={filmes} />
}
```

- [ ] **Step 12: Rodar e ver passar**

Run: `npx vitest run components/minha-lista-conteudo.test.tsx`
Expected: PASS.

- [ ] **Step 13: Reescrever a página**

`app/minha-lista/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
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
      <MinhaListaConteudo totalSalvo={lista.ids.length} filmes={filmes} erro={lista.erro} />
    </div>
  )
}
```

- [ ] **Step 14: Remover o que ficou sem uso**

Run: `git rm app/api/filmes/route.ts app/api/filmes/route.test.ts components/watchlist-view.tsx components/watchlist-view.test.tsx`

Depois confira que nada mais importa esses arquivos:
Run: `npx tsc --noEmit`
Expected: os únicos erros são em `test/a11y.test.tsx` (próximo passo).

- [ ] **Step 15: Atualizar o `test/a11y.test.tsx`**

1. Trocar `import { WatchlistView } from '@/components/watchlist-view'` por `import { MinhaListaConteudo } from '@/components/minha-lista-conteudo'`.
2. Substituir o teste `'minha lista vazia (WatchlistView)'` por:

```tsx
  it('minha lista vazia (MinhaListaConteudo)', async () => {
    const { container } = render(<MinhaListaConteudo totalSalvo={0} filmes={[]} erro={false} />)
    expect(await axe(container)).toHaveNoViolations()
  })
```

3. No teste `'layout + minha lista vazia'`, trocar `<WatchlistView />` por `<MinhaListaConteudo totalSalvo={0} filmes={[]} erro={false} />`. Apagar o comentário sobre a hidratação do `usePreferences()` e o `waitFor`: o conteúdo agora nasce pronto. Manter o `expect(await axe(container)).toHaveNoViolations()`.
4. Se `screen` e `waitFor` ficarem sem uso no arquivo, remover do import.

- [ ] **Step 16: Portões, build e commit**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`
Expected: tudo verde. `/minha-lista` aparece como rota dinâmica (`ƒ`) no build.

```bash
git add -A app/minha-lista app/api components lib/tmdb test/a11y.test.tsx
git commit -m "feat: minha lista le do banco e do TMDB no servidor"
```

---

### Task 7: Botão de salvar lê da conta

**Files:**
- Create: `lib/auth/navegacao.ts`
- Modify: `components/watchlist-button.tsx`
- Create: `components/watchlist-button.test.tsx`
- Modify: `lib/hooks/use-preferences.ts` (remover `toggleWatchlist`), `lib/hooks/use-preferences.test.tsx`

**Interfaces:**
- Consumes: `useWatchlist()` (Task 5); `urlDeEntrar()` (Task 2); `contextoDeTeste`, `ComContexto` (Task 5)
- Produces: `irParaEntrar(): void`. `usePreferences()` passa a devolver `{ preferences, hydrated, setProviders, completeOnboarding }`.

- [ ] **Step 1: Criar a navegação para o login**

`lib/auth/navegacao.ts`:

```ts
import { urlDeEntrar } from './proximo'

/**
 * Navegação de página inteira, não router.push: o botão de salvar aparece
 * em componentes que os testes montam sem o roteador do Next, e ir para o
 * login não tem estado da página a preservar.
 */
export function irParaEntrar(): void {
  window.location.assign(urlDeEntrar(window.location.pathname + window.location.search))
}
```

- [ ] **Step 2: Escrever o teste do botão**

`components/watchlist-button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WatchlistContexto } from '@/components/watchlist-provider'
import { ComContexto, contextoDeTeste } from '@/test/contexto-watchlist'
import { WatchlistButton } from './watchlist-button'

const mocks = vi.hoisted(() => ({ irParaEntrar: vi.fn() }))
vi.mock('@/lib/auth/navegacao', () => ({ irParaEntrar: mocks.irParaEntrar }))

function renderizar(valor: WatchlistContexto) {
  render(
    <ComContexto valor={valor}>
      <WatchlistButton movieId={550} title="Clube da Luta" />
    </ComContexto>,
  )
  return screen.getByRole('button')
}

describe('WatchlistButton', () => {
  it('fica desabilitado até saber da sessão e da lista', () => {
    const botao = renderizar(contextoDeTeste({ pronto: false }))

    expect(botao).toBeDisabled()
  })

  it('deslogado: leva ao login em vez de salvar', async () => {
    const valor = contextoDeTeste({ logado: false, email: null })
    const botao = renderizar(valor)

    await userEvent.click(botao)

    expect(mocks.irParaEntrar).toHaveBeenCalled()
    expect(valor.alternar).not.toHaveBeenCalled()
  })

  it('logado: alterna o filme na lista', async () => {
    const valor = contextoDeTeste()
    const botao = renderizar(valor)

    await userEvent.click(botao)

    expect(valor.alternar).toHaveBeenCalledWith(550)
  })

  it('mostra que o filme está salvo', () => {
    const botao = renderizar(contextoDeTeste({ ids: [550] }))

    expect(botao).toHaveAttribute('aria-pressed', 'true')
    expect(botao).toHaveAccessibleName('Remover Clube da Luta da minha lista')
  })

  it('mostra que o filme não está salvo', () => {
    const botao = renderizar(contextoDeTeste({ ids: [13] }))

    expect(botao).toHaveAttribute('aria-pressed', 'false')
    expect(botao).toHaveAccessibleName('Salvar Clube da Luta na minha lista')
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run components/watchlist-button.test.tsx`
Expected: FAIL. O botão ainda lê do `usePreferences()`, então o teste "deslogado" não chama `irParaEntrar` e "mostra que o filme está salvo" vê `aria-pressed="false"`.

- [ ] **Step 4: Trocar a fonte do botão**

Em `components/watchlist-button.tsx`:

1. Trocar `import { usePreferences } from '@/lib/hooks/use-preferences'` por:
   ```ts
   import { irParaEntrar } from '@/lib/auth/navegacao'
   import { useWatchlist } from './watchlist-provider'
   ```
2. Trocar o comentário acima do componente por:
   ```ts
   // Componente cliente: precisa de interatividade (onClick) e da lista da
   // conta via useWatchlist(), então hidrata separado do MovieCard.
   ```
3. Trocar as duas primeiras linhas do corpo por:
   ```ts
   const { pronto, logado, ids, alternar } = useWatchlist()
   const salvo = ids.includes(movieId)
   ```
4. No `<button>`, trocar `onClick={() => toggleWatchlist(movieId)}` por `onClick={() => (logado ? alternar(movieId) : irParaEntrar())}` e `disabled={!hydrated}` por `disabled={!pronto}`.

O `aria-label`, o `aria-pressed` e o visual não mudam.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run components/watchlist-button.test.tsx`
Expected: PASS.

- [ ] **Step 6: Tirar `toggleWatchlist` do `usePreferences`**

Em `lib/hooks/use-preferences.ts`, apagar o `const toggleWatchlist = useCallback(...)` inteiro e tirá-lo do `return`, que fica:

```ts
  return { preferences, hydrated, setProviders, completeOnboarding }
```

O campo `watchlist` continua em `Preferences` e no `localStorage`: a importação (Task 9) ainda o lê.

Em `lib/hooks/use-preferences.test.tsx`, o teste `'propaga toggleWatchlist de uma instancia para outra instancia montada'` protege a sincronização entre instâncias, que continua valendo. Reescrevê-lo com `setProviders`, mantendo o comentário sobre o Finding 1 da Task 14:

```tsx
  it('propaga uma escrita de uma instancia para outra instancia montada', async () => {
    // Finding 1 da revisão da Task 14: cada usePreferences() era um
    // useState isolado — escrever numa instância nunca chegava a outra até
    // a página recarregar. Este teste monta duas instâncias independentes,
    // uma que grava e outra que só observa, e falha se a segunda não reagir.
    const instanciaA = renderHook(() => usePreferences())
    const instanciaB = renderHook(() => usePreferences())

    await waitFor(() => {
      expect(instanciaA.result.current.hydrated).toBe(true)
      expect(instanciaB.result.current.hydrated).toBe(true)
    })

    instanciaA.result.current.setProviders([8])

    await waitFor(() => {
      expect(instanciaB.result.current.preferences.providerIds).toEqual([8])
    })
    expect(instanciaA.result.current.preferences.providerIds).toEqual([8])

    instanciaA.result.current.setProviders([])

    await waitFor(() => {
      expect(instanciaB.result.current.preferences.providerIds).toEqual([])
    })
  })
```

- [ ] **Step 7: Portões e commit**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: tudo verde. O teste de a11y `'botão de watchlist'` continua passando: fora do provider o botão nasce desabilitado, como antes da hidratação.

```bash
git add lib/auth/navegacao.ts components/watchlist-button.tsx components/watchlist-button.test.tsx lib/hooks/use-preferences.ts lib/hooks/use-preferences.test.tsx
git commit -m "feat: botao de salvar usa a lista da conta e leva ao login quando deslogado"
```

---

### Task 8: Tela `/entrar` e cabeçalho com Entrar / Sair

**Files:**
- Create: `components/entrar-form.tsx`, `components/entrar-form.test.tsx`
- Create: `app/entrar/page.tsx`
- Modify: `components/site-header.tsx`
- Create: `components/site-header.test.tsx`

**Interfaces:**
- Consumes: `clienteNavegador()`, `criarClienteServidor()`, `idDoUsuario()` (Task 1); `proximoSeguro`, `urlDeEntrar`, `mensagemDeErro`, `MENSAGEM_SEM_SESSAO` (Task 2); `useWatchlist()` (Task 5)
- Produces: `EntrarForm({ proximo: string })`

- [ ] **Step 1: Escrever o teste do formulário**

`components/entrar-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))

vi.mock('@/lib/supabase/browser', () => ({
  clienteNavegador: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword, signUp: mocks.signUp },
  }),
}))

import { EntrarForm } from './entrar-form'

const COM_SESSAO = { data: { session: { access_token: 't' } }, error: null }

async function preencher() {
  await userEvent.type(screen.getByLabelText('Email'), 'ana@exemplo.com')
  await userEvent.type(screen.getByLabelText('Senha'), 'segredo123')
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
})

describe('EntrarForm', () => {
  it('Entrar: faz login e volta para onde a pessoa estava', async () => {
    mocks.signInWithPassword.mockResolvedValue(COM_SESSAO)
    render(<EntrarForm proximo="/filme/550" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@exemplo.com',
      password: 'segredo123',
    })
    expect(mocks.signUp).not.toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith('/filme/550')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('Criar conta: cadastra e já entra', async () => {
    mocks.signUp.mockResolvedValue(COM_SESSAO)
    render(<EntrarForm proximo="/minha-lista" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'ana@exemplo.com',
      password: 'segredo123',
    })
    expect(mocks.replace).toHaveBeenCalledWith('/minha-lista')
  })

  it('mostra o erro traduzido e não navega', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials' },
    })
    render(<EntrarForm proximo="/minha-lista" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Email ou senha incorretos.')).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('cadastro sem sessão (confirmação por email ligada): avisa em vez de ficar parado', async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
    render(<EntrarForm proximo="/minha-lista" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      await screen.findByText('Conta criada, mas o login não foi concluído. Tente Entrar.'),
    ).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('desabilita os dois botões enquanto envia', async () => {
    mocks.signInWithPassword.mockReturnValue(new Promise(() => {}))
    render(<EntrarForm proximo="/minha-lista" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled()
  })

  it('não tem violações de acessibilidade, nem com erro na tela', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials' },
    })
    const { container } = render(<EntrarForm proximo="/minha-lista" />)
    expect(await axe(container)).toHaveNoViolations()

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByText('Email ou senha incorretos.')

    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run components/entrar-form.test.tsx`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 3: Implementar o formulário**

`components/entrar-form.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import { MENSAGEM_SEM_SESSAO, mensagemDeErro } from '@/lib/auth/mensagens'
import { clienteNavegador } from '@/lib/supabase/browser'

type Acao = 'entrar' | 'criar'

const FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna'
const CAMPO = `w-full rounded-lg border border-contorno bg-sala px-4 py-2.5 text-texto ${FOCO}`

export function EntrarForm({ proximo }: { proximo: string }) {
  const router = useRouter()
  // Qual dos dois botões enviou. Enter num campo envia pelo primeiro botão
  // do formulário (Entrar): o navegador dispara o clique nele antes do submit.
  const acao = useRef<Acao>('entrar')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    const credenciais = {
      email: String(dados.get('email') ?? ''),
      password: String(dados.get('senha') ?? ''),
    }

    setEnviando(true)
    setErro(null)

    const auth = clienteNavegador().auth
    const { data, error } =
      acao.current === 'criar'
        ? await auth.signUp(credenciais)
        : await auth.signInWithPassword(credenciais)

    if (error || !data.session) {
      setErro(error ? mensagemDeErro(error) : MENSAGEM_SEM_SESSAO)
      setEnviando(false)
      return
    }

    // refresh() faz o servidor renderizar de novo já enxergando o cookie novo.
    router.replace(proximo)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="mx-auto flex max-w-sm flex-col gap-4 px-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-nevoa">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={CAMPO} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="text-sm text-nevoa">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className={CAMPO}
        />
      </div>

      {/* Sempre no DOM: a região aria-live precisa existir antes da mensagem para ser anunciada. */}
      <p aria-live="polite" className="min-h-5 text-sm text-texto">
        {erro}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          onClick={() => {
            acao.current = 'entrar'
          }}
          disabled={enviando}
          className={`flex-1 rounded-lg bg-lanterna px-5 py-2.5 font-medium text-noite transition hover:bg-[#ffcb60] disabled:opacity-50 ${FOCO}`}
        >
          Entrar
        </button>
        <button
          type="submit"
          onClick={() => {
            acao.current = 'criar'
          }}
          disabled={enviando}
          className={`flex-1 rounded-lg border border-contorno px-5 py-2.5 font-medium text-texto transition hover:bg-sala disabled:opacity-50 ${FOCO}`}
        >
          Criar conta
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run components/entrar-form.test.tsx`
Expected: PASS (6 testes).

- [ ] **Step 5: Criar a página**

`app/entrar/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { EntrarForm } from '@/components/entrar-form'
import { proximoSeguro } from '@/lib/auth/proximo'
import { criarClienteServidor, idDoUsuario } from '@/lib/supabase/server'

type Props = {
  searchParams: Promise<{ proximo?: string | string[] }>
}

export default async function EntrarPage({ searchParams }: Props) {
  const proximo = proximoSeguro((await searchParams).proximo)

  // Quem já está logado não tem o que fazer aqui.
  if (await idDoUsuario(await criarClienteServidor())) redirect(proximo)

  return (
    <div className="mx-auto max-w-7xl py-12">
      <h1 className="titulo px-4 pb-2 text-center text-2xl font-semibold text-texto sm:text-3xl">
        Entrar
      </h1>
      <p className="mx-auto max-w-sm px-4 pb-8 text-center text-sm text-nevoa">
        Sua lista de filmes fica salva na sua conta e aparece em qualquer navegador.
      </p>
      <EntrarForm proximo={proximo} />
    </div>
  )
}
```

- [ ] **Step 6: Escrever o teste do cabeçalho**

`components/site-header.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WatchlistContexto } from '@/components/watchlist-provider'
import { ComContexto, contextoDeTeste } from '@/test/contexto-watchlist'
import { SiteHeader } from './site-header'

const mocks = vi.hoisted(() => ({ caminho: '/filme/550', push: vi.fn(), refresh: vi.fn() }))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.caminho,
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

function renderizar(valor: WatchlistContexto) {
  render(
    <ComContexto valor={valor}>
      <SiteHeader />
    </ComContexto>,
  )
}

beforeEach(() => {
  mocks.caminho = '/filme/550'
  mocks.push.mockReset()
  mocks.refresh.mockReset()
})

describe('SiteHeader — conta', () => {
  it('antes de saber da sessão, não mostra nem Entrar nem Sair', () => {
    renderizar(contextoDeTeste({ pronto: false }))

    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('deslogado: Entrar leva ao login e volta para a página atual', () => {
    renderizar(contextoDeTeste({ logado: false, email: null }))

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/entrar?proximo=%2Ffilme%2F550',
    )
  })

  it('deslogado na própria /entrar: não mostra o link para ela mesma', () => {
    mocks.caminho = '/entrar'
    renderizar(contextoDeTeste({ logado: false, email: null }))

    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('logado: mostra o email e Sair', () => {
    renderizar(contextoDeTeste())

    expect(screen.getByText('ana@exemplo.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('Sair encerra a sessão e atualiza a página', async () => {
    const valor = contextoDeTeste()
    renderizar(valor)

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(valor.sair).toHaveBeenCalled()
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('Sair dentro da Minha lista volta para o início', async () => {
    mocks.caminho = '/minha-lista'
    renderizar(contextoDeTeste())

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(mocks.push).toHaveBeenCalledWith('/')
  })
})
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npx vitest run components/site-header.test.tsx`
Expected: FAIL, nenhum link "Entrar" nem botão "Sair".

- [ ] **Step 8: Implementar no cabeçalho**

Em `components/site-header.tsx`:

1. Imports: trocar `import { usePathname } from 'next/navigation'` por `import { usePathname, useRouter } from 'next/navigation'` e acrescentar:
   ```ts
   import { urlDeEntrar } from '@/lib/auth/proximo'
   import { useWatchlist } from './watchlist-provider'
   ```
2. Logo depois de `const pathname = usePathname()`:
   ```ts
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
   ```
3. Dentro do `<nav>`, depois do `</ul>`:
   ```tsx
   <div className="ml-auto flex shrink-0 items-center gap-4">
     {pronto && !logado && pathname !== '/entrar' && (
       <Link href={urlDeEntrar(pathname)} className={`${CONTA} font-medium text-texto hover:text-lanterna`}>
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
   ```

- [ ] **Step 9: Rodar e ver passar**

Run: `npx vitest run components/site-header.test.tsx test/a11y.test.tsx`
Expected: PASS. No a11y, o `SiteHeader` roda fora do provider (pronto = false) e o mock de `next/navigation` já inclui `useRouter`.

- [ ] **Step 10: Portões, build e commit**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`
Expected: tudo verde, com `/entrar` entre as rotas dinâmicas.

```bash
git add app/entrar components/entrar-form.tsx components/entrar-form.test.tsx components/site-header.tsx components/site-header.test.tsx
git commit -m "feat: tela de entrar com email e senha e conta no cabecalho"
```

---

### Task 9: Importar a lista que já está no navegador

**Files:**
- Create: `lib/importacao.ts`, `lib/importacao.test.ts`
- Create: `components/importar-lista.tsx`, `components/importar-lista.test.tsx`
- Modify: `app/minha-lista/page.tsx`

**Interfaces:**
- Consumes: `readPreferences()` (`lib/storage.ts`, já existe); `sanitizarIds` (Task 2); `importarLista` (Task 4); `useWatchlist().recarregar` (Task 5)
- Produces: `jaDecidiu(usuarioId: string): boolean`, `registrarDecisao(usuarioId: string): void`, `ImportarLista({ usuarioId })`

- [ ] **Step 1: Escrever o teste do registro de decisão**

`lib/importacao.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { jaDecidiu, registrarDecisao } from './importacao'

afterEach(() => {
  window.localStorage.clear()
})

describe('decisão de importação', () => {
  it('ninguém decidiu ainda', () => {
    expect(jaDecidiu('usuario-1')).toBe(false)
  })

  it('vale por usuário: outra conta no mesmo navegador ainda não decidiu', () => {
    registrarDecisao('usuario-1')

    expect(jaDecidiu('usuario-1')).toBe(true)
    expect(jaDecidiu('usuario-2')).toBe(false)
  })

  it('registrar duas vezes não duplica', () => {
    registrarDecisao('usuario-1')
    registrarDecisao('usuario-1')

    expect(JSON.parse(window.localStorage.getItem('streaming-catalog:importacao-v1') ?? '')).toEqual([
      'usuario-1',
    ])
  })

  it('valor corrompido conta como ninguém decidiu', () => {
    window.localStorage.setItem('streaming-catalog:importacao-v1', '{não é json')

    expect(jaDecidiu('usuario-1')).toBe(false)
  })

  it('não mexe nas preferências (serviços e lista antiga)', () => {
    window.localStorage.setItem('streaming-catalog:v1', '{"watchlist":[550]}')

    registrarDecisao('usuario-1')

    expect(window.localStorage.getItem('streaming-catalog:v1')).toBe('{"watchlist":[550]}')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/importacao.test.ts`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 3: Implementar**

`lib/importacao.ts`:

```ts
/**
 * Quem já respondeu à pergunta "trazer a lista deste navegador para a
 * conta?", por id de usuário. Separado de streaming-catalog:v1 de
 * propósito: a lista antiga fica lá intocada, recuperável mesmo depois de
 * um Descartar clicado por engano.
 */
const CHAVE = 'streaming-catalog:importacao-v1'

function lerDecididos(): string[] {
  try {
    const bruto: unknown = JSON.parse(window.localStorage.getItem(CHAVE) ?? '[]')
    return Array.isArray(bruto) ? bruto.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function jaDecidiu(usuarioId: string): boolean {
  return lerDecididos().includes(usuarioId)
}

export function registrarDecisao(usuarioId: string): void {
  const decididos = lerDecididos()
  if (decididos.includes(usuarioId)) return

  try {
    window.localStorage.setItem(CHAVE, JSON.stringify([...decididos, usuarioId]))
  } catch {
    // Sem persistência, a pergunta volta na próxima visita. Aceitável.
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/importacao.test.ts`
Expected: PASS.

- [ ] **Step 5: Escrever o teste da faixa**

`components/importar-lista.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jaDecidiu, registrarDecisao } from '@/lib/importacao'
import { writePreferences } from '@/lib/storage'
import { ComContexto, contextoDeTeste } from '@/test/contexto-watchlist'
import { ImportarLista } from './importar-lista'

const mocks = vi.hoisted(() => ({ importarLista: vi.fn() }))
vi.mock('@/lib/watchlist/actions', () => ({ importarLista: mocks.importarLista }))

function salvarNoNavegador(watchlist: number[]) {
  writePreferences({ providerIds: [8], watchlist, hasOnboarded: true })
}

function renderizar(recarregar = vi.fn()) {
  const resultado = render(
    <ComContexto valor={contextoDeTeste({ recarregar })}>
      <ImportarLista usuarioId="usuario-1" />
    </ComContexto>,
  )
  return { ...resultado, recarregar }
}

beforeEach(() => {
  mocks.importarLista.mockReset()
})

afterEach(() => {
  window.localStorage.clear()
})

describe('ImportarLista', () => {
  it('sem nada salvo no navegador, não aparece', () => {
    const { container } = renderizar()

    expect(container).toBeEmptyDOMElement()
  })

  it('com filmes salvos, pergunta se quer trazer', async () => {
    salvarNoNavegador([550, 13])
    renderizar()

    expect(await screen.findByText('2 filmes salvos neste navegador.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trazer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument()
  })

  it('usa o singular com um filme só', async () => {
    salvarNoNavegador([550])
    renderizar()

    expect(await screen.findByText('1 filme salvo neste navegador.')).toBeInTheDocument()
  })

  it('quem já decidiu não é perguntado de novo', () => {
    salvarNoNavegador([550])
    registrarDecisao('usuario-1')
    const { container } = renderizar()

    expect(container).toBeEmptyDOMElement()
  })

  it('Trazer: importa, relê a lista, some e mantém a lista local', async () => {
    mocks.importarLista.mockResolvedValue({ ok: true })
    salvarNoNavegador([550, 13])
    const { recarregar } = renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Trazer' }))

    expect(mocks.importarLista).toHaveBeenCalledWith([550, 13])
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Trazer' })).not.toBeInTheDocument())
    expect(recarregar).toHaveBeenCalled()
    expect(jaDecidiu('usuario-1')).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('streaming-catalog:v1') ?? '{}').watchlist).toEqual([
      550, 13,
    ])
  })

  it('Trazer que falha: avisa, continua perguntando e não registra decisão', async () => {
    mocks.importarLista.mockResolvedValue({ ok: false, motivo: 'erro' })
    salvarNoNavegador([550])
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Trazer' }))

    expect(await screen.findByText('Não foi possível trazer agora. Tente de novo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trazer' })).toBeEnabled()
    expect(jaDecidiu('usuario-1')).toBe(false)
  })

  it('Descartar: some sem importar e sem apagar a lista local', async () => {
    salvarNoNavegador([550])
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))

    expect(screen.queryByRole('button', { name: 'Trazer' })).not.toBeInTheDocument()
    expect(mocks.importarLista).not.toHaveBeenCalled()
    expect(jaDecidiu('usuario-1')).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('streaming-catalog:v1') ?? '{}').watchlist).toEqual([
      550,
    ])
  })

  it('ignora lixo no localStorage', async () => {
    window.localStorage.setItem(
      'streaming-catalog:v1',
      JSON.stringify({ providerIds: [], watchlist: [550, -1, 550, 1.5], hasOnboarded: true }),
    )
    mocks.importarLista.mockResolvedValue({ ok: true })
    renderizar()

    expect(await screen.findByText('1 filme salvo neste navegador.')).toBeInTheDocument()
  })

  it('não tem violações de acessibilidade', async () => {
    salvarNoNavegador([550, 13])
    const { container } = renderizar()
    await screen.findByText('2 filmes salvos neste navegador.')

    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run components/importar-lista.test.tsx`
Expected: FAIL, módulo não encontrado.

- [ ] **Step 7: Implementar a faixa**

`components/importar-lista.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { jaDecidiu, registrarDecisao } from '@/lib/importacao'
import { readPreferences } from '@/lib/storage'
import { importarLista } from '@/lib/watchlist/actions'
import { sanitizarIds } from '@/lib/watchlist/ids'
import { useWatchlist } from './watchlist-provider'

type Pergunta = { ids: number[]; estado: 'perguntando' | 'enviando' | 'falhou' }

const BOTAO =
  'rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna'

export function ImportarLista({ usuarioId }: { usuarioId: string }) {
  const { recarregar } = useWatchlist()
  const [pergunta, setPergunta] = useState<Pergunta | null>(null)

  useEffect(() => {
    // Mesmo requisito do usePreferences(): o localStorage só pode ser lido
    // depois do mount, senão o HTML do servidor diverge do primeiro render.
    if (jaDecidiu(usuarioId)) return
    const ids = sanitizarIds(readPreferences().watchlist)
    if (ids.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPergunta({ ids, estado: 'perguntando' })
  }, [usuarioId])

  if (!pergunta) return null

  async function trazer(ids: number[]) {
    setPergunta({ ids, estado: 'enviando' })
    const resultado = await importarLista(ids)
    if (!resultado.ok) {
      setPergunta({ ids, estado: 'falhou' })
      return
    }
    registrarDecisao(usuarioId)
    recarregar()
    setPergunta(null)
  }

  function descartar() {
    // Só registra a decisão. A lista local fica onde está, recuperável.
    registrarDecisao(usuarioId)
    setPergunta(null)
  }

  const total = pergunta.ids.length
  const enviando = pergunta.estado === 'enviando'

  return (
    <section
      aria-labelledby="importar-titulo"
      className="mx-4 mb-6 rounded-lg border border-contorno bg-sala p-4 sm:mx-6"
    >
      <h2 id="importar-titulo" className="font-medium text-texto">
        {total === 1 ? '1 filme salvo neste navegador.' : `${total} filmes salvos neste navegador.`}
      </h2>
      <p className="mt-1 text-sm text-nevoa">Trazer para sua conta?</p>

      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-texto">
        {pergunta.estado === 'falhou' ? 'Não foi possível trazer agora. Tente de novo.' : ''}
      </p>

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => trazer(pergunta.ids)}
          disabled={enviando}
          className={`${BOTAO} bg-lanterna text-noite hover:bg-[#ffcb60]`}
        >
          Trazer
        </button>
        <button
          type="button"
          onClick={descartar}
          disabled={enviando}
          className={`${BOTAO} border border-contorno text-texto hover:bg-noite`}
        >
          Descartar
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run components/importar-lista.test.tsx`
Expected: PASS (9 testes).

- [ ] **Step 9: Pôr a faixa na página**

Em `app/minha-lista/page.tsx`, importar `import { ImportarLista } from '@/components/importar-lista'` e colocar `<ImportarLista usuarioId={lista.usuarioId} />` entre o `</h1>` e o `<MinhaListaConteudo …/>`.

Depois de Trazer, a `importarLista` chama `revalidatePath('/minha-lista')`, então a grade da página volta do servidor já com os filmes importados. O `recarregar()` atualiza as estrelas no resto do app.

- [ ] **Step 10: Portões e commit**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`
Expected: tudo verde.

```bash
git add lib/importacao.ts lib/importacao.test.ts components/importar-lista.tsx components/importar-lista.test.tsx app/minha-lista/page.tsx
git commit -m "feat: oferece trazer para a conta a lista salva no navegador"
```

---

### Task 10: Verificação real (RLS e fluxo no navegador) e README

**Files:**
- Create: `scripts/verificar-rls.mjs`
- Modify: `README.md`

Esta tarefa precisa dos passos do painel já feitos pelo dono do projeto: `supabase/schema.sql` rodado no SQL Editor e *Confirm email* desligado. **Pergunte antes de começar** se os dois passos estão feitos. Esta tarefa cria duas contas de teste no projeto Supabase real; **peça autorização antes de rodar o script**.

- [ ] **Step 1: Escrever o script de verificação do RLS**

`scripts/verificar-rls.mjs`:

```js
// Verifica o RLS da tabela watchlist contra o projeto Supabase real.
// Uso: node --env-file=.env.local scripts/verificar-rls.mjs
//
// Cria duas contas de teste (rls-a-<data>@exemplo.com e rls-b-...). Elas
// ficam no projeto: apague em Authentication → Users depois de conferir.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!url || !chave) {
  console.error('Faltam as variáveis do Supabase. Rode com --env-file=.env.local')
  process.exit(1)
}

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } }
const novoCliente = () => createClient(url, chave, opcoes)
let falhas = 0

function conferir(descricao, passou, detalhe) {
  console.log(`${passou ? 'PASSOU' : 'FALHOU'}  ${descricao}${detalhe ? `  (${detalhe})` : ''}`)
  if (!passou) falhas++
}

// 1. Sem sessão, ninguém lê nada.
const anonimo = novoCliente()
const leitura = await anonimo.from('watchlist').select('*')
conferir(
  'sem sessão, o select volta vazio',
  !leitura.error && leitura.data.length === 0,
  leitura.error?.message ?? `${leitura.data.length} linhas`,
)

// 2. Sem sessão, ninguém escreve.
const escrita = await anonimo
  .from('watchlist')
  .insert({ user_id: '00000000-0000-0000-0000-000000000000', movie_id: 1 })
conferir('sem sessão, o insert é recusado', Boolean(escrita.error), escrita.error?.code)

// 3. Duas contas: B não vê nem apaga o que é de A.
const carimbo = Date.now()
const senha = `Rls-${carimbo}-senha`
const a = novoCliente()
const b = novoCliente()
const contaA = await a.auth.signUp({ email: `rls-a-${carimbo}@exemplo.com`, password: senha })
const contaB = await b.auth.signUp({ email: `rls-b-${carimbo}@exemplo.com`, password: senha })

if (!contaA.data.session || !contaB.data.session) {
  console.error('Cadastro sem sessão: desligue "Confirm email" no painel e rode de novo.')
  process.exit(1)
}

const idA = contaA.data.user.id
const salvouA = await a.from('watchlist').insert({ user_id: idA, movie_id: 550 })
conferir('A salva na própria lista', !salvouA.error, salvouA.error?.message)

const falsoA = await b.from('watchlist').insert({ user_id: idA, movie_id: 13 })
conferir('B não consegue salvar na lista de A', Boolean(falsoA.error), falsoA.error?.code)

const bLe = await b.from('watchlist').select('*')
conferir('B não vê a lista de A', !bLe.error && bLe.data.length === 0, `${bLe.data?.length} linhas`)

await b.from('watchlist').delete().eq('user_id', idA).eq('movie_id', 550)
const aLe = await a.from('watchlist').select('movie_id')
conferir(
  'o delete de B não apagou nada de A',
  !aLe.error && aLe.data.length === 1 && aLe.data[0].movie_id === 550,
  JSON.stringify(aLe.data),
)

// Limpeza do que dá para limpar com a chave pública.
await a.from('watchlist').delete().eq('user_id', idA)

console.log(falhas === 0 ? '\nRLS OK.' : `\n${falhas} verificação(ões) falharam.`)
console.log(`Apague as contas rls-a-${carimbo} e rls-b-${carimbo} em Authentication → Users.`)
process.exit(falhas === 0 ? 0 : 1)
```

- [ ] **Step 2: Rodar contra o projeto real (com autorização)**

Run: `node --env-file=.env.local scripts/verificar-rls.mjs`
Expected: seis linhas `PASSOU` e `RLS OK.`. **Colar a saída inteira no relatório da tarefa como evidência.** Qualquer `FALHOU` para a tarefa: o RLS não está protegendo, e nada vai ao ar assim.

- [ ] **Step 3: Fluxo completo no navegador**

Run: `npm run dev`. Com o dono do projeto, conferir e anotar no relatório:

1. Deslogado, clicar na estrela de um filme → vai para `/entrar?proximo=…`.
2. Criar conta → volta para o filme; o cabeçalho mostra o email e Sair.
3. Salvar o filme → a estrela acende na hora.
4. Abrir `/minha-lista` → o filme está lá, sem esqueleto piscando.
5. Com filmes antigos no `localStorage`, a faixa "N filmes salvos neste navegador." aparece. Trazer → os filmes entram na grade.
6. Sair dentro de `/minha-lista` → volta para o início.
7. Numa aba anônima, entrar com a mesma conta → a lista está lá.
8. Deslogado, abrir `/minha-lista` direto → vai para `/entrar?proximo=%2Fminha-lista`.
9. Abrir `/entrar?proximo=https://example.com`, entrar → cai em `/minha-lista`, não no outro site.

- [ ] **Step 4: Documentar no README**

Acrescentar ao `README.md` uma seção `## Conta e Minha lista (Supabase)` com:

```markdown
## Conta e Minha lista (Supabase)

A Minha lista fica numa tabela do Supabase, acessada com email e senha. O resto do app funciona sem conta.

1. Crie um projeto no [Supabase](https://supabase.com).
2. Em **SQL Editor**, rode [`supabase/schema.sql`](supabase/schema.sql). Ele cria a tabela `watchlist` com RLS ligado.
3. Em **Authentication → Providers → Email**, desligue *Confirm email*.
4. Copie **Project URL** e a chave **publishable** (Project Settings → API Keys) para o `.env.local`, seguindo o `.env.example`. Nunca use a chave secreta.
5. Para conferir o RLS: `node --env-file=.env.local scripts/verificar-rls.mjs`.

A sessão fica em cookies (`@supabase/ssr`) e é renovada pelo `proxy.ts`, o antigo `middleware.ts`, renomeado no Next 16.
```

- [ ] **Step 5: Portões finais e commit**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build`
Expected: tudo verde.

```bash
git add scripts/verificar-rls.mjs README.md
git commit -m "docs: verificacao do RLS e configuracao do Supabase no README"
```

---

## Cobertura do spec

| Spec | Task |
|---|---|
| §4.1 tabela, §4.2 RLS, schema versionado | 1 |
| §4.3 variáveis e `.env.example` | 1 |
| §5.1 dois clientes | 1 |
| §5.2 `proxy.ts` | 3 |
| §5.3 `/entrar`, mensagens, logado vai direto | 2, 8 |
| §5.4 `proximoSeguro` | 2 |
| §5.5 cabeçalho Entrar / Sair | 8 |
| §6.1 provider, botão, remoção de `toggleWatchlist` | 5, 7 |
| §6.2 Server Actions | 4 |
| §6.3 `/minha-lista` no servidor, saída da `/api/filmes` | 6 |
| §6.4 importação | 9 |
| §7 testes, RLS verificado à mão, fluxo no navegador | todas; 10 |
| §9 passos do painel | 10 (pré-condição) e README |

Um acréscimo ao spec: `MENSAGEM_SEM_SESSAO` (Task 2), para o cadastro não ficar mudo se a confirmação por email estiver ligada por engano.
