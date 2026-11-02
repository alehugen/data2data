<script setup lang="ts">
import { PhInfo } from '@phosphor-icons/vue'
import { useId } from 'vue'

withDefaults(defineProps<{ text: string; label?: string }>(), { label: 'Como esta informação é calculada' })

const tooltipId = useId()
</script>

<template>
  <span class="group/info relative inline-flex">
    <button
      type="button"
      class="flex size-6 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-muted hover:text-accent"
      :aria-label="label"
      :aria-describedby="tooltipId"
      @click.stop.prevent
    >
      <PhInfo :size="16" weight="bold" aria-hidden="true" />
    </button>
    <span
      :id="tooltipId"
      role="tooltip"
      class="pointer-events-none invisible absolute top-full right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] translate-y-1 rounded-lg border border-line bg-surface p-3 text-left text-xs leading-relaxed font-normal text-fg-muted opacity-0 shadow-lg transition duration-(--duration-base) ease-soft group-focus-within/info:visible group-focus-within/info:translate-y-0 group-focus-within/info:opacity-100 group-hover/info:visible group-hover/info:translate-y-0 group-hover/info:opacity-100"
    >
      {{ text }}
    </span>
  </span>
</template>
