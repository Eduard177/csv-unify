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

export function parseDateToTimestamp(value: string | undefined): number {
  const raw = normalizeText(value)
  if (!raw) return Number.NEGATIVE_INFINITY

  const direct = Date.parse(raw)
  if (!Number.isNaN(direct)) return direct

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (!match) return Number.NEGATIVE_INFINITY

  const [, day, month, year] = match
  const normalizedYear = year.length === 2 ? `20${year}` : year
  const iso = `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
}

export function formatAmount(value: number): string {
  return value.toFixed(2)
}

export function formatDate(value: string): string {
  return normalizeText(value)
}
