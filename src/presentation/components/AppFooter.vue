<script setup lang="ts">
import { PhLinkedinLogo } from '@phosphor-icons/vue'

const LINKEDIN_URL = 'https://www.linkedin.com/in/alehugen'
</script>

<template>
  <footer class="mt-16 border-t border-line">
    <div
      class="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-6 text-xs text-fg-subtle sm:flex-row sm:justify-between"
    >
      <p>data<span class="text-accent">2</span>data · seus dados são processados só no navegador</p>
      <p class="flex items-center gap-1">
        Feito por
        <a
          :href="LINKEDIN_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-fg-muted hover:bg-surface-muted hover:text-accent"
        >
          <PhLinkedinLogo :size="16" weight="fill" class="transition-transform duration-(--duration-base) ease-spring group-hover:scale-110" aria-hidden="true" />
          Alessandro Hugen
          <span class="sr-only">(LinkedIn, abre em nova aba)</span>
        </a>
      </p>
    </div>
  </footer>
</template>
