<script setup lang="ts">
import { Button } from '@/presentation/components/ui/button'
</script>

<template>
  <section class="max-w-xl space-y-4 py-16">
    <p class="figure text-7xl font-bold text-muted-foreground" aria-hidden="true">404</p>
    <h1 class="text-4xl font-bold tracking-tight">Página não encontrada</h1>
    <p class="text-body">Este endereço não existe. Volte para o início ou abra os seus relatórios.</p>
    <div class="flex flex-wrap gap-2 pt-2">
      <Button as-child>
        <RouterLink :to="{ name: 'home' }">Ir para o início</RouterLink>
      </Button>
      <Button as-child variant="outline">
        <RouterLink :to="{ name: 'import' }">Meus relatórios</RouterLink>
      </Button>
    </div>
  </section>
</template>
