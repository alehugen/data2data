<script setup lang="ts">
import { computed } from 'vue'
import ChartCard from '@/presentation/components/ChartCard.vue'
import InsightList from '@/presentation/components/InsightList.vue'
import NotFound from '@/presentation/components/NotFound.vue'
import PageHeader from '@/presentation/components/PageHeader.vue'
import PageSection from '@/presentation/components/PageSection.vue'
import RankingBarChart from '@/presentation/components/RankingBarChart.vue'
import ReportLayout from '@/presentation/components/ReportLayout.vue'
import SectionHeading from '@/presentation/components/SectionHeading.vue'
import type { NavSection } from '@/presentation/components/SectionNav.vue'
import StatCard from '@/presentation/components/StatCard.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/ui/table'
import { Card } from '@/presentation/components/ui/card'
import { useDatasetAnalysis } from '@/presentation/composables/useDatasetAnalysis'
import { formatNumber } from '@/presentation/format'

const props = defineProps<{ id: string }>()
const { dataset, analysis } = useDatasetAnalysis(() => props.id)

const PREVIEW_ROWS = 20

const navSections = computed<NavSection[]>(() => [
  { id: 'analise', label: 'Pontos de análise' },
  ...(analysis.value?.breakdowns.length ? [{ id: 'graficos', label: 'Gráficos' }] : []),
  ...(analysis.value?.numericColumns.length ? [{ id: 'estatisticas', label: 'Estatísticas' }] : []),
  { id: 'previa', label: 'Prévia dos dados' },
])
</script>

<template>
  <NotFound v-if="!dataset" message="Tabela não encontrada." />

  <div v-else class="space-y-6">
    <PageHeader :title="dataset.name" :subtitle="`${dataset.rowCount} linhas · ${dataset.columns.length} colunas`" />

    <ReportLayout :sections="navSections">
      <PageSection id="analise" class="space-y-3">
        <SectionHeading title="Pontos de análise" />
        <InsightList v-if="analysis" :insights="analysis.insights" />
      </PageSection>

      <PageSection v-if="analysis?.breakdowns.length" id="graficos" class="space-y-3">
        <SectionHeading title="Gráficos" />
        <div class="grid gap-3 xl:grid-cols-2">
          <ChartCard
            v-for="(breakdown, i) in analysis.breakdowns"
            :key="breakdown.valueKey"
            :title="`${breakdown.valueKey} por ${breakdown.categoryKey}`"
            subtitle="Soma por categoria, do maior para o menor"
            info="Soma da coluna numérica agrupada pela primeira coluna de texto da tabela. Acima de 10 categorias, as menores são somadas em Outros."
            class="animate-fade-up stagger"
            :style="{ '--i': i }"
          >
            <RankingBarChart
              :items="breakdown.items.map((item) => ({ label: item.category, value: item.total }))"
              :value-label="breakdown.valueKey"
            />
          </ChartCard>
        </div>
      </PageSection>

      <PageSection v-if="analysis?.numericColumns.length" id="estatisticas" class="space-y-6">
        <SectionHeading title="Estatísticas" subtitle="Colunas numéricas" />
        <div
          v-for="({ column, statistics }, i) in analysis.numericColumns"
          :key="column.key"
          class="animate-fade-up stagger space-y-3"
          :style="{ '--i': i }"
        >
          <h3 class="font-semibold">{{ column.label }}</h3>
          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Soma"
              :value="formatNumber(statistics.sum)"
              :info="`Soma de todos os valores numéricos da coluna (${statistics.count} valores).`"
            />
            <StatCard
              label="Média"
              :value="formatNumber(statistics.mean)"
              info="Soma ÷ quantidade de valores numéricos. Células vazias ou com texto não entram na conta."
            />
            <StatCard label="Mínimo" :value="formatNumber(statistics.min)" info="Menor valor numérico encontrado na coluna." />
            <StatCard label="Máximo" :value="formatNumber(statistics.max)" info="Maior valor numérico encontrado na coluna." />
          </div>
        </div>
      </PageSection>

      <PageSection id="previa" class="space-y-3">
        <SectionHeading title="Prévia dos dados" :subtitle="`Primeiras ${Math.min(PREVIEW_ROWS, dataset.rowCount)} linhas`" />
        <p v-if="!dataset.rowCount" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          A tabela só tem cabeçalho, sem linhas de dados.
        </p>
        <Card v-else class="gap-0 py-0">
          <Table>
            <TableHeader class="bg-muted/60">
              <TableRow>
                <TableHead v-for="column in dataset.columns" :key="column.key" class="px-3 py-2 font-medium whitespace-nowrap">
                  {{ column.label }}
                  <span class="ml-1 text-xs font-normal text-muted-foreground">{{ column.type }}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(row, i) in dataset.rows.slice(0, PREVIEW_ROWS)"
                :key="i"
               
              >
                <TableCell v-for="column in dataset.columns" :key="column.key" class="px-3 py-2 whitespace-nowrap">
                  {{ row[column.key] }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </PageSection>
    </ReportLayout>
  </div>
</template>
