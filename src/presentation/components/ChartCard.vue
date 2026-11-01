<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <figure class="card p-4">
    <figcaption class="mb-3">
      <p class="font-medium">{{ title }}</p>
      <p v-if="subtitle" class="text-sm text-fg-subtle">{{ subtitle }}</p>
    </figcaption>
    <slot />
  </figure>
</template>
