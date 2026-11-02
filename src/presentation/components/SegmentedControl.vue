<script setup lang="ts" generic="T extends string">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    options: readonly { value: T; label: string }[]
    label: string
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' },
)

const model = defineModel<T>({ required: true })

const activeIndex = computed(() => props.options.findIndex((option) => option.value === model.value))
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="relative grid w-fit auto-cols-fr grid-flow-col rounded-lg border border-line bg-surface-muted p-0.5"
    :class="size === 'sm' ? 'text-xs' : 'text-sm'"
  >
    <span
      v-if="activeIndex >= 0"
      aria-hidden="true"
      class="absolute inset-y-0.5 left-0.5 rounded-md bg-surface shadow-card transition-transform duration-(--duration-base) ease-soft"
      :style="{
        width: `calc((100% - 0.25rem) / ${options.length})`,
        transform: `translateX(${activeIndex * 100}%)`,
      }"
    />
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      class="relative rounded-md whitespace-nowrap"
      :class="[
        size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1',
        model === option.value ? 'text-fg' : 'text-fg-subtle hover:text-fg',
      ]"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
