<script setup lang="ts">
import {
  PhChartLineUp,
  PhCoins,
  PhDownloadSimple,
  PhFileCsv,
  PhFileXls,
  PhLightbulb,
  PhPlayCircle,
  PhRanking,
  PhShieldCheck,
  PhTable,
  PhUploadSimple,
} from '@phosphor-icons/vue'
import { useRouter } from 'vue-router'
import SampleStatement from '@/presentation/components/SampleStatement.vue'
import { Badge } from '@/presentation/components/ui/badge'
import { Button } from '@/presentation/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import { useReports } from '@/presentation/composables/useReports'
import { useTemplates } from '@/presentation/composables/useTemplates'
import { formatPeriodLong } from '@/presentation/format'

const { reports } = useReports()
const { templates, samplePeriod, sampleStatement, downloading, downloadError, loadingSample, download, loadSample } =
  useTemplates()
const router = useRouter()

async function tryExample() {
  await loadSample()
  await router.push({ name: 'import' })
}

const STEPS = [
  {
    title: 'Prepare os arquivos',
    text: 'Exporte os relatórios do seu sistema ou baixe um dos modelos abaixo e preencha com os seus números.',
  },
  {
    title: 'Importe',
    text: 'Arraste os arquivos para a área de importação. O tipo de cada relatório é reconhecido pelo conteúdo.',
  },
  {
    title: 'Leia a análise',
    text: 'Abra cada relatório e navegue pelos indicadores, gráficos e pontos de análise.',
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
    text: 'Cruza o lucro com a Curva ABC: itens que vendem muito e lucram pouco, margens por classe, prejuízos e custos não cadastrados.',
  },
  {
    icon: PhTable,
    title: 'Outras tabelas',
    text: 'Qualquer CSV ou planilha vira uma tabela explorável, com tipos de coluna, estatísticas e gráficos por categoria.',
  },
  {
    icon: PhLightbulb,
    title: 'Pontos de análise',
    text: 'Frases objetivas geradas a partir dos números, cada uma com a explicação de como o valor foi calculado.',
  },
  {
    icon: PhShieldCheck,
    title: 'Privacidade',
    text: 'Tudo é processado no seu navegador. Nenhum arquivo é enviado para servidores; ao recarregar a página, os dados somem.',
  },
]

const TIPS = [
  'Curva ABC e lucro são mensais: importe um arquivo por mês, com o mês no nome (ex.: "out.2026", "10-2026" ou "outubro 2026").',
  'Importar de novo o mesmo mês substitui a versão anterior daquele mês.',
  'Para cruzar o lucro com a Curva ABC, os dois arquivos precisam ser do mesmo mês e usar o mesmo código de produto.',
  'Números podem vir no formato brasileiro (1.234,56) ou internacional (1,234.56). CSVs em UTF-8 ou no padrão do Windows são aceitos.',
]
</script>

<template>
  <div class="space-y-24">
    <section class="grid items-center gap-12 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:pt-10">
      <div class="max-w-2xl">
        <h1 class="text-5xl leading-[1.02] font-bold tracking-tight sm:text-display">
          Veja onde a empresa ganha e onde perde dinheiro.
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-relaxed text-body">
          Importe a DRE, a Curva ABC e o lucro por produto. O data2data monta os indicadores, os gráficos e os pontos
          de análise, e explica como cada número foi calculado.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <Button as-child size="lg" class="h-11 px-5 text-base">
            <RouterLink :to="{ name: 'import' }">
              <PhUploadSimple weight="bold" aria-hidden="true" />
              Importar relatórios
            </RouterLink>
          </Button>
          <Button variant="outline" size="lg" class="h-11 px-5 text-base" :disabled="loadingSample" @click="tryExample">
            <PhPlayCircle weight="bold" aria-hidden="true" />
            {{ loadingSample ? 'Carregando exemplo…' : 'Ver com dados de exemplo' }}
          </Button>
        </div>
        <p class="mt-5 text-sm text-muted-foreground">
          <template v-if="reports.length">
            Você já tem {{ reports.length }} {{ reports.length === 1 ? 'relatório importado' : 'relatórios importados' }}.
            <RouterLink :to="{ name: 'import' }" class="link">Abrir meus relatórios</RouterLink>
          </template>
          <template v-else>
            Sem cadastro e sem instalar nada.
            <a href="#modelos" class="link">Baixe os modelos</a> se os seus arquivos estiverem em outro formato.
          </template>
        </p>
      </div>

      <figure class="rounded-xl border border-border bg-card p-6 shadow-raised sm:p-8">
        <SampleStatement
          :lines="sampleStatement"
          :caption="`DRE de exemplo, ${formatPeriodLong(samplePeriod)}`"
        />
        <figcaption class="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          Números da cafeteria fictícia que vem nos modelos.
        </figcaption>
      </figure>
    </section>

    <section aria-labelledby="como-funciona">
      <h2 id="como-funciona" class="text-3xl font-semibold tracking-tight">Como funciona</h2>
      <ol class="mt-8 grid gap-8 md:grid-cols-3">
        <li v-for="(step, i) in STEPS" :key="step.title" class="border-t-2 border-foreground pt-4">
          <span class="figure text-4xl font-semibold text-muted-foreground" aria-hidden="true">{{ i + 1 }}</span>
          <h3 class="mt-2 text-xl font-semibold">{{ step.title }}</h3>
          <p class="mt-1 text-body">{{ step.text }}</p>
        </li>
      </ol>
    </section>

    <section aria-labelledby="recursos" class="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div>
        <h2 id="recursos" class="text-3xl font-semibold tracking-tight">O que você consegue ver</h2>
        <p class="mt-2 text-body">Cada tipo de relatório ganha um painel próprio.</p>
      </div>
      <dl class="divide-y divide-border border-y border-border">
        <div v-for="feature in FEATURES" :key="feature.title" class="grid gap-2 py-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6">
          <dt class="flex items-center gap-2.5 font-figure text-lg font-semibold">
            <component :is="feature.icon" :size="22" weight="duotone" class="text-muted-foreground" aria-hidden="true" />
            {{ feature.title }}
          </dt>
          <dd class="max-w-prose text-body">{{ feature.text }}</dd>
        </div>
      </dl>
    </section>

    <section id="modelos" aria-labelledby="modelos-titulo" class="scroll-mt-24">
      <div class="max-w-2xl">
        <h2 id="modelos-titulo" class="text-3xl font-semibold tracking-tight">Modelos para preencher</h2>
        <p class="mt-2 text-body">
          Baixe um modelo, troque os números de exemplo pelos seus e importe. Os modelos já vêm com os dados de uma
          empresa fictícia, então também dá para importá-los direto e ver o resultado.
        </p>
      </div>
      <ul class="mt-8 grid gap-4 lg:grid-cols-3">
        <li v-for="template in templates" :key="template.kind">
          <Card class="h-full">
            <CardHeader class="flex items-start gap-3">
              <component
                :is="template.format === 'XLSX' ? PhFileXls : PhFileCsv"
                :size="32"
                weight="duotone"
                class="shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div class="min-w-0">
                <CardTitle class="font-figure text-lg">{{ template.title }}</CardTitle>
                <p class="text-xs text-muted-foreground">Arquivo {{ template.format }}</p>
              </div>
            </CardHeader>
            <CardContent class="flex-1 space-y-4">
              <p class="text-sm text-body">{{ template.description }}</p>
              <div>
                <p class="mb-1.5 text-xs font-medium text-muted-foreground">
                  {{ template.kind === 'dre' ? 'Conteúdo' : 'Colunas' }}
                </p>
                <ul class="flex flex-wrap gap-1">
                  <li v-for="column in template.columns" :key="column">
                    <Badge variant="outline" class="font-figure text-xs font-normal text-body">{{ column }}</Badge>
                  </li>
                </ul>
              </div>
              <p class="text-xs text-muted-foreground">{{ template.naming }}</p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                class="w-full"
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
      <p v-if="downloadError" role="alert" class="mt-4 rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive">
        {{ downloadError }}
      </p>
    </section>

    <section aria-labelledby="dicas" class="max-w-3xl border-l-4 border-primary pl-6">
      <h2 id="dicas" class="text-2xl font-semibold tracking-tight">Antes de importar</h2>
      <ul class="mt-4 list-disc space-y-2 pl-5 text-body marker:text-muted-foreground">
        <li v-for="tip in TIPS" :key="tip">{{ tip }}</li>
      </ul>
    </section>
  </div>
</template>
