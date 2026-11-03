<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <div class="max-w-xl space-y-3 py-8">
    <h1 class="text-3xl font-bold tracking-tight">{{ message }}</h1>
    <p class="text-body">
      Os dados ficam só na memória do navegador. Depois de recarregar a página, importe os arquivos de novo.
    </p>
    <RouterLink :to="{ name: 'import' }" class="link">Ir para a importação</RouterLink>
  </div>
</template>
