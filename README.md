# data2data

Transforma relatórios brutos (planilhas e CSVs exportados de sistemas de gestão) em painéis analíticos, com gráficos, indicadores e pontos de análise escritos em linguagem de negócio.

Arraste os arquivos para a página: o app reconhece o tipo de relatório pelo conteúdo e monta a análise correspondente. Todo o processamento acontece **no navegador**, e nenhum dado é enviado para servidores.

## Como usar

1. **Prepare os arquivos:** exporte os relatórios do seu sistema ou baixe um dos **modelos** na página inicial e preencha com os seus números.
2. **Importe:** arraste os arquivos para a área de importação em **Meus relatórios**.
3. **Explore:** clique em **Visualizar** e navegue pelos indicadores, gráficos e pontos de análise.

Para conhecer o app sem arquivos próprios, use **"Ver com dados de exemplo"** na página inicial.

> Os dados ficam apenas na memória do navegador: ao recarregar a página, é preciso importar os arquivos novamente.

## Funcionalidades

### DRE: Demonstração do Resultado do Exercício (`.xlsx`)

- Lê a DRE gerencial mensal e reconstrói a hierarquia de contas (seções, grupos, contas e linhas de resultado) a partir da estrutura da planilha.
- **Indicadores:** receita bruta, lucro bruto, margem de contribuição, EBITDA, resultado líquido e saldo de caixa, com margem sobre a receita e variação frente ao período anterior.
- **Ponto de equilíbrio:** receita necessária para cobrir as despesas fixas com a margem de contribuição atual.
- **Gráficos:** cascata da receita ao resultado, receita e EBITDA mês a mês, margens, composição de custos e da receita e saldo de caixa.
- **DRE completa** em tabela, com grupos recolhíveis e alternância entre valores (R$) e análise vertical (AV%).
- Filtro por mês ou acumulado do ano.

### Curva ABC mensal (`.csv`)

- Um arquivo por mês, com o mês de referência no nome do arquivo.
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
- **Pontos de análise cruzados:** itens da classe A com margem abaixo da média ("vende muito, lucra pouco"), itens B/C com margem acima da média, prejuízos, custo não cadastrado e divergências entre os dois relatórios.

### Outras tabelas

Qualquer CSV ou planilha não reconhecida vira uma tabela genérica, com tipos de coluna inferidos, estatísticas e gráficos por categoria.

### Pontos de análise explicados

Cada painel traz frases objetivas geradas a partir dos números. Todo indicador, gráfico e ponto de análise tem um ícone de informação que, ao passar o mouse ou focar pelo teclado, explica como o valor foi calculado.

> *A receita bruta caiu 9,7% em relação a set/26.*
> *EBITDA positivo em 4 dos últimos 12 meses.*
> *10 de 20 itens (50%) respondem por 82,4% da quantidade e 94,4% do faturamento.*

### Modelos para preencher

A página inicial oferece modelos já preenchidos com uma empresa fictícia:

| Modelo | Formato | Observações |
|---|---|---|
| DRE mensal | XLSX | Aba "DRE Geral" com 12 meses; totais, subtotais e saldos com fórmulas do Excel. Inclui uma aba de instruções. |
| Curva ABC | CSV | Nome no formato `Modelo_Curva_ABC-out.2026.csv`. |
| Lucro por produto | CSV | Nome no formato `Modelo_Lucro_por_Produto-out.2026.csv`. |

Basta substituir os dados de exemplo pelos seus e importar.

### Interface

- Tema claro, escuro ou do sistema, escolhido por ícones no topo da página.
- Menu de seções nas páginas de relatório (lateral no desktop, barra horizontal no celular), com rolagem suave e destaque da seção visível.
- Avisos para situações comuns: arquivo sem mês no nome, lucro sem Curva ABC do mesmo mês, gráficos sem dados no período e endereços inexistentes.

## Formatos de entrada

O tipo de relatório é identificado pelo **conteúdo**, não pelo nome do arquivo.

| Relatório | Como é reconhecido |
|---|---|
| **DRE** | Planilha com uma linha de meses (1 a 12) e, logo abaixo, a linha dos anos; basta um mês. Se houver várias abas, é usada a que contém **"DRE Geral"** no nome. É preciso existir a linha "Receita operacional bruta". |
| **Curva ABC** | CSV com as colunas de descrição, quantidade e classificação. São aceitos `ProCodigo`, `ProDescricao`, `Qtde`, `ValorTotal`, `Classificacao`, `Percentual` e variações como `Código`, `Quantidade`, `Classe` e `Curva`. |
| **Lucro por produto** | CSV com descrição, valor vendido, custo e lucro. São aceitos `ProDescricao`, `PedValorTotal`, `PedICustoGerencial`, `Imposto`, `TaxaFinanceira`, `Lucro` e variações como `Valor total`, `Custo` e `Taxas`. |
| **Tabela genérica** | Qualquer outro CSV, XLSX ou XLS. |

Regras de leitura:

- **Mês no nome do arquivo** (Curva ABC e lucro): formatos como `out.2026`, `outubro de 2026`, `out/26`, `10-2026` ou `2026_10`. Sem o mês, o relatório é importado, mas não é comparado com outros meses nem cruzado com o lucro.
- **Reimportação:** importar de novo a Curva ABC ou o lucro de um mês substitui a versão anterior daquele mês.
- **Encoding:** CSVs em UTF-8 ou Windows-1252 (padrão de muitos sistemas brasileiros) são detectados automaticamente.
- **Números:** formato brasileiro (`1.234,56`), internacional (`1,234.56`), moeda (`R$ 10`) e negativo contábil (`(1.234,00)`).
- **Percentual da Curva ABC:** aceito em 0–100 ou 0–1. Se a coluna estiver vazia, a participação é calculada pela quantidade.
- **Hierarquia da DRE:** os blocos são separados por linhas em branco. Um bloco de uma linha é um **resultado** (Lucro bruto, EBITDA...); um cabeçalho igual à soma das linhas abaixo é um **grupo**; um cabeçalho seguido de outro título em maiúsculas é uma **seção**.
- **Períodos da DRE:** meses repetidos são ignorados (vale a primeira ocorrência), e meses zerados no início e no fim são descartados.
- **Limites:** arquivos vazios ou acima de 25 MB são recusados com mensagem explicativa.

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
| `npm run coverage` | Roda os testes com relatório de cobertura e falha se a cobertura mínima não for atingida |

## Stack

| Área | Tecnologia |
|---|---|
| Base | Vue 3, TypeScript, Vite |
| Componentes | [shadcn-vue](https://www.shadcn-vue.com/) sobre [Reka UI](https://reka-ui.com/) |
| Estilo | Tailwind CSS 4, com tokens de tema claro e escuro no padrão do shadcn |
| Estado e rotas | Pinia, Vue Router |
| Leitura de arquivos | [Papa Parse](https://www.papaparse.com/) (CSV), [SheetJS](https://sheetjs.com/) (XLSX/XLS) |
| Gráficos | [ECharts](https://echarts.apache.org/) + vue-echarts |
| Ícones | [Phosphor Icons](https://phosphoricons.com/) |
| Fonte | Roboto, servida localmente |
| Testes | [Vitest](https://vitest.dev/), Vue Test Utils, happy-dom |

A SheetJS é instalada a partir do [CDN oficial](https://cdn.sheetjs.com/), pois o pacote `xlsx` publicado no npm está desatualizado e tem vulnerabilidades conhecidas.

### Componentes do shadcn-vue

Os componentes ficam como código-fonte em `src/presentation/components/ui/` e podem ser editados livremente. Para adicionar outro:

```bash
npx shadcn-vue@latest add <componente>
```

O `components.json` já aponta para as pastas do projeto e usa Phosphor como biblioteca de ícones. As cores dos componentes vêm dos tokens em `src/presentation/main.css` (`background`, `card`, `primary`, `muted`, `border`...), que seguem a paleta da marca nos dois temas.

## Arquitetura

Arquitetura limpa com DDD. A regra de dependência é **`presentation → application → domain`**. A camada `infrastructure` implementa as portas do domínio e só é conhecida pelo `container.ts`.

```
src/
├── domain/                 # Regras de negócio puras (sem Vue nem bibliotecas)
│   ├── shared.ts           # Period, parseNumber, ratio, relativeChange, compareByPeriod...
│   ├── report.ts           # Report (DRE | ABC | Lucro | Dataset), ReportRepository, recognizeReports
│   ├── ingestion/          # SourceFile, FileFormat, porta FileParser, leitura de cabeçalhos por apelido
│   ├── dre/                # DreReport: interpreta a DRE e reconstrói a hierarquia
│   ├── abc/                # AbcReport: Curva ABC de um mês
│   ├── profit/             # ProfitReport: lucro por produto de um mês
│   ├── dataset/            # Dataset genérico
│   └── analysis/           # Estatísticas de colunas e pontos de análise
├── application/            # Casos de uso: importar, consultar e analisar; cruzamento ABC × lucro
├── infrastructure/         # Parsers CSV/XLSX, repositório em memória, gerador de modelos
│   └── container.ts        # Composition root (injeção de dependências)
├── presentation/           # Vue
│   ├── components/         # Gráficos, cards e tabelas da aplicação
│   │   └── ui/             # Componentes do shadcn-vue
│   ├── composables/        # useReports e useFileImport (stores Pinia), useDreAnalysis, useAbcAnalysis...
│   ├── pages/              # Início, importação, DRE, Curva ABC, tabela genérica, não encontrada
│   ├── router.ts
│   ├── format.ts           # Formatadores pt-BR
│   └── main.css            # Tailwind, tokens de tema e animações
├── test/                   # Testes, espelhando as camadas
├── App.vue
└── main.ts
```

Divisão de responsabilidades:

- **Domínio:** sabe interpretar cada relatório.
- **Aplicação:** calcula indicadores e fatos (variação, ponto de equilíbrio, movimentação de itens, lucratividade).
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

| Pasta | Ambiente | O que cobre |
|---|---|---|
| `domain/` | Node | Leitura de cada relatório e casos de borda: encoding, formatos de número, cabeçalhos repetidos ou fora da primeira linha, meses no nome do arquivo, percentual vazio, DRE com um mês. |
| `application/` | Node | Cálculos de cada análise e importação ponta a ponta com os leitores reais de CSV e XLSX. |
| `infrastructure/` | Node | Modelos gerados: reconhecimento, fórmulas da DRE e consistência dos números. |
| `presentation/` | happy-dom | Formatadores, pontos de análise, composables, rotas, página de importação e componentes. |

Os dados de teste são **sintéticos** (`src/test/fixtures.ts`) e reproduzem a estrutura dos relatórios reais sem expor dados de empresas.

`npm run coverage` falha se a cobertura de linhas ficar abaixo de:

| Camada | Mínimo |
|---|---|
| Domínio | 95% |
| Aplicação e infraestrutura | 90% |
| Composables | 85% |
| Componentes | 60% |

## Visualização de dados

- **Paleta categórica:** ordem fixa, validada para daltonismo nos temas claro e escuro.
- **Cores com papel fixo:** classes A/B/C sempre com as mesmas cores; na cascata, azul para aumentos, vermelho para reduções e cinza para totais.
- **A cor nunca carrega a informação sozinha:** há legendas, ícones e valores em texto.
- **Movimento:** as animações respeitam a preferência de movimento reduzido do sistema (`prefers-reduced-motion`).

## Roadmap

- [ ] Persistência local (IndexedDB) para não perder os dados ao recarregar
- [ ] Importação de PDF
- [ ] Exportação dos painéis (PDF/imagem)
- [ ] Comparação entre unidades (aba "DRE Unidades")
- [ ] Testes de ponta a ponta das páginas (Playwright)
