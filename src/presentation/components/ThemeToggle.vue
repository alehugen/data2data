<script setup lang="ts">
import { PhDesktop, PhMoon, PhSun } from '@phosphor-icons/vue'
import { ToggleGroup, ToggleGroupItem } from '@/presentation/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/tooltip'
import { ThemePreference, useTheme } from '@/presentation/composables/useTheme'

const { preference } = useTheme()

const OPTIONS = [
  { value: ThemePreference.Light, label: 'Tema claro', icon: PhSun },
  { value: ThemePreference.Dark, label: 'Tema escuro', icon: PhMoon },
  { value: ThemePreference.System, label: 'Seguir o sistema', icon: PhDesktop },
]

function select(value: unknown) {
  const option = OPTIONS.find((o) => o.value === value)
  if (option) preference.value = option.value
}
</script>

<template>
  <ToggleGroup
    type="single"
    size="sm"
    :model-value="preference"
    aria-label="Tema"
    class="rounded-lg bg-muted p-0.5"
    @update:model-value="select"
  >
    <Tooltip v-for="option in OPTIONS" :key="option.value">
      <TooltipTrigger as-child>
        <ToggleGroupItem
          :value="option.value"
          :aria-label="option.label"
          class="rounded-md! px-2 text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-primary/15 aria-pressed:text-primary aria-pressed:ring-1 aria-pressed:ring-primary/30"
        >
          <component
            :is="option.icon"
            :weight="preference === option.value ? 'fill' : 'regular'"
            class="transition-transform duration-(--duration-slow) ease-spring"
            :class="preference === option.value ? 'scale-110' : ''"
            aria-hidden="true"
          />
        </ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent side="bottom" :side-offset="6">{{ option.label }}</TooltipContent>
    </Tooltip>
  </ToggleGroup>
</template>
