<script setup lang="ts">
import { PhArrowRight, PhTrash } from '@phosphor-icons/vue'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{ title: string; subtitle: string; to: RouteLocationRaw; removable?: boolean }>()
defineEmits<{ remove: [] }>()
</script>

<template>
  <article class="group/card card card-interactive flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 hover:border-accent">
    <div class="min-w-0 flex-1">
      <h3 class="truncate font-medium transition-colors group-hover/card:text-accent">{{ title }}</h3>
      <p class="text-sm text-fg-subtle">{{ subtitle }}</p>
      <div v-if="$slots.default" class="relative z-10 mt-3">
        <slot />
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button
        v-if="removable"
        type="button"
        class="btn btn-sm btn-danger relative z-10"
        :aria-label="`Remover ${title}`"
        :title="`Remover ${title}`"
        @click="$emit('remove')"
      >
        <PhTrash :size="16" aria-hidden="true" />
      </button>
      <RouterLink
        :to="to"
        class="btn btn-sm btn-primary after:absolute after:inset-0 after:rounded-xl after:content-['']"
        :aria-label="`Visualizar ${title}`"
      >
        Visualizar
        <PhArrowRight :size="16" weight="bold" class="transition-transform group-hover/card:translate-x-0.5" aria-hidden="true" />
      </RouterLink>
    </div>
  </article>
</template>
