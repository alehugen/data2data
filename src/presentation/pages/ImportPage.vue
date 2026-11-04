<script setup lang="ts">
import { PhChartLineUp, PhCheckCircle, PhRanking, PhTable, PhX } from '@phosphor-icons/vue'
import { computed } from 'vue'
import type { MonthlyReport } from '@/domain/report'
import { compareByPeriod, periodKey } from '@/domain/shared'
import FileDropzone from '@/presentation/components/FileDropzone.vue'
import ReportCard from '@/presentation/components/ReportCard.vue'
import { Button } from '@/presentation/components/ui/button'
import { Card } from '@/presentation/components/ui/card'
import { useFileImport } from '@/presentation/composables/useFileImport'
import { useReports } from '@/presentation/composables/useReports'
import { useTemplates } from '@/presentation/composables/useTemplates'
import { describeReport, formatAbcMonth, formatPeriod, formatPeriodList } from '@/presentation/format'
import { routeForReport } from '@/presentation/router'

const { reports, dreReports, abcReports, profitReports, datasets, remove } = useReports()
const { isImporting, errors, lastImported, importFiles, dismissSummary } = useFileImport()
const { loadSample } = useTemplates()

const byPeriod = <T extends MonthlyReport>(list: readonly T[]) => [...list].sort(compareByPeriod)

const abcMonths = computed(() => byPeriod(abcReports.value))
const profitMonths = computed(() => byPeriod(profitReports.value))
const monthlyCount = computed(() => abcMonths.value.length + profitMonths.value.length)

const withoutPeriod = computed(() => [...abcMonths.value, ...profitMonths.value].filter((report) => !report.period))

const profitWithoutAbc = computed(() => {
  const abcKeys = new Set(abcReports.value.flatMap((r) => (r.period ? [periodKey(r.period)] : [])))
  return profitMonths.value.filter((r) => r.period && !abcKeys.has(periodKey(r.period)))
})

const importSummary = computed(() => {
  const available = new Set(reports.value.map((report) => report.id))
  const imported = lastImported.value.filter((report) => available.has(report.id))
  const monthly = imported.filter((r) => r.kind === 'abc' || r.kind === 'profit')
  const others = imported.filter((r) => r.kind !== 'abc' && r.kind !== 'profit')
  return [
    ...others.map((report) => ({ key: report.id, label: describeReport(report), to: routeForReport(report) })),
    ...(monthly.length
      ? [{ key: 'monthly', label: monthly.map(describeReport).join(', '), to: routeForReport(monthly[0]!) }]
      : []),
  ]
})
</script>

<template>
  <section class="space-y-10">
    <div class="max-w-3xl">
      <h1 class="text-4xl leading-tight font-bold tracking-tight">Meus relatórios</h1>
      <p class="mt-2 text-lg text-body">
        Envie a planilha da DRE e, para cada mês, os CSVs de Curva ABC e de lucro por produto. Outras tabelas também
        podem ser exploradas.
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        Os arquivos estão em outro formato?
        <RouterLink :to="{ name: 'home', hash: '#modelos' }" class="link">Baixe os modelos</RouterLink>
        ou
        <button type="button" class="link disabled:opacity-50" :disabled="isImporting" @click="loadSample">
          experimente com dados de exemplo</button
        >.
      </p>
    </div>

    <FileDropzone :disabled="isImporting" @select="importFiles" />

    <TransitionGroup name="fade" tag="div" class="space-y-2">
      <p
        v-for="error in errors"
        :key="error"
        role="alert"
        class="rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive"
      >
        {{ error }}
      </p>
    </TransitionGroup>

    <Transition name="fade">
      <Card v-if="importSummary.length" role="status" class="gap-3 border-l-4 border-l-success p-5">
        <div class="flex items-start justify-between gap-3">
          <p class="flex items-center gap-2 text-lg font-semibold">
            <PhCheckCircle :size="22" weight="fill" class="text-success" aria-hidden="true" />
            Importação concluída
          </p>
          <Button variant="ghost" size="icon-sm" aria-label="Fechar resumo da importação" @click="dismissSummary">
            <PhX aria-hidden="true" />
          </Button>
        </div>
        <ul class="divide-y divide-border">
          <li v-for="item in importSummary" :key="item.key" class="flex flex-wrap items-center justify-between gap-3 py-2">
            <span class="min-w-0 truncate text-sm">{{ item.label }}</span>
            <Button as-child size="sm">
              <RouterLink :to="item.to">Visualizar</RouterLink>
            </Button>
          </li>
        </ul>
      </Card>
    </Transition>

    <div v-if="reports.length" class="grid gap-x-6 gap-y-10 lg:grid-cols-2">
      <div v-if="dreReports.length" class="space-y-4">
        <h2 class="text-2xl font-semibold tracking-tight">Demonstração do resultado</h2>
        <TransitionGroup name="list" tag="div" class="relative space-y-3">
          <ReportCard
            v-for="report in dreReports"
            :key="report.id"
            :title="report.name"
            :subtitle="`${report.periods.length} ${report.periods.length === 1 ? 'mês' : 'meses'}, de ${formatPeriod(report.periods[0]!)} a ${formatPeriod(report.periods.at(-1)!)}${report.ignoredPeriods.length ? `; ${formatPeriodList(report.ignoredPeriods)} em aberto, fora da análise` : ''}`"
            :to="routeForReport(report)"
            :icon="PhChartLineUp"
            removable
            @remove="remove(report.id)"
          />
        </TransitionGroup>
      </div>

      <div v-if="monthlyCount" class="space-y-4">
        <h2 class="text-2xl font-semibold tracking-tight">Curva ABC e lucro por produto</h2>
        <ReportCard
          title="Análise mensal"
          :subtitle="`${abcMonths.length} ${abcMonths.length === 1 ? 'mês' : 'meses'} de Curva ABC e ${profitMonths.length} de lucro por produto`"
          :to="{ name: 'abc' }"
          :icon="PhRanking"
        >
          <div class="space-y-3 text-sm">
            <div v-for="group in [{ label: 'Curva ABC', items: abcMonths }, { label: 'Lucro por produto', items: profitMonths }]" :key="group.label">
              <p v-if="group.items.length" class="mb-1.5 text-xs text-muted-foreground">{{ group.label }}</p>
              <TransitionGroup name="list" tag="ul" class="relative flex flex-wrap gap-1.5">
                <li
                  v-for="report in group.items"
                  :key="report.id"
                  class="inline-flex items-center gap-0.5 rounded-md border border-border bg-background py-0.5 pr-0.5 pl-2.5 figure"
                >
                  {{ formatAbcMonth(report) }}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    class="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                    :aria-label="`Remover ${describeReport(report)}`"
                    @click="remove(report.id)"
                  >
                    <PhX aria-hidden="true" />
                  </Button>
                </li>
              </TransitionGroup>
            </div>
            <p v-if="withoutPeriod.length" class="text-xs text-destructive">
              Mês não identificado no nome de: {{ withoutPeriod.map((r) => r.name).join(', ') }}. Renomeie com o mês (ex.:
              "out.2026") e importe de novo para comparar meses e cruzar com o lucro.
            </p>
            <p v-if="profitWithoutAbc.length" class="text-xs text-destructive">
              Sem Curva ABC correspondente: {{ profitWithoutAbc.map(formatAbcMonth).join(', ') }}. Importe a Curva ABC do mesmo mês para cruzar os dados.
            </p>
          </div>
        </ReportCard>
      </div>

      <div v-if="datasets.length" class="space-y-4 lg:col-span-2">
        <h2 class="text-2xl font-semibold tracking-tight">Outras tabelas</h2>
        <TransitionGroup name="list" tag="div" class="relative grid gap-3 lg:grid-cols-2">
          <ReportCard
            v-for="dataset in datasets"
            :key="dataset.id"
            :title="dataset.name"
            :subtitle="`${dataset.sourceFormat.toUpperCase()} com ${dataset.rowCount} linhas e ${dataset.columns.length} colunas`"
            :to="routeForReport(dataset)"
            :icon="PhTable"
            removable
            @remove="remove(dataset.id)"
          />
        </TransitionGroup>
      </div>
    </div>

    <p v-else class="text-muted-foreground">Nenhum relatório importado ainda. Os arquivos que você enviar aparecem aqui.</p>
  </section>
</template>
