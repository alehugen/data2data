<script setup lang="ts">
defineProps<{ columns: string }>()
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-border bg-card shadow-card">
    <div
      class="-mr-px -mb-px grid *:shadow-[1px_0_0_var(--border),0_1px_0_var(--border)]"
      :class="columns"
    >
      <slot />
    </div>
  </div>
</template>
