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
