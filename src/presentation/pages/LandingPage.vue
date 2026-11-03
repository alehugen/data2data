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
import { Badge } from '@/presentation/components/ui/badge'
import { Button } from '@/presentation/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/presentation/components/ui/card'
import { useReports } from '@/presentation/composables/useReports'
import { useTemplates } from '@/presentation/composables/useTemplates'

const { reports } = useReports()
const { templates, downloading, downloadError, loadingSample, download, loadSample } = useTemplates()
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
      <Badge variant="outline" class="mx-auto mb-4 h-6 bg-card px-3 text-muted-foreground shadow-card">
        <PhShieldCheck weight="fill" class="text-primary" aria-hidden="true" />
        Análise de relatórios direto no navegador
      </Badge>
      <h1 class="mx-auto max-w-3xl text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
        Transforme planilhas em <span class="text-primary">decisões</span>
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-body">
        Importe a DRE, a Curva ABC e o lucro por produto da sua empresa e receba indicadores, gráficos e pontos de
        análise prontos, explicados em linguagem de negócio.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <Button as-child size="lg" class="group h-11 px-5 text-base shadow-(--elevation-primary) hover:bg-primary/90">
          <RouterLink :to="{ name: 'import' }">
            <PhUploadSimple weight="bold" aria-hidden="true" />
            Importar relatórios
          </RouterLink>
        </Button>
        <Button variant="outline" size="lg" class="h-11 px-5 text-base" :disabled="loadingSample" @click="tryExample">
          <PhPlayCircle weight="bold" aria-hidden="true" />
          {{ loadingSample ? 'Carregando exemplo…' : 'Ver com dados de exemplo' }}
        </Button>
        <Button variant="ghost" size="lg" class="h-11 px-5 text-base" @click="scrollToTemplates">
          <PhDownloadSimple weight="bold" aria-hidden="true" />
          Baixar modelos
        </Button>
      </div>

      <Card v-if="reports.length" class="group/open card-interactive mx-auto mt-8 w-fit flex-row items-center gap-3 px-4 py-3 text-sm">
        <PhFolderOpen :size="20" weight="duotone" class="text-primary" aria-hidden="true" />
        Você tem {{ reports.length }} {{ reports.length === 1 ? 'relatório importado' : 'relatórios importados' }}
        <RouterLink
          :to="{ name: 'import' }"
          class="inline-flex items-center gap-1 font-medium text-primary after:absolute after:inset-0 after:content-['']"
        >
          Abrir
          <PhArrowRight weight="bold" class="transition-transform group-hover/open:translate-x-0.5" aria-hidden="true" />
        </RouterLink>
      </Card>
    </section>

    <section aria-labelledby="como-funciona" class="space-y-6">
      <div class="text-center">
        <h2 id="como-funciona" class="text-2xl font-semibold">Como funciona</h2>
        <p class="mt-1 text-body">Três passos, sem cadastro e sem instalar nada.</p>
      </div>
      <ol class="grid gap-4 md:grid-cols-3">
        <li v-for="(step, i) in STEPS" :key="step.title" class="animate-fade-up stagger" :style="{ '--i': i }">
          <Card class="card-interactive h-full gap-3 px-5 py-5">
            <div class="flex items-center gap-3">
              <span class="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
                <component :is="step.icon" :size="20" weight="bold" aria-hidden="true" />
              </span>
              <Badge variant="secondary">Passo {{ i + 1 }}</Badge>
            </div>
            <CardTitle>{{ step.title }}</CardTitle>
            <CardDescription class="text-body">{{ step.text }}</CardDescription>
          </Card>
        </li>
      </ol>
    </section>

    <section aria-labelledby="recursos" class="space-y-6">
      <div class="text-center">
        <h2 id="recursos" class="text-2xl font-semibold">O que você consegue ver</h2>
        <p class="mt-1 text-body">Cada tipo de relatório ganha um painel próprio.</p>
      </div>
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="(feature, i) in FEATURES" :key="feature.title" class="animate-fade-up stagger" :style="{ '--i': i }">
          <Card class="card-interactive h-full gap-2 px-5 py-5">
            <component :is="feature.icon" :size="28" weight="duotone" class="text-primary" aria-hidden="true" />
            <CardTitle class="mt-1">{{ feature.title }}</CardTitle>
            <CardDescription class="text-body">{{ feature.text }}</CardDescription>
          </Card>
        </li>
      </ul>
    </section>

    <section id="modelos" aria-labelledby="modelos-titulo" class="scroll-mt-24 space-y-6">
      <div class="text-center">
        <h2 id="modelos-titulo" class="text-2xl font-semibold">Modelos para preencher</h2>
        <p class="mx-auto mt-1 max-w-2xl text-body">
          Não tem os relatórios no formato certo? Baixe um modelo, substitua os dados de exemplo pelos seus e importe.
          Os modelos já vêm preenchidos com uma empresa fictícia, então você também pode importá-los direto para ver o
          resultado.
        </p>
      </div>
      <ul class="grid gap-4 lg:grid-cols-3">
        <li v-for="(template, i) in templates" :key="template.kind" class="animate-fade-up stagger" :style="{ '--i': i }">
          <Card class="h-full">
            <CardHeader>
              <CardTitle>{{ template.title }}</CardTitle>
              <CardDescription>
                <Badge variant="secondary" class="font-mono">{{ template.format }}</Badge>
              </CardDescription>
              <CardAction>
                <component
                  :is="template.format === 'XLSX' ? PhFileXls : PhFileCsv"
                  :size="32"
                  weight="duotone"
                  class="text-primary"
                  aria-hidden="true"
                />
              </CardAction>
            </CardHeader>
            <CardContent class="flex-1 space-y-3">
              <p class="text-sm text-body">{{ template.description }}</p>
              <div>
                <p class="mb-1 text-xs font-medium text-muted-foreground">
                  {{ template.kind === 'dre' ? 'Conteúdo' : 'Colunas' }}
                </p>
                <ul class="flex flex-wrap gap-1">
                  <li v-for="column in template.columns" :key="column">
                    <Badge variant="outline" class="font-mono text-[0.6875rem] font-normal text-body">{{ column }}</Badge>
                  </li>
                </ul>
              </div>
              <p class="text-xs text-muted-foreground">{{ template.naming }}</p>
            </CardContent>
            <CardFooter>
              <Button
                class="w-full shadow-(--elevation-primary) hover:bg-primary/90"
                :disabled="downloading === template.kind"
                @click="download(template.kind)"
              >
                <PhDownloadSimple weight="bold" aria-hidden="true" />
                {{ downloading === template.kind ? 'Gerando…' : `Baixar modelo ${template.format}` }}
              </Button>
            </CardFooter>
          </Card>
        </li>
      </ul>
      <p v-if="downloadError" role="alert" class="rounded-lg bg-destructive-soft px-4 py-3 text-center text-sm text-destructive">
        {{ downloadError }}
      </p>
    </section>

    <Card role="region" aria-labelledby="dicas" class="mx-auto max-w-3xl gap-3 px-6 py-6">
      <h2 id="dicas" class="flex items-center gap-2 text-lg font-semibold">
        <PhLightbulb :size="20" weight="duotone" class="text-primary" aria-hidden="true" />
        Dicas para importar
      </h2>
      <ul class="space-y-2 text-sm text-body">
        <li v-for="tip in TIPS" :key="tip" class="flex gap-2">
          <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          {{ tip }}
        </li>
      </ul>
      <Button as-child class="group mt-2 w-fit shadow-(--elevation-primary) hover:bg-primary/90">
        <RouterLink :to="{ name: 'import' }">
          Começar agora
          <PhArrowRight weight="bold" class="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </RouterLink>
      </Button>
    </Card>
  </div>
</template>
