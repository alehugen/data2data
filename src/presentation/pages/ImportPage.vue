<script setup lang="ts">
import { PhArrowRight, PhChartLineUp, PhCheckCircle, PhRanking, PhTable, PhX } from '@phosphor-icons/vue'
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
import { describeReport, formatAbcMonth, formatPeriod } from '@/presentation/format'
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
      ? [{ key: 'monthly', label: monthly.map(describeReport).join(' · '), to: routeForReport(monthly[0]!) }]
      : []),
  ]
})
</script>

<template>
  <section class="space-y-10">
    <div class="animate-fade-up">
      <h1 class="text-2xl font-semibold">Importar relatórios</h1>
      <p class="mt-1 text-body">
        Envie a planilha da <strong class="font-medium text-foreground">DRE</strong> e, para cada mês, os CSVs de
        <strong class="font-medium text-foreground">Curva ABC</strong> e de
        <strong class="font-medium text-foreground">Lucro por produto</strong>. Outras tabelas também podem ser exploradas.
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        Não tem os arquivos no formato certo?
        <RouterLink :to="{ name: 'home', hash: '#modelos' }" class="link">Baixe os modelos</RouterLink>
        ou
        <Button variant="link" class="h-auto p-0 text-sm" :disabled="isImporting" @click="loadSample">
          experimente com dados de exemplo</Button
        >.
      </p>
    </div>

    <FileDropzone class="animate-fade-up stagger" style="--i: 1" :disabled="isImporting" @select="importFiles" />

    <TransitionGroup name="fade" tag="div" class="space-y-2">
      <p
        v-for="error in errors"
        :key="error"
        role="alert"
        class="rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive"
      >
        {{ error }}
      </p>
    </TransitionGroup>

    <Transition name="fade">
      <Card
        v-if="importSummary.length"
        role="status"
        class="animate-fade-up gap-3 bg-success-soft/40 p-4 ring-success/40"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="flex items-center gap-2 font-medium">
            <PhCheckCircle :size="20" weight="fill" class="text-success" aria-hidden="true" />
            Importação concluída
          </p>
          <Button variant="ghost" size="icon-sm" aria-label="Fechar resumo da importação" @click="dismissSummary">
            <PhX aria-hidden="true" />
          </Button>
        </div>
        <ul class="space-y-2">
          <li
            v-for="item in importSummary"
            :key="item.key"
            class="group/item flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 shadow-card"
          >
            <span class="min-w-0 truncate text-sm">{{ item.label }}</span>
            <Button as-child size="sm" class="gap-1.5 shadow-(--elevation-primary) hover:bg-primary/90">
              <RouterLink :to="item.to">
                Visualizar
                <PhArrowRight
                  weight="bold"
                  class="transition-transform duration-(--duration-base) ease-soft group-hover/item:translate-x-0.5"
                  aria-hidden="true"
                />
              </RouterLink>
            </Button>
          </li>
        </ul>
      </Card>
    </Transition>

    <div v-if="reports.length" class="grid gap-6 lg:grid-cols-2">
      <div v-if="dreReports.length" class="space-y-3">
        <h2 class="text-lg font-semibold">Demonstração do resultado</h2>
        <TransitionGroup name="list" tag="div" class="relative space-y-2">
          <ReportCard
            v-for="(report, i) in dreReports"
            :key="report.id"
            class="animate-fade-up stagger"
            :style="{ '--i': i }"
            :title="report.name"
            :subtitle="`${report.periods.length} meses · ${formatPeriod(report.periods[0]!)} a ${formatPeriod(report.periods.at(-1)!)}`"
            :to="routeForReport(report)"
            :icon="PhChartLineUp"
            removable
            @remove="remove(report.id)"
          />
        </TransitionGroup>
      </div>

      <div v-if="monthlyCount" class="space-y-3">
        <h2 class="text-lg font-semibold">Curva ABC e lucro por produto</h2>
        <ReportCard
          class="animate-fade-up"
          title="Análise mensal"
          :subtitle="`${abcMonths.length} ${abcMonths.length === 1 ? 'mês' : 'meses'} de Curva ABC · ${profitMonths.length} de lucro por produto`"
          :to="{ name: 'abc' }"
          :icon="PhRanking"
        >
          <div class="space-y-2 text-sm">
            <div v-for="group in [{ label: 'Curva ABC', items: abcMonths }, { label: 'Lucro', items: profitMonths }]" :key="group.label">
              <p v-if="group.items.length" class="mb-1 text-xs text-muted-foreground">{{ group.label }}</p>
              <TransitionGroup name="list" tag="ul" class="relative flex flex-wrap gap-2">
                <li
                  v-for="report in group.items"
                  :key="report.id"
                  class="inline-flex items-center gap-0.5 rounded-full border border-border bg-card py-0.5 pr-0.5 pl-3 shadow-card"
                >
                  {{ formatAbcMonth(report) }}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    class="rounded-full text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
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

      <div v-if="datasets.length" class="space-y-3 lg:col-span-2">
        <h2 class="text-lg font-semibold">Outras tabelas</h2>
        <TransitionGroup name="list" tag="div" class="relative space-y-2">
          <ReportCard
            v-for="(dataset, i) in datasets"
            :key="dataset.id"
            class="animate-fade-up stagger"
            :style="{ '--i': i }"
            :title="dataset.name"
            :subtitle="`${dataset.sourceFormat.toUpperCase()} · ${dataset.rowCount} linhas · ${dataset.columns.length} colunas`"
            :to="routeForReport(dataset)"
            :icon="PhTable"
            removable
            @remove="remove(dataset.id)"
          />
        </TransitionGroup>
      </div>
    </div>
  </section>
</template>
