import Papa from 'papaparse'
import type { OutputRow, ParsedCsvFile, RawCsvRow } from './types'

function getFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  return dotIndex >= 0 ? normalized.slice(dotIndex) : ''
}

function normalizeSheetRows(rows: Record<string, unknown>[]): RawCsvRow[] {
  return rows.map((row) => {
    const normalizedRow: RawCsvRow = {}

    Object.entries(row).forEach(([key, value]) => {
      normalizedRow[key] = value == null ? '' : String(value)
    })

    return normalizedRow
  })
}

async function parseXlsxFile(file: File): Promise<ParsedCsvFile> {
  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('El archivo Excel no contiene hojas disponibles.')
  }

  const sheet = workbook.Sheets[firstSheetName]
  const rows = normalizeSheetRows(
    XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    }),
  )

  console.log(rows)

  if (rows.length === 0) {
    throw new Error('El archivo Excel no contiene filas para procesar.')
  }

  return {
    rows,
    rowCount: rows.length,
    fileName: file.name,
    sourceFormat: 'xlsx',
    sheetName: firstSheetName,
  }
}

async function parseDelimitedFile(file: File): Promise<ParsedCsvFile> {
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
          sourceFormat: 'csv',
        })
      },
      error: (error) => reject(error),
    })
  })
}

export async function parseInputFile(file: File): Promise<ParsedCsvFile> {
  const extension = getFileExtension(file.name)

  if (extension === '.xlsx') {
    return parseXlsxFile(file)
  }

  return parseDelimitedFile(file)
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
