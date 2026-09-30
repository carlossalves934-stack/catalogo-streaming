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
