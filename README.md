# data2data

Transforma relatórios brutos (planilhas e CSVs exportados de sistemas de gestão) em painéis analíticos, com gráficos, indicadores e pontos de análise escritos em linguagem de negócio.

Arraste os arquivos para a página: o app reconhece o tipo de relatório pelo conteúdo e monta a análise correspondente. Todo o processamento acontece **no navegador**, e nenhum dado é enviado para servidores.

## Funcionalidades

### DRE: Demonstração do Resultado do Exercício (`.xlsx`)

- Lê a DRE gerencial mensal e reconstrói a hierarquia de contas (seções, grupos, contas e linhas de resultado) a partir da própria estrutura da planilha.
- **Indicadores:** receita bruta, lucro bruto, margem de contribuição, EBITDA, resultado líquido e saldo de caixa, com margem sobre a receita e variação em relação ao período anterior.
- **Ponto de equilíbrio:** receita necessária para cobrir as despesas fixas com a margem de contribuição atual.
- **Gráficos:** cascata da receita ao resultado, evolução de receita e EBITDA, margens mês a mês, composição de custos e despesas, composição da receita e saldo de caixa.
- **DRE completa** em tabela, com grupos recolhíveis e alternância entre valores (R$) e análise vertical (AV%).
- Filtro por mês ou acumulado do ano.

### Curva ABC mensal (`.csv`)

- Um arquivo por mês. O mês de referência é lido do nome do arquivo (`set.2026`, `09-2026`, `2026_09`...).
- **Indicadores do mês:** faturamento, quantidade vendida, itens vendidos e valor médio por unidade.
- Distribuição das classes A, B e C em itens, quantidade e faturamento.
- Ranking de itens colorido por classe, ordenável por quantidade ou faturamento.
- **Entre meses:** evolução do faturamento por classe e movimentação de cada item (novo, subiu, caiu, manteve, saiu).

### Lucro por produto mensal (`.csv`)

Cruzado com a Curva ABC do mesmo mês, pelo código do produto, para verificar se o volume vendido se converte em lucro:

- **Indicadores:** lucro, margem de lucro, custo gerencial e impostos e taxas, com variação frente ao mês anterior.
- **Lucro por classe:** fatia de cada classe em quantidade, faturamento e lucro, e a margem de cada classe.
- **Matriz volume × margem:** cada item posicionado pela quantidade vendida e pela margem, com as médias do mês como referência.
- **Cascata da venda ao lucro** e ranking de lucro por item.
- **Pontos de análise cruzados:** itens da classe A com margem abaixo da média ("vende muito, lucra pouco"), itens B/C com margem acima da média, itens com prejuízo, custo não cadastrado e divergências entre os dois relatórios.

### Outras tabelas

Qualquer CSV ou planilha não reconhecida vira uma tabela genérica, com tipos de coluna inferidos, estatísticas e um gráfico de ranking.

### Navegação

As páginas de relatório têm um menu de seções (lateral no desktop, barra horizontal no celular) que rola suavemente até cada parte e destaca a seção visível.

### Pontos de análise automáticos

Cada painel traz frases objetivas geradas a partir dos dados. Todo card tem um ícone de informação que, ao passar o mouse (ou focar pelo teclado), explica como aquele número foi calculado. Exemplos:

> *A receita bruta caiu 9,7% em relação a set/26.*
> *EBITDA positivo em 4 dos últimos 12 meses.*
> *10 de 20 itens (50%) respondem por 82,4% da quantidade e 94,4% do faturamento.*

## Formatos de entrada

O tipo de relatório é identificado pelo **conteúdo**, não pelo nome do arquivo.

| Relatório | Como é reconhecido |
|---|---|
| **DRE** | Planilha com uma linha de meses (1 a 12) e, logo abaixo, a linha dos anos. Se houver várias abas, é usada a que contém **"DRE Geral"** no nome. É preciso existir a linha "Receita operacional bruta". |
| **Curva ABC** | CSV com as colunas de descrição, quantidade e classificação. São aceitos `ProCodigo`, `ProDescricao`, `Qtde`, `ValorTotal`, `Classificacao`, `Percentual` e variações como `Código`, `Quantidade`, `Classe` e `Curva`. |
| **Lucro por produto** | CSV com descrição, valor vendido, custo e lucro. São aceitos `ProDescricao`, `PedValorTotal`, `PedICustoGerencial`, `Imposto`, `TaxaFinanceira`, `Lucro` e variações como `Valor total`, `Custo` e `Taxas`. |
| **Tabela genérica** | Qualquer outro CSV, XLSX ou XLS. |

Detalhes da leitura:

- **Encoding:** CSVs em UTF-8 ou Windows-1252 (o padrão de muitos sistemas brasileiros) são detectados automaticamente.
- **Números:** aceita os formatos brasileiro (`1.234,56`) e internacional (`1,234.56`).
- **Hierarquia da DRE:** os blocos da planilha são separados por linhas em branco.
  - Um bloco de uma linha só é um **resultado** (Lucro bruto, EBITDA...).
  - Um cabeçalho igual à soma das linhas abaixo é um **grupo**.
  - Um cabeçalho seguido de outro título em maiúsculas é uma **seção**.
- **Períodos da DRE:** meses repetidos são ignorados (vale a primeira ocorrência), e meses zerados no início e no fim são descartados.
- **Relatórios mensais reimportados:** importar de novo a Curva ABC ou o lucro de um mês substitui a versão anterior daquele mês.

## Começando

**Pré-requisitos:** Node.js `20.19+` ou `22.12+`.

```bash
npm install
npm run dev
```

Acesse o endereço exibido no terminal (por padrão, `http://localhost:5173`).

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Checagem de tipos (`vue-tsc`) e build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente |
| `npm test` | Roda os testes uma vez |
| `npm run test:watch` | Roda os testes em modo observação |
| `npm run coverage` | Roda os testes com relatório de cobertura (falha se a cobertura mínima não for atingida) |

> Os dados importados ficam apenas na memória do navegador: ao recarregar a página, é preciso importar os arquivos novamente.

## Stack

| Área | Tecnologia |
|---|---|
| Base | Vue 3, TypeScript, Vite |
| Estilo | Tailwind CSS 4, com tokens semânticos de tema claro e escuro |
| Estado e rotas | Pinia, Vue Router |
| Leitura de arquivos | [Papa Parse](https://www.papaparse.com/) (CSV), [SheetJS](https://sheetjs.com/) (XLSX/XLS) |
| Gráficos | [ECharts](https://echarts.apache.org/) + vue-echarts |
| Ícones | [Phosphor Icons](https://phosphoricons.com/) |
| Testes | [Vitest](https://vitest.dev/), Vue Test Utils, happy-dom |
| Formatação | `Intl` (moeda, números e datas em pt-BR), `@brazilian-utils/brazilian-utils` (CPF, CNPJ, CEP), Maska (máscaras de input) |

A SheetJS é instalada a partir do [CDN oficial](https://cdn.sheetjs.com/), pois o pacote `xlsx` publicado no npm está desatualizado e tem vulnerabilidades conhecidas.

## Arquitetura

Arquitetura limpa com DDD. A regra de dependência é **`presentation → application → domain`**. A camada `infrastructure` implementa as portas do domínio e só é conhecida pelo `container.ts`.

```
src/
├── domain/                 # Regras de negócio puras (sem Vue nem bibliotecas)
│   ├── shared.ts           # Identifier, DomainError, Period, parseNumber, normalizeText
│   ├── report.ts           # Report (DRE | ABC | Lucro | Dataset), ReportRepository, recognizeReports
│   ├── ingestion/          # SourceFile, FileFormat, porta FileParser, leitura de cabeçalhos por apelido
│   ├── dre/                # DreReport: interpreta a DRE e reconstrói a hierarquia
│   ├── abc/                # AbcReport: Curva ABC de um mês
│   ├── profit/             # ProfitReport: lucro por produto de um mês
│   ├── dataset/            # Dataset genérico
│   └── analysis/           # Estatísticas de colunas
├── application/            # Casos de uso: importar, consultar e analisar relatórios; cruzamento ABC × lucro
├── infrastructure/         # Adapters: parsers CSV/XLSX, repositório em memória
│   └── container.ts        # Composition root (injeção de dependências)
├── presentation/           # Vue
│   ├── components/         # Gráficos, cards, tabelas
│   ├── composables/        # useReports (store Pinia), useDreAnalysis, useAbcAnalysis, useTheme...
│   ├── pages/              # Início, DRE, Curva ABC, tabela genérica
│   ├── router.ts
│   ├── format.ts           # Formatadores pt-BR
│   └── main.css            # Tailwind, tokens de tema e animações
├── test/                   # Testes (Vitest), espelhando as camadas
│   ├── domain/
│   ├── application/
│   ├── presentation/
│   └── fixtures.ts         # Relatórios sintéticos (DRE, Curva ABC, lucro)
├── App.vue
└── main.ts
```

Divisão de responsabilidades:

- **Domínio:** sabe interpretar cada relatório.
- **Aplicação:** calcula indicadores e fatos (variação, ponto de equilíbrio, movimentação de itens).
- **Apresentação:** transforma os fatos em gráficos e em frases.

### Como estender

**Novo formato de arquivo** (ex.: PDF):

1. Adicione o formato em `domain/ingestion/FileFormat.ts`.
2. Crie um adapter em `infrastructure/` que implemente `FileParser` e devolva `RawTable[]`.
3. Registre o adapter no array `parsers` de `infrastructure/container.ts`.

**Novo tipo de relatório:**

1. Crie o aggregate em `domain/<relatorio>/`, com um `fromTable()` que retorne `null` quando a tabela não for desse tipo.
2. Inclua o novo tipo na união `Report` e em `recognizeReports` (`domain/report.ts`).
3. Crie o caso de uso de análise em `application/` e a página em `presentation/pages/`.

## Testes

A suíte fica em `src/test/`, separada por camada:

- **domain/** e **application/**: rodam em Node. Cobrem a leitura de cada relatório (inclusive casos de borda: encoding, números em vários formatos, cabeçalhos repetidos, meses no nome do arquivo), os cálculos de cada análise e a importação ponta a ponta com os leitores reais de CSV e XLSX.
- **presentation/**: formatadores, geração dos pontos de análise e componentes (em DOM simulado com happy-dom).

Os dados de teste são **sintéticos** (`src/test/fixtures.ts`) e reproduzem a estrutura dos relatórios reais sem expor dados de empresas. A cobertura mínima de domínio, aplicação e infraestrutura é verificada em `npm run coverage`.

## Visualização de dados

- **Paleta categórica:** ordem fixa, validada para daltonismo nos temas claro e escuro.
- **Cores com papel fixo:**
  - Classes A/B/C sempre com as mesmas cores.
  - Cascata com azul para aumentos, vermelho para reduções e cinza para totais.
- **A cor nunca carrega a informação sozinha:** há legendas, ícones e valores em texto.
- **Movimento:** as animações respeitam a preferência de movimento reduzido do sistema (`prefers-reduced-motion`).

## Roadmap

- [ ] Persistência local (IndexedDB) para não perder os dados ao recarregar
- [ ] Importação de PDF
- [ ] Exportação dos painéis (PDF/imagem)
- [ ] Comparação entre unidades (aba "DRE Unidades")
