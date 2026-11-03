<script setup lang="ts">
import { PhArrowRight, PhFileText, PhTrash } from '@phosphor-icons/vue'
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { Button } from '@/presentation/components/ui/button'
import { Card, CardFooter } from '@/presentation/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/tooltip'

withDefaults(
  defineProps<{ title: string; subtitle: string; to: RouteLocationRaw; removable?: boolean; icon?: Component }>(),
  { removable: false, icon: () => PhFileText },
)
defineEmits<{ remove: [] }>()
</script>

<template>
  <Card class="group/report card-interactive gap-0 py-0 hover:ring-primary/40">
    <div class="flex items-start gap-3 p-4">
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary transition-transform duration-(--duration-slow) ease-spring group-hover/report:scale-105"
      >
        <component :is="icon" :size="20" weight="duotone" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1">
        <h3 class="truncate font-semibold transition-colors group-hover/report:text-primary">{{ title }}</h3>
        <p class="text-sm text-muted-foreground">{{ subtitle }}</p>
        <div v-if="$slots.default" class="relative z-10 mt-3">
          <slot />
        </div>
      </div>
    </div>

    <CardFooter class="justify-between gap-2 bg-muted/40 px-4 py-2.5">
      <Tooltip v-if="removable">
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon-sm"
            class="relative z-10 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
            :aria-label="`Remover ${title}`"
            @click="$emit('remove')"
          >
            <PhTrash aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Remover</TooltipContent>
      </Tooltip>
      <span v-else />

      <Button
        as-child
        class="gap-2 px-3.5 shadow-(--elevation-primary) transition-[box-shadow,background-color,transform] hover:bg-primary/90 group-hover/report:shadow-raised"
      >
        <RouterLink :to="to" :aria-label="`Visualizar ${title}`" class="after:absolute after:inset-0 after:content-['']">
          Visualizar
          <PhArrowRight
            weight="bold"
            class="transition-transform duration-(--duration-base) ease-soft group-hover/report:translate-x-1"
            aria-hidden="true"
          />
        </RouterLink>
      </Button>
    </CardFooter>
  </Card>
</template>
