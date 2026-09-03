// Substitui o pacote `server-only` durante os testes.
// Em produção ele impede que código de servidor seja importado pelo cliente;
// no Vitest não há essa distinção, então um módulo vazio basta.
export {}
