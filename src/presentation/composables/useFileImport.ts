import { ref } from 'vue'
import type { Report } from '@/domain/report'
import { container } from '@/infrastructure/container'
import { useReports } from './useReports'

export function useFileImport() {
  const isImporting = ref(false)
  const errors = ref<string[]>([])
  const { refresh } = useReports()

  async function importFiles(files: readonly File[]): Promise<Report[]> {
    isImporting.value = true
    errors.value = []
    const imported: Report[] = []

    try {
      for (const file of files) {
        try {
          imported.push(...(await container.importFile.execute(file)))
        } catch (error) {
          errors.value.push(error instanceof Error ? error.message : `Erro inesperado ao importar ${file.name}`)
        }
      }
      await refresh()
    } finally {
      isImporting.value = false
    }

    return imported
  }

  return { isImporting, errors, importFiles }
}
