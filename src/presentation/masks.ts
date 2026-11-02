import type { MaskInputOptions } from 'maska'

export const masks = {
  cpf: { mask: '###.###.###-##' },
  cnpj: { mask: '##.###.###/####-##' },
  document: { mask: ['###.###.###-##', '##.###.###/####-##'] },
  cep: { mask: '#####-###' },
  phone: { mask: ['(##) ####-####', '(##) #####-####'] },
  date: { mask: '##/##/####' },
  currency: { number: { locale: 'pt-BR', fraction: 2, unsigned: true } },
  decimal: { number: { locale: 'pt-BR', fraction: 2 } },
} satisfies Record<string, MaskInputOptions>
