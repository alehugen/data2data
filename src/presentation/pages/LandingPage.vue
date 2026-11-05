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
    text: 'Receita, margens, EBITDA, resultado e saldo de caixa por mês ou acumulado do ano. Meta de lucro com caminhos para alcançá-la e a DRE completa, com os lançamentos de cada valor.',
  },
  {
    icon: PhRanking,
    title: 'Curva ABC',
    text: 'Distribuição das classes A, B e C, ranking de produtos, evolução entre meses e quais itens subiram, caíram, entraram ou saíram do mix.',
  },
  {
    icon: PhCoins,
    title: 'Lucro por produto',
    text: 'Cruza o lucro com a Curva ABC: lucro bruto e margem por item, itens que vendem muito e lucram pouco, prejuízos e custos não cadastrados.',
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
    <section class="grid items-start gap-14 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] lg:gap-20 lg:pt-12">
      <div class="max-w-2xl lg:pt-16">
        <h1 class="animate-rise text-[3rem] leading-none font-bold tracking-[-0.04em] sm:text-display">
          Imprima o mês e veja a conta fechar.
        </h1>
        <p class="mt-7 max-w-xl animate-rise text-lg leading-relaxed text-body sm:text-xl [animation-delay:80ms]">
          Importe a DRE, a Curva ABC e o lucro por produto. O data2data soma linha por linha, como um cupom, aponta o
          que comeu a margem e explica como cada número foi calculado.
        </p>
        <div class="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:160ms]">
          <Button as-child size="lg" class="h-11 px-5 text-base shadow-primary">
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
        <p class="mt-5 animate-rise text-sm text-muted-foreground [animation-delay:240ms]">
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

      <figure class="mx-auto w-full max-w-md lg:mx-0">
        <div
          class="relative z-(--layer-raised) -mx-3 h-5 rounded-t-2xl bg-printer shadow-[inset_0_-6px_10px_rgb(0_0_0/0.6)]"
          aria-hidden="true"
        />
        <div class="[clip-path:inset(0_-4rem_-6rem_-4rem)]">
          <div class="origin-top rotate-[1.2deg] animate-print drop-shadow-[0_28px_32px_rgb(8_6_28/0.35)] [animation-delay:300ms]">
            <SampleStatement
              :lines="sampleStatement"
              issuer="Cafeteria exemplo"
              :caption="`DRE de ${formatPeriodLong(samplePeriod)}`"
            />
          </div>
        </div>
        <figcaption class="mt-8 text-center text-sm text-muted-foreground">
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
          <dt class="flex items-center gap-2.5 text-base font-semibold">
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
                <CardTitle class="text-base">{{ template.title }}</CardTitle>
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
                    <Badge variant="outline" class="text-xs font-normal text-body">{{ column }}</Badge>
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
