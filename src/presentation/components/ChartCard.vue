<script setup lang="ts">
import InfoTip from './InfoTip.vue'

defineProps<{ title: string; subtitle?: string; info?: string }>()
</script>

<template>
  <figure class="card p-4">
    <figcaption class="mb-3 flex items-start justify-between gap-2">
      <div>
        <p class="font-medium">{{ title }}</p>
        <p v-if="subtitle" class="text-sm text-fg-subtle">{{ subtitle }}</p>
      </div>
      <InfoTip v-if="info" :text="info" class="-mt-0.5 -mr-1" />
    </figcaption>
    <slot />
  </figure>
</template>
