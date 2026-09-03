// Fixture de teste: importa o pacote `server-only` (bare specifier) para provar
// que o alias configurado em vitest.config.ts o substitui pelo stub vazio de
// test/stubs/server-only.ts, sem lançar erro sob o Vitest.
import 'server-only'

export const SERVER_ONLY_ALIAS_OK = 'ok'
