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
