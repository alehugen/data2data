import type { MaskInputOptions } from 'maska'

/**
 * Máscaras prontas para o diretiva v-maska.
 * Uso: <input v-maska="masks.cpf" /> ou <input v-maska="masks.currency" />
 */
export const masks = {
  cpf: { mask: '###.###.###-##' },
  cnpj: { mask: '##.###.###/####-##' },
  /** Alterna entre CPF e CNPJ conforme o usuário digita */
  document: { mask: ['###.###.###-##', '##.###.###/####-##'] },
  cep: { mask: '#####-###' },
  phone: { mask: ['(##) ####-####', '(##) #####-####'] },
  date: { mask: '##/##/####' },
  currency: { number: { locale: 'pt-BR', fraction: 2, unsigned: true } },
  decimal: { number: { locale: 'pt-BR', fraction: 2 } },
} satisfies Record<string, MaskInputOptions>
