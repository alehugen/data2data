import { useEventListener, useScrollLock } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

export const MODAL_CLOSE_DURATION = 260

type Focusable = { focus(): void } | null | undefined

interface ModalOptions {
  focusOnOpen: () => Focusable
  focusOnClose?: () => Focusable
  onEscape?: () => void
}

function setAppInert(inert: boolean) {
  const app = document.getElementById('app')
  if (app) app.inert = inert
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export function useModal(options: ModalOptions) {
  const state = ref<'closed' | 'open' | 'closing'>('closed')
  const visible = computed(() => state.value !== 'closed')
  const scrollLocked = useScrollLock(typeof document === 'undefined' ? null : document.body)
  let returnFocus: HTMLElement | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  function release() {
    scrollLocked.value = false
    setAppInert(false)
  }

  async function open() {
    if (state.value === 'open') return
    clearTimeout(timer)
    if (state.value === 'closed') returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    state.value = 'open'
    scrollLocked.value = true
    setAppInert(true)
    await nextTick()
    options.focusOnOpen()?.focus()
  }

  function close() {
    if (state.value !== 'open') return
    state.value = 'closing'
    timer = setTimeout(finishClosing, prefersReducedMotion() ? 0 : MODAL_CLOSE_DURATION)
  }

  async function finishClosing() {
    state.value = 'closed'
    release()
    await nextTick()
    ;(options.focusOnClose?.() ?? returnFocus)?.focus()
    returnFocus = null
  }

  useEventListener('keydown', (event: KeyboardEvent) => {
    const inPopup = event.target instanceof Element && event.target.closest('[role="listbox"], [role="menu"]')
    if (event.key !== 'Escape' || state.value !== 'open' || event.defaultPrevented || inPopup) return
    ;(options.onEscape ?? close)()
  })

  onBeforeUnmount(() => {
    clearTimeout(timer)
    if (visible.value) release()
  })

  return { state, visible, open, close }
}
