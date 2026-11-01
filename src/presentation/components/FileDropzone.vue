<script setup lang="ts">
import { computed, ref } from 'vue'
import { SUPPORTED_EXTENSIONS } from '@/domain/ingestion'

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ select: [files: File[]] }>()

// Contador evita "piscar" quando o cursor passa sobre elementos filhos
const dragDepth = ref(0)
const isDragging = computed(() => dragDepth.value > 0)
const accept = SUPPORTED_EXTENSIONS.join(',')

function onDrop(event: DragEvent) {
  dragDepth.value = 0
  const files = event.dataTransfer?.files
  if (files?.length) emit('select', [...files])
}

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) emit('select', [...input.files])
  input.value = ''
}
</script>

<template>
  <label
    class="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus-ring)"
    :class="[
      isDragging
        ? 'scale-[1.01] border-accent bg-accent-soft'
        : 'border-line bg-surface hover:border-accent hover:bg-accent-soft/50',
      disabled && 'pointer-events-none opacity-60',
    ]"
    @dragenter.prevent="dragDepth++"
    @dragover.prevent
    @dragleave.prevent="dragDepth--"
    @drop.prevent="onDrop"
  >
    <span
      class="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent transition-transform duration-(--duration-slow) ease-spring group-hover:-translate-y-1"
      :class="isDragging && '-translate-y-1 scale-110'"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-6" aria-hidden="true">
        <path d="M12 16V4m0 0-4 4m4-4 4 4" />
        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    </span>
    <span class="text-base font-medium text-fg">
      {{ isDragging ? 'Solte para importar' : 'Arraste arquivos aqui ou clique para selecionar' }}
    </span>
    <span class="text-sm text-fg-subtle">Formatos: {{ SUPPORTED_EXTENSIONS.join(', ') }}</span>
    <input type="file" class="sr-only" multiple :accept="accept" :disabled="disabled" @change="onChange" />
  </label>
</template>
