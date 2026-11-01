import { ref } from 'vue'
import type { Report } from '@/domain/report'
import { container } from '@/infrastructure/container'
import { useReports } from './useReports'

export function useFileImport() {
  const isImporting = ref(false)
  const errors = ref<string[]>([])
  const { refresh } = useReports()

  /** Importa todos os arquivos; uma falha não impede os demais. */
  async function importFiles(files: FileList | File[]): Promise<Report[]> {
    isImporting.value = true
    errors.value = []

    const results = await Promise.allSettled([...files].map((file) => container.importFile.execute(file)))
    errors.value = results.flatMap((result) =>
      result.status === 'rejected'
        ? [result.reason instanceof Error ? result.reason.message : 'Erro desconhecido ao importar arquivo']
        : [],
    )

    await refresh()
    isImporting.value = false
    return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  }

  return { isImporting, errors, importFiles }
}
