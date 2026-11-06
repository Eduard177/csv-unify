import Papa from 'papaparse'
import { formatDate } from './format'
import type { InputDataset, OutputRow, ParsedCsvFile, RawCsvRow } from './types'

function getFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  return dotIndex >= 0 ? normalized.slice(dotIndex) : ''
}

function normalizeSheetRows(rows: Record<string, unknown>[], date1904: boolean, dataset?: InputDataset): RawCsvRow[] {
  return rows.map((row) => {
    const normalizedRow: RawCsvRow = {}

    Object.entries(row).forEach(([key, value]) => {
      const raw = value == null ? '' : String(value)
      const dateValue = date1904 && typeof value === 'number' && !/^\d{8}$/.test(raw)
        ? String(value + 1462)
        : raw
      normalizedRow[key] = /fecha/i.test(key) ? formatDate(dateValue, dataset === 'prestamos' ? 'month-first' : 'day-first') : raw
    })

    return normalizedRow
  })
}

async function parseXlsxFile(file: File, dataset?: InputDataset): Promise<ParsedCsvFile> {
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
    Boolean(workbook.Workbook?.WBProps?.date1904),
    dataset,
  )

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

export async function parseInputFile(file: File, dataset?: InputDataset): Promise<ParsedCsvFile> {
  const extension = getFileExtension(file.name)

  if (extension === '.xlsx') {
    return parseXlsxFile(file, dataset)
  }

  return parseDelimitedFile(file)
}

function replaceEmptyWithNA(rows: OutputRow[]): OutputRow[] {
  return rows.map((row) => {
    const next: OutputRow = { ...row }
    Object.keys(next).forEach((key) => {
      if (/fecha/i.test(key)) {
        next[key] = formatDate(String(next[key]))
      }
      if (next[key] === '') {
        next[key] = 'N/A'
      }
    })
    return next
  })
}

export function buildCsvContent(rows: OutputRow[]): string {
  return Papa.unparse(replaceEmptyWithNA(rows), {
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
