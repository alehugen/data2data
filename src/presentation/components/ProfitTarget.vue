<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ProfitTargetBase } from '@/application'
import SampleStatement from '@/presentation/components/SampleStatement.vue'
import SegmentedControl from '@/presentation/components/SegmentedControl.vue'
import StatCard from '@/presentation/components/StatCard.vue'
import StatGrid from '@/presentation/components/StatGrid.vue'
import { Button } from '@/presentation/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/components/ui/table'
import { PROFIT_TARGETS, useProfitTarget } from '@/presentation/composables/useProfitTarget'
import { formatCurrencyCompact, formatCurrencyWhole, formatPercent, prettifyLabel } from '@/presentation/format'

const props = defineProps<{ base: ProfitTargetBase; reference: string; source: string }>()
const { target, projection } = useProfitTarget(() => props.base)

const options = PROFIT_TARGETS.map((value) => ({ value: String(value), label: formatCurrencyCompact(value) }))
const selected = computed({
  get: () => String(target.value),
  set: (value: string) => (target.value = Number(value)),
})

const STEPS = ['Resultado', 'Hoje × meta', 'Como calculamos', 'Linha a linha', 'Caminhos e sugestões'] as const
const step = ref(0)
const headings = ref<(HTMLElement | null)[]>([])

async function goTo(index: number) {
  if (index === step.value || index < 0 || index >= STEPS.length) return
  step.value = index
  await nextTick()
  headings.value[index]?.focus({ preventScroll: true })
}

const slideState = (index: number) => (index === step.value ? 'active' : index < step.value ? 'before' : 'after')
const SLIDE_CLASSES = {
  active: 'visible translate-x-0 opacity-100',
  before: 'invisible -translate-x-8 opacity-0',
  after: 'invisible translate-x-8 opacity-0',
}

const PROFIT_LABEL = 'Resultado operacional'
const money = (value: number) => (value < 0 ? `(${formatCurrencyWhole(value)})` : formatCurrencyWhole(value))
const perMonth = computed(() => (props.base.months > 1 ? `média mensal de ${props.base.months} meses` : props.reference))

const bars = computed(() => {
  const p = projection.value
  if (p.status === 'unreachable') return null
  const scale = Math.max(p.revenue, props.base.revenue)
  const width = (value: number) => `${(value / scale) * 100}%`
  return {
    current: width(props.base.revenue),
    shared: width(Math.min(p.revenue, props.base.revenue)),
    extra: width(Math.max(0, p.revenue - props.base.revenue)),
  }
})

const receipt = computed(() => {
  const p = projection.value
  if (p.status === 'unreachable') return []
  return [
    { label: 'Receita necessária', value: p.revenue, kind: 'start' as const },
    { label: 'Custos variáveis', value: -p.variableCosts, kind: 'step' as const },
    { label: 'Despesas fixas', value: -p.fixedCosts, kind: 'step' as const },
    { label: 'Lucro por mês', value: p.target, kind: 'total' as const },
  ]
})

const contribution = computed(() => props.base.revenue * props.base.contributionRatio)

interface ComparisonRow {
  label: string
  hint?: string
  today: number
  goal: number
  gain?: boolean
  result?: boolean
}

const comparison = computed(() => {
  const p = projection.value
  const { base } = props
  if (p.status === 'unreachable') return null
  const purchases = p.variableLines.filter((line) => line.kind === 'purchases')
  const purchasesToday = purchases.reduce((total, line) => total + line.value, 0)
  const purchasesGoal = purchases.reduce((total, line) => total + line.projected, 0)
  const variableToday = base.revenue - contribution.value

  const rows: ComparisonRow[] = [
    { label: 'Receita bruta', today: base.revenue, goal: p.revenue, gain: true },
    ...(purchases.length
      ? [
          { label: 'Compras para vender', hint: 'Mercadorias e serviços', today: purchasesToday, goal: purchasesGoal },
          {
            label: 'Outros custos variáveis',
            hint: 'Impostos e despesas variáveis',
            today: variableToday - purchasesToday,
            goal: p.variableCosts - purchasesGoal,
          },
        ]
      : [{ label: 'Custos variáveis', hint: 'Impostos, custos e despesas variáveis', today: variableToday, goal: p.variableCosts }]),
    { label: 'Despesas operacionais', hint: 'Fixas, iguais na meta', today: base.fixedCosts, goal: p.fixedCosts },
    { label: PROFIT_LABEL, today: base.profit, goal: p.target, gain: true, result: true },
  ]
  const scale = Math.max(...rows.flatMap((row) => [Math.abs(row.today), Math.abs(row.goal)]), 1)
  return {
    rows: rows.map((row) => ({
      ...row,
      todayWidth: `${(Math.abs(row.today) / scale) * 100}%`,
      goalWidth: `${(Math.abs(row.goal) / scale) * 100}%`,
      change: row.goal - row.today,
    })),
    marginToday: base.profit / base.revenue,
    marginGoal: p.revenue ? p.target / p.revenue : null,
  }
})

interface DetailRow {
  label: string
  current: number
  projected: number
  share: number | null
  total?: boolean
  purchases?: boolean
  fixed?: boolean
}

const rows = computed<DetailRow[]>(() => {
  const p = projection.value
  const { base } = props
  if (p.status === 'unreachable') return []
  const share = (value: number) => value / base.revenue
  return [
    { label: 'Receita bruta', current: base.revenue, projected: p.revenue, share: 1, total: true },
    ...p.variableLines.map((line) => ({
      label: prettifyLabel(line.label),
      current: -line.value,
      projected: -line.projected,
      share: -line.ratio,
      purchases: line.kind === 'purchases',
    })),
    {
      label: 'Margem de contribuição',
      current: contribution.value,
      projected: p.revenue * base.contributionRatio,
      share: base.contributionRatio,
      total: true,
    },
    {
      label: 'Despesas operacionais',
      current: -base.fixedCosts,
      projected: -base.fixedCosts,
      share: share(-base.fixedCosts),
      fixed: true,
    },
    { label: PROFIT_LABEL, current: base.profit, projected: p.target, share: share(base.profit), total: true },
  ]
})

const signedCurrency = (value: number) => `${value > 0 ? '+' : ''}${formatCurrencyWhole(value)}`
</script>

<template>
  <div class="overflow-hidden rounded-xl border bg-card shadow-card">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <p class="text-sm font-medium">Lucro desejado por mês</p>
      <SegmentedControl v-model="selected" :options="options" label="Lucro desejado por mês" size="sm" class="flex-wrap" />
    </div>

    <div v-if="projection.status === 'unreachable'" class="max-w-prose space-y-2 p-6" aria-live="polite">
      <p class="text-lg font-semibold text-destructive">Vender mais não leva a essa meta</p>
      <p class="text-body">
        A margem de contribuição está em {{ formatPercent(base.contributionRatio) }}: os custos variáveis já consomem toda
        a receita, então cada venda a mais aumenta o prejuízo. Antes de buscar faturamento, é preciso rever preços ou
        custos variáveis.
      </p>
    </div>

    <template v-else>
      <nav aria-label="Etapas da meta de lucro" class="border-b px-5 py-3">
        <ol class="flex flex-wrap gap-2">
          <li v-for="(label, index) in STEPS" :key="label">
            <button
              type="button"
              class="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm transition-colors duration-(--duration-fast) ease-out"
              :class="step === index ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:text-foreground'"
              :aria-current="step === index ? 'step' : undefined"
              @click="goTo(index)"
            >
              <span
                class="grid size-6 place-items-center rounded-full text-xs font-semibold figure transition-colors duration-(--duration-fast) ease-out"
                :class="step === index ? 'bg-primary text-primary-foreground' : 'bg-muted'"
                aria-hidden="true"
                >{{ index + 1 }}</span
              >
              {{ label }}
            </button>
          </li>
        </ol>
      </nav>

      <div
        class="grid max-h-[max(24rem,calc(100dvh-22rem))] grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden"
        @keydown.left="goTo(step - 1)"
        @keydown.right="goTo(step + 1)"
      >
        <section
          v-for="(label, index) in STEPS"
          :key="label"
          class="min-w-0 overflow-y-auto overscroll-contain p-6 transition-[opacity,translate,visibility] duration-(--duration-base) ease-out [grid-area:1/1]"
          :class="SLIDE_CLASSES[slideState(index)]"
          :data-active="index === step"
          :inert="index !== step"
          :aria-labelledby="`meta-passo-${index}`"
        >
          <h3
            :id="`meta-passo-${index}`"
            :ref="(el) => (headings[index] = el as HTMLElement | null)"
            tabindex="-1"
            class="text-lg font-semibold outline-none"
            :class="index === 0 && 'sr-only'"
          >
            {{ label }}
          </h3>

          <div v-if="index === 0" class="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div class="min-w-0 space-y-8">
              <div aria-live="polite">
                <p class="text-body">Para lucrar {{ formatCurrencyCompact(projection.target) }} por mês, a receita precisa chegar a</p>
                <p class="mt-1 text-4xl font-bold tracking-tight figure sm:text-5xl">
                  {{ formatCurrencyCompact(projection.revenue) }}
                  <span class="block text-lg font-medium tracking-normal text-muted-foreground sm:inline">por mês</span>
                </p>
                <p v-if="projection.status === 'reached'" class="mt-3 font-medium text-success">
                  Meta atingida: o resultado operacional {{ reference }} foi de
                  {{ formatCurrencyCompact(base.profit) }}.
                </p>
              </div>

              <div
                v-if="bars"
                class="space-y-4"
                role="img"
                :aria-label="`Receita ${reference}: ${formatCurrencyCompact(base.revenue)}. Receita na meta: ${formatCurrencyCompact(projection.revenue)}.`"
              >
                <div>
                  <div class="mb-1.5 flex justify-between gap-3 text-sm">
                    <span class="text-muted-foreground">Receita {{ reference }}</span>
                    <span class="font-medium figure">{{ formatCurrencyCompact(base.revenue) }}</span>
                  </div>
                  <div class="h-3 rounded-full bg-muted">
                    <div
                      class="h-full rounded-full bg-strong transition-[width] duration-(--duration-slow) ease-out"
                      :style="{ width: bars.current }"
                    />
                  </div>
                </div>
                <div>
                  <div class="mb-1.5 flex justify-between gap-3 text-sm">
                    <span class="text-muted-foreground">Receita na meta</span>
                    <span class="font-medium figure">{{ formatCurrencyCompact(projection.revenue) }}</span>
                  </div>
                  <div class="flex h-3 gap-0.5 rounded-full bg-muted">
                    <div
                      class="h-full rounded-l-full bg-strong transition-[width] duration-(--duration-slow) ease-out"
                      :class="projection.revenueGap <= 0 && 'rounded-r-full'"
                      :style="{ width: bars.shared }"
                    />
                    <div
                      class="h-full rounded-r-full bg-primary transition-[width] duration-(--duration-slow) ease-out"
                      :style="{ width: bars.extra }"
                    />
                  </div>
                </div>
              </div>

              <StatGrid columns="grid-cols-1 sm:grid-cols-3">
                <StatCard
                  :label="projection.revenueGap >= 0 ? 'Faturar a mais' : 'Receita acima do necessário'"
                  :value="formatCurrencyCompact(Math.abs(projection.revenueGap))"
                  :hint="
                    projection.revenueChange !== null
                      ? `${projection.revenueGap >= 0 ? '+' : ''}${formatPercent(projection.revenueChange)} sobre a receita ${reference}`
                      : undefined
                  "
                />
                <StatCard
                  v-if="projection.purchasesChange !== null"
                  :label="projection.purchasesChange >= 0 ? 'Comprar a mais para vender' : 'Compras a menos'"
                  :value="formatCurrencyCompact(Math.abs(projection.purchasesChange))"
                  hint="Mercadorias e serviços, por mês"
                />
                <StatCard label="Despesas fixas" :value="formatCurrencyCompact(projection.fixedCosts)" hint="Continuam iguais por mês" />
              </StatGrid>
            </div>

            <div class="drop-shadow-[0_18px_24px_rgb(8_6_28/0.22)]">
              <SampleStatement :lines="receipt" issuer="Meta de lucro" caption="Projeção mensal" />
            </div>
          </div>

          <div v-else-if="index === 1 && comparison" class="mt-1 space-y-6">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <dl class="flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <dt class="text-sm text-muted-foreground">Margem de lucro {{ reference }}</dt>
                  <dd class="text-2xl font-semibold figure" :class="comparison.marginToday < 0 && 'text-destructive'">
                    {{ formatPercent(comparison.marginToday) }}
                  </dd>
                </div>
                <div v-if="comparison.marginGoal !== null">
                  <dt class="text-sm text-muted-foreground">Margem de lucro na meta</dt>
                  <dd class="text-2xl font-semibold text-marker-ink figure">{{ formatPercent(comparison.marginGoal) }}</dd>
                </div>
              </dl>
              <ul class="flex gap-4 text-sm text-muted-foreground" aria-label="Legenda">
                <li class="flex items-center gap-2"><span class="h-2.5 w-5 rounded-full bg-strong" aria-hidden="true" />Hoje</li>
                <li class="flex items-center gap-2"><span class="h-2.5 w-5 rounded-full bg-primary" aria-hidden="true" />Na meta</li>
              </ul>
            </div>

            <ul class="divide-y rounded-lg border">
              <li
                v-for="row in comparison.rows"
                :key="row.label"
                class="grid items-center gap-x-6 gap-y-2 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)_7.5rem]"
                :class="row.result && 'bg-accent/40'"
              >
                <div>
                  <p class="font-medium" :class="row.result && 'font-semibold'">{{ row.label }}</p>
                  <p v-if="row.hint" class="text-xs text-muted-foreground">{{ row.hint }}</p>
                </div>
                <div class="min-w-0 space-y-1.5">
                  <div class="flex items-center gap-3">
                    <div class="h-2.5 min-w-0 flex-1">
                      <div
                        class="h-full rounded-full transition-[width] duration-(--duration-slow) ease-out"
                        :class="row.today < 0 ? 'bg-destructive' : 'bg-strong'"
                        :style="{ width: row.todayWidth }"
                      />
                    </div>
                    <span class="w-24 shrink-0 text-right text-sm text-muted-foreground figure">
                      <span class="sr-only">Hoje: </span>{{ formatCurrencyWhole(row.today) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="h-2.5 min-w-0 flex-1">
                      <div
                        class="h-full rounded-full bg-primary transition-[width] duration-(--duration-slow) ease-out"
                        :style="{ width: row.goalWidth }"
                      />
                    </div>
                    <span class="w-24 shrink-0 text-right text-sm font-medium figure">
                      <span class="sr-only">Na meta: </span>{{ formatCurrencyWhole(row.goal) }}
                    </span>
                  </div>
                </div>
                <p class="text-sm figure sm:text-right" :class="Math.abs(row.change) < 0.5 ? 'text-muted-foreground' : row.gain && row.change > 0 ? 'font-medium text-success' : 'text-body'">
                  {{ Math.abs(row.change) < 0.5 ? 'igual' : signedCurrency(row.change) }}
                </p>
              </li>
            </ul>
          </div>

          <div v-else-if="index === 2" class="mt-1 space-y-6">
            <p class="text-sm text-muted-foreground">
              Três contas, com os números da DRE ({{ perMonth }}). Todos os valores são por mês.
            </p>
            <ol class="grid gap-3 lg:grid-cols-3">
              <li class="flex flex-col rounded-lg border bg-background/40 p-5">
                <span class="grid size-7 place-items-center rounded-full bg-muted text-sm font-semibold figure" aria-hidden="true">1</span>
                <h4 class="mt-3 font-semibold">Margem de contribuição</h4>
                <p class="text-sm text-muted-foreground">Quanto sobra de cada venda depois dos custos variáveis.</p>
                <p class="mt-auto pt-4 text-sm text-body figure">
                  {{ money(contribution) }} ÷ {{ money(base.revenue) }}
                </p>
                <p class="text-2xl font-semibold figure">= {{ formatPercent(base.contributionRatio) }}</p>
                <p class="mt-1 text-xs text-muted-foreground">Margem de contribuição ÷ receita bruta</p>
              </li>
              <li class="flex flex-col rounded-lg border bg-background/40 p-5">
                <span class="grid size-7 place-items-center rounded-full bg-muted text-sm font-semibold figure" aria-hidden="true">2</span>
                <h4 class="mt-3 font-semibold">Despesas fixas</h4>
                <p class="text-sm text-muted-foreground">O que a empresa paga vendendo ou não.</p>
                <p class="mt-auto pt-4 text-sm text-body figure">
                  <template v-if="base.months > 1">
                    {{ formatCurrencyWhole(base.fixedCosts * base.months) }} ÷ {{ base.months }} meses
                  </template>
                  <template v-else>Linha da DRE {{ reference }}</template>
                </p>
                <p class="text-2xl font-semibold figure">= {{ formatCurrencyWhole(base.fixedCosts) }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  Despesas operacionais{{ base.months > 1 ? ', média mensal' : '' }}
                </p>
              </li>
              <li class="flex flex-col rounded-lg border border-primary bg-accent/40 p-5">
                <span
                  class="grid size-7 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground figure"
                  aria-hidden="true"
                  >3</span
                >
                <h4 class="mt-3 font-semibold">Receita necessária</h4>
                <p class="text-sm text-muted-foreground">Quanto vender para pagar as fixas e sobrar a meta.</p>
                <p class="mt-auto pt-4 text-sm text-body figure">
                  ({{ formatCurrencyWhole(base.fixedCosts) }} + {{ formatCurrencyWhole(projection.target) }}) ÷
                  {{ formatPercent(base.contributionRatio) }}
                </p>
                <p class="text-2xl font-semibold figure">= {{ formatCurrencyWhole(projection.revenue) }}</p>
                <p class="mt-1 text-xs text-muted-foreground">(Despesas fixas + lucro desejado) ÷ margem %</p>
              </li>
            </ol>
            <div class="rounded-lg border-l-4 border-l-success bg-success-soft px-5 py-4 text-sm">
              <p class="font-semibold text-foreground">A conta fecha</p>
              <p class="mt-1 text-body figure">
                {{ formatCurrencyWhole(projection.revenue) }} de receita − {{ formatCurrencyWhole(projection.variableCosts) }} de
                custos variáveis ({{ formatPercent(1 - base.contributionRatio) }} da receita) −
                {{ formatCurrencyWhole(projection.fixedCosts) }} de despesas fixas =
                <strong class="text-foreground">{{ formatCurrencyWhole(projection.target) }} de lucro</strong>
              </p>
            </div>
            <div class="grid gap-x-8 gap-y-4 text-sm lg:grid-cols-2">
              <div>
                <h4 class="font-semibold">De onde vêm os números</h4>
                <ul class="mt-2 space-y-1.5 text-body">
                  <li>Base: {{ source }}<template v-if="base.months > 1">, média dos {{ base.months }} meses</template>.</li>
                  <li>Custos variáveis: linhas entre a receita e a margem de contribuição.</li>
                  <li>
                    Despesas fixas: linha "Despesas operacionais"<template v-if="base.months > 1">, média mensal</template>.
                  </li>
                  <li>
                    Lucro: resultado operacional, hoje {{ formatCurrencyWhole(base.profit) }} por mês.
                    <template v-if="base.excludedLines.length">
                      Fora da conta:
                      {{ base.excludedLines.map((line) => `${prettifyLabel(line.label)} (${signedCurrency(line.value)})`).join(', ') }}.
                    </template>
                  </li>
                </ul>
              </div>
              <div>
                <h4 class="font-semibold">O que a conta supõe</h4>
                <ul class="mt-2 space-y-1.5 text-body">
                  <li>Preços e custo de cada venda iguais aos de hoje: margem de {{ formatPercent(base.contributionRatio) }}.</li>
                  <li>Despesas operacionais iguais. Se crescer exigir contratar ou alugar, a meta pede mais receita.</li>
                </ul>
              </div>
            </div>
          </div>

          <div v-else-if="index === 3" class="mt-1 space-y-4">
            <p class="text-sm text-muted-foreground">Valores por mês. Custos variáveis acompanham a receita; despesas fixas ficam iguais.</p>
            <div class="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader class="bg-muted">
                  <TableRow>
                    <TableHead class="sticky left-0 bg-muted px-4">Linha da DRE</TableHead>
                    <TableHead class="px-4 text-right">Receita {{ reference }}</TableHead>
                    <TableHead class="hidden px-4 text-right sm:table-cell">% da receita</TableHead>
                    <TableHead class="px-4 text-right">Na meta</TableHead>
                    <TableHead class="px-4 text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="row in rows"
                    :key="row.label"
                    class="*:bg-card"
                    :class="[row.total && 'font-semibold', row.purchases && '*:bg-accent']"
                  >
                    <TableCell class="sticky left-0 min-w-44 px-4 whitespace-normal sm:min-w-0">
                      {{ row.label }}
                      <span
                        v-if="row.purchases"
                        class="ml-2 inline-block rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
                      >
                        compras
                      </span>
                    </TableCell>
                    <TableCell class="px-4 text-right figure" :class="row.current < 0 && 'text-destructive'">
                      {{ formatCurrencyWhole(row.current) }}
                    </TableCell>
                    <TableCell class="hidden px-4 text-right text-muted-foreground figure sm:table-cell">
                      {{ row.share !== null ? formatPercent(row.share) : '' }}
                    </TableCell>
                    <TableCell class="px-4 text-right figure" :class="row.projected < 0 && 'text-destructive'">
                      {{ formatCurrencyWhole(row.projected) }}
                    </TableCell>
                    <TableCell class="px-4 text-right figure" :class="row.fixed && 'text-muted-foreground'">
                      {{ row.fixed ? 'igual' : signedCurrency(row.projected - row.current) }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div v-else-if="projection.paths" class="mt-1 space-y-5">
            <p class="text-sm text-body">
              Faltam <strong class="text-foreground figure">{{ formatCurrencyWhole(projection.paths.gap) }}</strong> de
              resultado por mês. Cada caminho abaixo fecha essa diferença sozinho; o plano combinado divide o esforço.
            </p>
            <ul class="grid gap-3 sm:grid-cols-2">
              <li class="flex flex-col rounded-lg border p-4">
                <h4 class="font-semibold">Vender mais</h4>
                <p class="mt-1 text-2xl font-semibold figure">+{{ formatCurrencyCompact(projection.paths.sales.amount) }}</p>
                <p class="text-sm text-body">
                  de vendas por mês<template v-if="projection.paths.sales.change !== null">
                    (+{{ formatPercent(projection.paths.sales.change) }})</template
                  >, com os mesmos preços e custos.
                </p>
                <p class="mt-auto pt-2 text-xs text-muted-foreground">
                  Diferença ÷ margem de contribuição de {{ formatPercent(base.contributionRatio) }}.
                </p>
              </li>
              <li v-if="projection.paths.price !== null" class="flex flex-col rounded-lg border p-4">
                <h4 class="font-semibold">Reajustar preços</h4>
                <p class="mt-1 text-2xl font-semibold figure">+{{ formatPercent(projection.paths.price) }}</p>
                <p class="text-sm text-body">nos preços, vendendo a mesma quantidade.</p>
                <p class="mt-auto pt-2 text-xs text-muted-foreground">
                  Impostos, comissões e taxas acompanham o preço; o custo de compra não.
                </p>
              </li>
              <li v-if="projection.paths.purchases" class="flex flex-col rounded-lg border p-4">
                <h4 class="font-semibold">Negociar compras</h4>
                <p class="mt-1 text-2xl font-semibold figure">−{{ formatPercent(projection.paths.purchases.share) }}</p>
                <p class="text-sm text-body">
                  no custo das mercadorias e serviços, ou
                  {{ formatCurrencyCompact(projection.paths.purchases.amount) }} a menos por mês.
                </p>
                <p class="mt-auto pt-2 text-xs text-muted-foreground">Fornecedores, volume de compra ou troca de itens.</p>
              </li>
              <li v-if="projection.paths.fixed" class="flex flex-col rounded-lg border p-4">
                <h4 class="font-semibold">Cortar despesas operacionais</h4>
                <p class="mt-1 text-2xl font-semibold figure">−{{ formatCurrencyCompact(projection.paths.fixed.amount) }}</p>
                <p class="text-sm text-body">
                  por mês, {{ formatPercent(projection.paths.fixed.share) }} das despesas operacionais.
                </p>
                <p v-if="base.fixedGroups.length" class="mt-auto pt-2 text-xs text-muted-foreground">
                  Maiores grupos:
                  {{
                    base.fixedGroups
                      .slice(0, 3)
                      .map((group) => `${prettifyLabel(group.label)} (${formatCurrencyCompact(group.value)})`)
                      .join(', ')
                  }}.
                </p>
              </li>
              <li class="rounded-lg border border-primary bg-accent/40 p-4 sm:col-span-2">
                <h4 class="font-semibold">Plano combinado</h4>
                <p class="text-sm text-muted-foreground">Cada frente cobre um terço da diferença.</p>
                <ul class="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <li>
                    <span class="block text-lg font-semibold figure">+{{ formatCurrencyCompact(projection.paths.combined.sales) }}</span>
                    em vendas por mês
                  </li>
                  <li v-if="projection.paths.combined.price !== null">
                    <span class="block text-lg font-semibold figure">+{{ formatPercent(projection.paths.combined.price) }}</span>
                    nos preços
                  </li>
                  <li>
                    <span class="block text-lg font-semibold figure">−{{ formatCurrencyCompact(projection.paths.combined.fixed) }}</span>
                    em despesas por mês
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div v-else class="mt-1 max-w-prose space-y-2">
            <p class="text-lg font-semibold text-success">A meta já é batida com os números de hoje</p>
            <p class="text-body">
              O resultado operacional {{ reference }} foi de {{ formatCurrencyWhole(base.profit) }}, acima da meta de
              {{ formatCurrencyWhole(projection.target) }}. A folga é de
              {{ formatCurrencyWhole(base.profit - projection.target) }} por mês: dá para absorver uma queda de vendas ou
              investir sem sair da meta.
            </p>
          </div>
        </section>
      </div>

      <div class="flex items-center justify-between gap-3 border-t px-5 py-3">
        <Button variant="ghost" :disabled="step === 0" @click="goTo(step - 1)">Anterior</Button>
        <p class="text-sm text-muted-foreground figure" aria-live="polite">{{ step + 1 }} de {{ STEPS.length }}</p>
        <Button v-if="step < STEPS.length - 1" variant="outline" @click="goTo(step + 1)">
          <span class="sm:hidden">Próximo</span>
          <span class="hidden sm:inline">Próximo: {{ STEPS[step + 1] }}</span>
        </Button>
        <Button v-else variant="outline" @click="goTo(0)">Voltar ao início</Button>
      </div>
    </template>
  </div>
</template>
