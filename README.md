# data2data

Transforma dados não tratados (PDFs e planilhas) em análises visuais, com gráficos e pontos de análise.

## Stack

- Vue 3 + TypeScript + Vite
- Tailwind CSS 4 (via `@tailwindcss/vite`, tema em `src/presentation/main.css`)
- Vue Router + Pinia (estado global)
- Fonte Roboto (self-hosted, apenas o subconjunto latino)
- Tema claro/escuro/sistema via `useTheme` e tokens semânticos (`bg-surface`, `text-fg`, `border-line`...)
- **Leitura de dados:** Papa Parse (CSV) e SheetJS (XLSX/XLS, instalada do CDN oficial, pois o pacote `xlsx` do npm está desatualizado)
- **Gráficos:** ECharts + vue-echarts (registro tree-shaken no próprio componente de gráfico), paleta categórica validada para daltonismo em `useChartTheme`
- **Máscaras e formatação:** Maska (máscaras prontas em `presentation/masks.ts`; importe `vMaska` de `maska/vue` no componente que usar), `@brazilian-utils/brazilian-utils` (CPF, CNPJ, CEP, telefone) e `Intl` (números, moeda, datas) em `presentation/format.ts`
- Arquitetura limpa + DDD, estado e lógica de UI via composables

## Arquitetura

```
src/
├── domain/                 # Regras de negócio puras (sem Vue)
│   ├── shared.ts           # Identifier, DomainError, Period, parseNumber, normalizeText
│   ├── report.ts           # Report (DRE | ABC | Dataset), ReportRepository, recognizeReports
│   ├── ingestion/          # SourceFile, FileFormat, porta FileParser (RawTable)
│   ├── dre/                # DreReport: lê a DRE mensal e reconstrói a hierarquia de contas
│   ├── abc/                # AbcReport: Curva ABC de um mês
│   ├── dataset/            # Dataset genérico (qualquer tabela)
│   └── analysis/           # Estatísticas de colunas genéricas
├── application/            # Casos de uso: ImportFile, Report queries, AnalyzeDre, AnalyzeAbc, AnalyzeDataset
├── infrastructure/         # Adapters: CsvFileParser, XlsxFileParser, InMemoryReportRepository
│   └── container.ts        # Composition root (injeção de dependências)
├── presentation/           # Vue
│   ├── components/         # Gráficos (Waterfall, Trend, Ranking), StatCard, InsightList, DreTable...
│   ├── composables/        # useReports (store), useDreAnalysis, useAbcAnalysis, useTheme...
│   ├── pages/              # Home, DRE, Curva ABC, tabela genérica
│   ├── router.ts
│   ├── format.ts           # Formatadores pt-BR (moeda, %, períodos, rótulos)
│   ├── masks.ts            # Máscaras prontas para v-maska
│   └── main.css            # Tailwind, tokens de tema e animações
├── App.vue                 # Layout (header + RouterView)
└── main.ts
```

## Relatórios suportados

O tipo é reconhecido pelo conteúdo do arquivo, não pelo nome.

### DRE (planilha `.xlsx`)

- Usa a aba cujo nome contém **"DRE Geral"** (se não houver, a primeira aba com layout de DRE).
- Cabeçalho: linha com os meses (1–12) e, logo abaixo, os anos. Meses repetidos são ignorados (vale a primeira ocorrência) e meses vazios nas pontas são descartados.
- Hierarquia inferida pelos blocos separados por linha em branco: bloco de uma linha = **resultado**
  (Lucro bruto, EBITDA...); cabeçalho que é a soma das linhas abaixo = **grupo**; cabeçalho seguido de outro título = **seção**.
- Painel: indicadores com margens e variação, ponto de equilíbrio, pontos de análise, cascata da receita ao
  resultado, evolução de receita/EBITDA, margens, composição de custos e da receita, saldo de caixa e DRE completa (valores ou AV%).

### Curva ABC (CSV mensal)

- Colunas reconhecidas: `ProCodigo`, `ProDescricao`, `Qtde`, `ValorTotal`, `Classificacao`, `Percentual` (e variações).
- O **mês vem do nome do arquivo** (`set.2026`, `09-2026`, `2026_09`...). Reimportar um mês substitui a versão anterior.
- Encoding detectado automaticamente (UTF-8 ou Windows-1252).
- Painel: indicadores do mês, distribuição A/B/C, ranking, evolução entre meses e movimentação de itens entre classes.

**Regra de dependência:** `presentation → application → domain`. A `infrastructure` implementa
as portas do domínio e só é conhecida pelo `container.ts`. O domínio não importa nada de fora.

### Adicionando um novo formato de arquivo

1. Adicionar o formato em `domain/ingestion/FileFormat.ts`.
2. Criar um adapter em `infrastructure/` implementando `FileParser`.
3. Registrá-lo no array `parsers` em `infrastructure/container.ts`.

## Scripts

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # type-check + build de produção
npm run preview  # pré-visualiza o build
```
