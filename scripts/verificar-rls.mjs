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

// 1. Duas contas: A salva e B não consegue acessar.
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

// 2. Sem sessão, ninguém lê dados de A.
const anonimo = novoCliente()
const leitura = await anonimo.from('watchlist').select('*')
conferir(
  'sem sessão, o select não vê dados de A',
  !leitura.error && leitura.data?.length === 0,
  leitura.error?.message ?? `${leitura.data?.length} linhas`,
)

// 3. Sem sessão, ninguém escreve usando id de A.
const escrita = await anonimo
  .from('watchlist')
  .insert({ user_id: idA, movie_id: 13 })
conferir('sem sessão, o insert com id de A é recusado', Boolean(escrita.error), escrita.error?.code)

// 4. B não vê nem consegue salvar na lista de A.
const falsoA = await b.from('watchlist').insert({ user_id: idA, movie_id: 13 })
conferir('B não consegue salvar na lista de A', Boolean(falsoA.error), falsoA.error?.code)

const bLe = await b.from('watchlist').select('*')
conferir('B não vê a lista de A', !bLe.error && bLe.data?.length === 0, `${bLe.data?.length} linhas`)

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
