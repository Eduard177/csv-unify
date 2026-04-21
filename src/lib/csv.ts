import Papa from 'papaparse'
import type { OutputRow, ParsedCsvFile, RawCsvRow } from './types'

export async function parseCsvFile(file: File): Promise<ParsedCsvFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0]?.message ?? 'No se pudo leer el CSV'))
          return
        }

        resolve({
          rows: results.data,
          rowCount: results.data.length,
          fileName: file.name,
        })
      },
      error: (error) => reject(error),
    })
  })
}

export function buildCsvContent(rows: OutputRow[]): string {
  return Papa.unparse(rows, {
    columns: Object.keys(rows[0] ?? {}),
  })
}

export function triggerCsvDownload(content: string, fileName: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
