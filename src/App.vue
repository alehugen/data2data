<script setup lang="ts">
import { PhFolderOpen, PhHouse } from '@phosphor-icons/vue'
import AppFooter from '@/presentation/components/AppFooter.vue'
import ThemeToggle from '@/presentation/components/ThemeToggle.vue'
import { Button } from '@/presentation/components/ui/button'
import { Separator } from '@/presentation/components/ui/separator'
import { TooltipProvider } from '@/presentation/components/ui/tooltip'
import { useScrolled } from '@/presentation/composables/useScroll'

const scrolled = useScrolled()

const NAV_LINKS = [
  { name: 'home', label: 'Início', icon: PhHouse },
  { name: 'import', label: 'Meus relatórios', icon: PhFolderOpen },
]
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <div class="flex min-h-screen flex-col">
      <header
        class="sticky top-0 z-(--layer-header) h-16 border-b bg-background/90 backdrop-blur-md transition-colors duration-(--duration-base) ease-out"
        :class="scrolled ? 'border-strong' : 'border-border'"
      >
        <nav class="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4">
          <RouterLink to="/" class="group rounded-md text-lg font-bold tracking-tight">
            data<span
              class="inline-block text-marker-ink transition-transform duration-(--duration-slow) ease-spring group-hover:-rotate-12 group-hover:scale-125"
              >2</span
            >data
          </RouterLink>
          <div class="flex items-center gap-1 sm:gap-2">
            <ul class="flex items-center gap-1">
              <li v-for="link in NAV_LINKS" :key="link.name">
                <Button as-child variant="ghost" class="text-muted-foreground">
                  <RouterLink :to="{ name: link.name }" exact-active-class="bg-muted text-foreground">
                    <component :is="link.icon" aria-hidden="true" />
                    <span class="hidden sm:inline">{{ link.label }}</span>
                    <span class="sr-only sm:hidden">{{ link.label }}</span>
                  </RouterLink>
                </Button>
              </li>
            </ul>
            <Separator orientation="vertical" class="mx-1 h-5!" />
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
        <RouterView v-slot="{ Component, route }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>

      <AppFooter />
    </div>
  </TooltipProvider>
</template>
