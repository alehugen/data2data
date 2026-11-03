<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <div class="animate-fade-up space-y-2">
    <p class="text-fg-muted">{{ message }}</p>
    <p class="text-sm text-fg-subtle">Os dados ficam só na memória do navegador: ao recarregar a página, importe os arquivos novamente.</p>
    <RouterLink :to="{ name: 'import' }" class="link">Ir para a importação</RouterLink>
  </div>
</template>
