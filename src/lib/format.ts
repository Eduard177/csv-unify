export function cleanCedula(value: string | undefined): string {
  return (value ?? '').trim().replace(/\D+/g, '')
}

export function normalizeText(value: string | undefined): string {
  return (value ?? '').trim()
}

export function parseDominicanAmount(value: string | undefined): number {
  const raw = normalizeText(value)
  if (!raw) return 0

  const sanitized = raw.replace(/\s+/g, '').replace(/[^\d,.-]/g, '')
  if (!sanitized) return 0

  const hasComma = sanitized.includes(',')
  const hasDot = sanitized.includes('.')

  if (hasComma && hasDot) {
    return Number.parseFloat(sanitized.replace(/\./g, '').replace(',', '.')) || 0
  }

  if (hasComma) {
    return Number.parseFloat(sanitized.replace(',', '.')) || 0
  }

  return Number.parseFloat(sanitized) || 0
}

export function parseInteger(value: string | undefined): number {
  return Math.round(parseDominicanAmount(value))
}

const INVALID_DATE = Number.NEGATIVE_INFINITY
const DAY_MS = 86_400_000

function validatedDate(year: number, month: number, day: number): number {
  if (year < 100 || year > 9999) return INVALID_DATE
  const timestamp = Date.UTC(year, month - 1, day)
  const date = new Date(timestamp)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? timestamp
    : INVALID_DATE
}

type DateOrder = 'day-first' | 'month-first'

export function parseDateToTimestamp(value: string | undefined, order: DateOrder = 'day-first'): number {
  const raw = normalizeText(value)
  if (!raw) return INVALID_DATE

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (compact) return validatedDate(Number(compact[1]), Number(compact[2]), Number(compact[3]))

  // Excel serials can include a fractional time of day.
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Math.floor(Number(raw))
    if (serial < 1 || serial === 60 || serial > 2958465) return INVALID_DATE
    return Date.UTC(1899, 11, 31) + (serial > 60 ? serial - 1 : serial) * DAY_MS
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/)
  if (iso) return validatedDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const numeric = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/)
  if (numeric) {
    let day = Number(numeric[1])
    let month = Number(numeric[2])
    // Source loan dates always use month/day, including ambiguous dates.
    if (order === 'month-first' || (month > 12 && day <= 12)) [day, month] = [month, day]
    const year = Number(numeric[3]) + (numeric[3].length === 2 ? 2000 : 0)
    return validatedDate(year, month, day)
  }

  const textual = raw.match(/^(\d{1,2})[ -]?([a-z]+)[ -]?(\d{4})$/i)
  if (textual) {
    const months: Record<string, number> = {
      jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, ago: 8, sep: 9, oct: 10, nov: 11, dec: 12, dic: 12,
    }
    const month = months[textual[2].slice(0, 3).toLowerCase()]
    if (month) return validatedDate(Number(textual[3]), month, Number(textual[1]))
  }

  return INVALID_DATE
}

export function formatAmount(value: number): string {
  return value.toFixed(2)
}

export function formatDate(value: string, order: DateOrder = 'day-first'): string {
  const timestamp = parseDateToTimestamp(value, order)
  if (!Number.isFinite(timestamp)) return ''
  const date = new Date(timestamp)
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
}
