<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { useEventListener, useScrollLock } from '@vueuse/core'
import { nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { Button } from '@/presentation/components/ui/button'

defineProps<{ title: string; subtitle?: string }>()
const open = defineModel<boolean>('open', { required: true })

const CLOSE_DURATION = 260
const state = ref<'closed' | 'open' | 'closing'>('closed')
const titleId = useId()
const closeButton = useTemplateRef('closeButton')
const scrollLocked = useScrollLock(typeof document === 'undefined' ? null : document.body)
let returnFocus: HTMLElement | null = null

watch(
  open,
  async (isOpen) => {
    if (isOpen && state.value !== 'open') {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      state.value = 'open'
      scrollLocked.value = true
      setAppInert(true)
      await nextTick()
      closeButton.value?.$el?.focus()
    } else if (!isOpen && state.value === 'open') {
      state.value = 'closing'
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      setTimeout(finishClosing, reduced ? 0 : CLOSE_DURATION)
    }
  },
  { immediate: true },
)

function setAppInert(inert: boolean) {
  const app = document.getElementById('app')
  if (app) app.inert = inert
}

function finishClosing() {
  state.value = 'closed'
  scrollLocked.value = false
  setAppInert(false)
  returnFocus?.focus()
}

useEventListener('keydown', (event: KeyboardEvent) => {
  const inPopup = event.target instanceof Element && event.target.closest('[role="listbox"], [role="menu"]')
  if (event.key === 'Escape' && state.value === 'open' && !event.defaultPrevented && !inPopup) open.value = false
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state !== 'closed'"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="fixed inset-0 z-(--layer-modal) flex items-center justify-center p-3 sm:p-8"
    >
      <div
        class="absolute inset-0 bg-[rgb(8_6_28/0.62)] backdrop-blur-sm"
        :class="state === 'closing' ? 'animate-backdrop-out' : 'animate-backdrop-in'"
        aria-hidden="true"
        @click="open = false"
      />
      <div
        class="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-card shadow-floating"
        :class="state === 'closing' ? 'animate-modal-out' : 'animate-modal-in'"
      >
        <div class="flex items-center justify-between gap-4 border-b px-5 py-3">
          <div class="min-w-0">
            <h2 :id="titleId" class="text-xl font-semibold tracking-tight">{{ title }}</h2>
            <p v-if="subtitle" class="truncate text-sm text-muted-foreground">{{ subtitle }}</p>
          </div>
          <Button ref="closeButton" variant="ghost" size="icon" aria-label="Fechar" title="Fechar (Esc)" @click="open = false">
            <PhX weight="bold" aria-hidden="true" />
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
