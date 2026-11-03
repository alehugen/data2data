<script setup lang="ts">
import {
  PhArrowRight,
  PhChartLineUp,
  PhCoins,
  PhCursorClick,
  PhDownloadSimple,
  PhFileCsv,
  PhFileXls,
  PhFolderOpen,
  PhLightbulb,
  PhPlayCircle,
  PhRanking,
  PhShieldCheck,
  PhTable,
  PhUploadSimple,
} from '@phosphor-icons/vue'
import { useRouter } from 'vue-router'
import { useReports } from '@/presentation/composables/useReports'
import { useTemplates } from '@/presentation/composables/useTemplates'

const { reports } = useReports()
const { templates, downloading, loadingSample, download, loadSample } = useTemplates()
const router = useRouter()

async function tryExample() {
  await loadSample()
  await router.push({ name: 'import' })
}

const STEPS = [
  {
    icon: PhDownloadSimple,
    title: 'Prepare os arquivos',
    text: 'Exporte os relatórios do seu sistema ou baixe um dos modelos abaixo e preencha com os seus números.',
  },
  {
    icon: PhUploadSimple,
    title: 'Importe',
    text: 'Arraste os arquivos para a área de importação. O tipo de cada relatório é reconhecido pelo conteúdo.',
  },
  {
    icon: PhCursorClick,
    title: 'Explore a análise',
    text: 'Clique em Visualizar e navegue pelos indicadores, gráficos e pontos de análise de cada relatório.',
  },
]

const FEATURES = [
  {
    icon: PhChartLineUp,
    title: 'DRE',
    text: 'Receita, margens, EBITDA, resultado e saldo de caixa por mês ou acumulado do ano. Cascata da receita ao resultado, ponto de equilíbrio e a DRE completa com análise vertical.',
  },
  {
    icon: PhRanking,
    title: 'Curva ABC',
    text: 'Distribuição das classes A, B e C, ranking de produtos, evolução entre meses e quais itens subiram, caíram, entraram ou saíram do mix.',
  },
  {
    icon: PhCoins,
    title: 'Lucro por produto',
    text: 'Cruza o lucro com a Curva ABC para mostrar onde está o lucro de verdade: itens que vendem muito e lucram pouco, margens por classe, prejuízos e custos não cadastrados.',
  },
  {
    icon: PhTable,
    title: 'Outras tabelas',
    text: 'Qualquer CSV ou planilha vira uma tabela explorável, com tipos de coluna, estatísticas e gráficos por categoria.',
  },
  {
    icon: PhLightbulb,
    title: 'Pontos de análise',
    text: 'Frases objetivas geradas a partir dos números. Cada card tem um ícone de informação que explica como o valor foi calculado.',
  },
  {
    icon: PhShieldCheck,
    title: 'Privacidade',
    text: 'Tudo é processado no seu navegador. Nenhum arquivo é enviado para servidores; ao fechar ou recarregar a página, os dados somem.',
  },
]

const TIPS = [
  'Os relatórios de Curva ABC e de lucro são mensais: importe um arquivo por mês, com o mês no nome (ex.: "out.2026", "10-2026" ou "outubro 2026").',
  'Importar de novo o mesmo mês substitui a versão anterior daquele mês.',
  'Para cruzar o lucro com a Curva ABC, os dois arquivos precisam ser do mesmo mês e usar o mesmo código de produto.',
  'Números podem vir no formato brasileiro (1.234,56) ou internacional (1,234.56). CSVs em UTF-8 ou no padrão do Windows são aceitos.',
]

function scrollToTemplates() {
  document.getElementById('modelos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="space-y-20">
    <section class="animate-fade-up pt-6 text-center sm:pt-12">
      <p class="mx-auto mb-4 w-fit rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-subtle shadow-card">
        Análise de relatórios direto no navegador
      </p>
      <h1 class="mx-auto max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
        Transforme planilhas em <span class="text-accent">decisões</span>
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-fg-muted">
        Importe a DRE, a Curva ABC e o lucro por produto da sua empresa e receba indicadores, gráficos e pontos de
        análise prontos, explicados em linguagem de negócio.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <RouterLink :to="{ name: 'import' }" class="btn btn-primary px-5 py-2.5 text-base">
          <PhUploadSimple :size="18" weight="bold" aria-hidden="true" />
          Importar relatórios
        </RouterLink>
        <button type="button" class="btn btn-secondary px-5 py-2.5 text-base" :disabled="loadingSample" @click="tryExample">
          <PhPlayCircle :size="18" weight="bold" aria-hidden="true" />
          {{ loadingSample ? 'Carregando exemplo…' : 'Ver com dados de exemplo' }}
        </button>
        <button type="button" class="btn btn-secondary px-5 py-2.5 text-base" @click="scrollToTemplates">
          <PhDownloadSimple :size="18" weight="bold" aria-hidden="true" />
          Baixar modelos
        </button>
      </div>

      <RouterLink
        v-if="reports.length"
        :to="{ name: 'import' }"
        class="group card card-interactive mx-auto mt-8 flex w-fit items-center gap-3 px-4 py-3 text-sm hover:border-accent"
      >
        <PhFolderOpen :size="20" class="text-accent" aria-hidden="true" />
        Você tem {{ reports.length }} {{ reports.length === 1 ? 'relatório importado' : 'relatórios importados' }}
        <span class="inline-flex items-center gap-1 font-medium text-accent">
          Abrir
          <PhArrowRight :size="14" weight="bold" class="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </RouterLink>
    </section>

    <section aria-labelledby="como-funciona" class="space-y-6">
      <div class="text-center">
        <h2 id="como-funciona" class="text-2xl font-semibold">Como funciona</h2>
        <p class="mt-1 text-fg-muted">Três passos, sem cadastro e sem instalar nada.</p>
      </div>
      <ol class="grid gap-4 md:grid-cols-3">
        <li
          v-for="(step, i) in STEPS"
          :key="step.title"
          class="card card-interactive animate-fade-up stagger p-5"
          :style="{ '--i': i }"
        >
          <div class="flex items-center gap-3">
            <span class="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
              <component :is="step.icon" :size="20" weight="bold" aria-hidden="true" />
            </span>
            <span class="text-sm font-semibold text-fg-subtle">Passo {{ i + 1 }}</span>
          </div>
          <h3 class="mt-4 font-semibold">{{ step.title }}</h3>
          <p class="mt-1 text-sm text-fg-muted">{{ step.text }}</p>
        </li>
      </ol>
    </section>

    <section aria-labelledby="recursos" class="space-y-6">
      <div class="text-center">
        <h2 id="recursos" class="text-2xl font-semibold">O que você consegue ver</h2>
        <p class="mt-1 text-fg-muted">Cada tipo de relatório ganha um painel próprio.</p>
      </div>
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="(feature, i) in FEATURES"
          :key="feature.title"
          class="card card-interactive animate-fade-up stagger p-5"
          :style="{ '--i': i }"
        >
          <component :is="feature.icon" :size="28" weight="duotone" class="text-accent" aria-hidden="true" />
          <h3 class="mt-3 font-semibold">{{ feature.title }}</h3>
          <p class="mt-1 text-sm text-fg-muted">{{ feature.text }}</p>
        </li>
      </ul>
    </section>

    <section id="modelos" aria-labelledby="modelos-titulo" class="scroll-mt-24 space-y-6">
      <div class="text-center">
        <h2 id="modelos-titulo" class="text-2xl font-semibold">Modelos para preencher</h2>
        <p class="mx-auto mt-1 max-w-2xl text-fg-muted">
          Não tem os relatórios no formato certo? Baixe um modelo, substitua os dados de exemplo pelos seus e importe.
          Os modelos já vêm preenchidos com uma empresa fictícia, então você também pode importá-los direto para ver o
          resultado.
        </p>
      </div>
      <ul class="grid gap-4 lg:grid-cols-3">
        <li
          v-for="(template, i) in templates"
          :key="template.kind"
          class="card animate-fade-up stagger flex flex-col p-5"
          :style="{ '--i': i }"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold">{{ template.title }}</h3>
              <span class="mt-1 inline-block rounded-md bg-surface-muted px-1.5 text-xs font-semibold text-fg-subtle">
                {{ template.format }}
              </span>
            </div>
            <component
              :is="template.format === 'XLSX' ? PhFileXls : PhFileCsv"
              :size="32"
              weight="duotone"
              class="text-accent"
              aria-hidden="true"
            />
          </div>
          <p class="mt-3 text-sm text-fg-muted">{{ template.description }}</p>
          <p class="mt-3 text-xs font-medium text-fg-subtle">{{ template.kind === 'dre' ? 'Conteúdo' : 'Colunas' }}</p>
          <ul class="mt-1 flex flex-wrap gap-1">
            <li
              v-for="column in template.columns"
              :key="column"
              class="rounded-md border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-fg-muted"
            >
              {{ column }}
            </li>
          </ul>
          <p class="mt-3 mb-5 text-xs text-fg-subtle">{{ template.naming }}</p>
          <button
            type="button"
            class="btn btn-primary mt-auto w-full"
            :disabled="downloading === template.kind"
            @click="download(template.kind)"
          >
            <PhDownloadSimple :size="16" weight="bold" aria-hidden="true" />
            {{ downloading === template.kind ? 'Gerando…' : `Baixar modelo ${template.format}` }}
          </button>
        </li>
      </ul>
    </section>

    <section aria-labelledby="dicas" class="card mx-auto max-w-3xl p-6">
      <h2 id="dicas" class="flex items-center gap-2 text-lg font-semibold">
        <PhLightbulb :size="20" weight="duotone" class="text-accent" aria-hidden="true" />
        Dicas para importar
      </h2>
      <ul class="mt-3 space-y-2 text-sm text-fg-muted">
        <li v-for="tip in TIPS" :key="tip" class="flex gap-2">
          <span class="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          {{ tip }}
        </li>
      </ul>
      <RouterLink :to="{ name: 'import' }" class="btn btn-primary mt-5">
        Começar agora
        <PhArrowRight :size="16" weight="bold" aria-hidden="true" />
      </RouterLink>
    </section>
  </div>
</template>
