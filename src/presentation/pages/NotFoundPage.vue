<script setup lang="ts">
import { PhCompass } from '@phosphor-icons/vue'
import { Button } from '@/presentation/components/ui/button'
</script>

<template>
  <section class="mx-auto flex max-w-md animate-fade-up flex-col items-center gap-4 py-16 text-center">
    <span class="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
      <PhCompass :size="28" weight="duotone" aria-hidden="true" />
    </span>
    <h1 class="text-2xl font-semibold">Página não encontrada</h1>
    <p class="text-body">O endereço acessado não existe. Volte para o início ou abra os seus relatórios.</p>
    <div class="flex flex-wrap justify-center gap-2">
      <Button as-child>
        <RouterLink :to="{ name: 'home' }">Ir para o início</RouterLink>
      </Button>
      <Button as-child variant="outline">
        <RouterLink :to="{ name: 'import' }">Meus relatórios</RouterLink>
      </Button>
    </div>
  </section>
</template>
