<script setup lang="ts">
import { PhCheckCircle, PhX } from '@phosphor-icons/vue'
import { computed, shallowRef } from 'vue'
import type { Report } from '@/domain/report'
import { comparePeriods, periodKey, type Period } from '@/domain/shared'
import FileDropzone from '@/presentation/components/FileDropzone.vue'
import ReportCard from '@/presentation/components/ReportCard.vue'
import { useFileImport } from '@/presentation/composables/useFileImport'
import { useReports } from '@/presentation/composables/useReports'
import { describeReport, formatAbcMonth, formatPeriod } from '@/presentation/format'
import { routeForReport } from '@/presentation/router'

const { reports, dreReports, abcReports, profitReports, datasets, remove } = useReports()
const { isImporting, errors, importFiles } = useFileImport()

const lastImported = shallowRef<Report[]>([])

const byPeriod = <T extends { period: Period | null }>(list: readonly T[]) =>
  [...list].sort((a, b) => {
    if (a.period && b.period) return comparePeriods(a.period, b.period)
    return a.period ? -1 : b.period ? 1 : 0
  })

const abcMonths = computed(() => byPeriod(abcReports.value))
const profitMonths = computed(() => byPeriod(profitReports.value))
const monthlyCount = computed(() => abcMonths.value.length + profitMonths.value.length)

const profitWithoutAbc = computed(() => {
  const abcKeys = new Set(abcReports.value.flatMap((r) => (r.period ? [periodKey(r.period)] : [])))
  return profitMonths.value.filter((r) => !r.period || !abcKeys.has(periodKey(r.period)))
})

const importSummary = computed(() => {
  const monthly = lastImported.value.filter((r) => r.kind === 'abc' || r.kind === 'profit')
  const others = lastImported.value.filter((r) => r.kind !== 'abc' && r.kind !== 'profit')
  return [
    ...others.map((report) => ({ key: report.id, label: describeReport(report), to: routeForReport(report) })),
    ...(monthly.length
      ? [{ key: 'monthly', label: monthly.map(describeReport).join(' · '), to: routeForReport(monthly[0]!) }]
      : []),
  ]
})

async function onSelect(files: File[]) {
  lastImported.value = await importFiles(files)
}
</script>

<template>
  <section class="space-y-10">
    <div class="animate-fade-up">
      <h1 class="text-2xl font-semibold">Importar relatórios</h1>
      <p class="mt-1 text-fg-muted">
        Envie a planilha da <strong class="font-medium text-fg">DRE</strong> e, para cada mês, os CSVs de
        <strong class="font-medium text-fg">Curva ABC</strong> e de
        <strong class="font-medium text-fg">Lucro por produto</strong>. Outras tabelas também podem ser exploradas.
      </p>
    </div>

    <FileDropzone class="animate-fade-up stagger" style="--i: 1" :disabled="isImporting" @select="onSelect" />

    <TransitionGroup name="fade" tag="div" class="space-y-2">
      <p
        v-for="error in errors"
        :key="error"
        role="alert"
        class="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger"
      >
        {{ error }}
      </p>
    </TransitionGroup>

    <Transition name="fade">
      <div
        v-if="importSummary.length"
        role="status"
        class="card animate-fade-up space-y-3 border-success/40 bg-success-soft/40 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="flex items-center gap-2 font-medium">
            <PhCheckCircle :size="20" weight="fill" class="text-success" aria-hidden="true" />
            Importação concluída
          </p>
          <button
            type="button"
            class="btn btn-sm btn-secondary"
            aria-label="Fechar resumo da importação"
            @click="lastImported = []"
          >
            <PhX :size="14" aria-hidden="true" />
          </button>
        </div>
        <ul class="space-y-2">
          <li
            v-for="item in importSummary"
            :key="item.key"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2"
          >
            <span class="min-w-0 truncate text-sm">{{ item.label }}</span>
            <RouterLink :to="item.to" class="btn btn-sm btn-primary">Visualizar</RouterLink>
          </li>
        </ul>
      </div>
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
        >
          <div class="space-y-2 text-sm">
            <div v-for="group in [{ label: 'Curva ABC', items: abcMonths }, { label: 'Lucro', items: profitMonths }]" :key="group.label">
              <p v-if="group.items.length" class="mb-1 text-xs text-fg-subtle">{{ group.label }}</p>
              <TransitionGroup name="list" tag="ul" class="relative flex flex-wrap gap-2">
                <li
                  v-for="report in group.items"
                  :key="report.id"
                  class="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted py-0.5 pr-1 pl-3"
                >
                  {{ formatAbcMonth(report) }}
                  <button
                    type="button"
                    class="btn btn-danger size-6 rounded-full p-0"
                    :aria-label="`Remover ${describeReport(report)}`"
                    @click="remove(report.id)"
                  >
                    <PhX :size="12" aria-hidden="true" />
                  </button>
                </li>
              </TransitionGroup>
            </div>
            <p v-if="profitWithoutAbc.length" class="text-xs text-danger">
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
            removable
            @remove="remove(dataset.id)"
          />
        </TransitionGroup>
      </div>
    </div>
  </section>
</template>
