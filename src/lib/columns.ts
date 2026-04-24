import type { InputDataset, RawCsvRow } from './types'
import { normalizeText } from './format'

const COLUMN_ALIASES: Record<string, string[]> = {
  cedula: ['cedula', 'cédula', 'documento', 'id_cliente', 'identificacion'],
  cif: ['cif', 'codigo_cliente', 'cod_cliente'],
  cliente: ['cliente', 'nombre', 'nombre_cliente', 'deudor'],
  fechaAsignacion: ['fecha_asignacion', 'fecha asignacion', 'fecha_gestion', 'fecha'],
  telPrincipal: [
    'tel_principal',
    'telefono',
    'telefono_principal',
    'teléfono',
    'numero tel principal',
  ],
  celular: ['celular', 'movil', 'móvil', 'telefono_celular'],
  telCasa: ['tel_casa', 'telefono_casa', 'casa'],
  telTrabajo: ['tel_trabajo', 'telefono_trabajo', 'trabajo'],
  productoTarjeta: ['producto', 'producto_tc', 'tarjeta', 'descripcion_producto'],
  productoPrestamo: ['producto', 'producto_prestamo', 'prestamo', 'descripcion_producto'],
  cuenta: ['cuenta', 'numero_cuenta', 'num_cuenta', 'credito', 'referencia'],
  balance: ['balance', 'saldo', 'monto', 'monto_balance', 'capital', 'tc balance', 'pr balance'],
  minimo: [
    'minimo',
    'pago_minimo',
    'pago inmediato',
    'pago_inmediato',
    'tc minimo',
    'pr atrasos',
    'pr mora',
  ],
  atraso: ['atraso', 'dias_atraso', 'mora', 'atraso_dias', 'tc dias de atraso', 'pr dias de atraso'],
  moneda: ['moneda', 'currency', 'divisa', 'tc moneda', 'pr moneda'],
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
}

function findColumnKey(row: RawCsvRow, aliases: string[]): string | null {
  const normalizedMap = new Map<string, string>()

  Object.keys(row).forEach((key) => {
    normalizedMap.set(normalizeHeader(key), key)
  })

  for (const alias of aliases) {
    const match = normalizedMap.get(normalizeHeader(alias))
    if (match) return match
  }

  return null
}

export function hasLogicalColumn(
  row: RawCsvRow | undefined,
  column: keyof typeof COLUMN_ALIASES,
  dataset: InputDataset,
): boolean {
  if (!row) return false

  const aliases =
    column === 'productoTarjeta' && dataset === 'prestamos'
      ? COLUMN_ALIASES.productoPrestamo
      : column === 'productoPrestamo' && dataset === 'tarjetas'
        ? COLUMN_ALIASES.productoTarjeta
        : COLUMN_ALIASES[column]

  return findColumnKey(row, aliases) !== null
}

export function getColumnValue(
  row: RawCsvRow,
  column: keyof typeof COLUMN_ALIASES,
  dataset: InputDataset,
): string {
  const aliases =
    column === 'productoTarjeta' && dataset === 'prestamos'
      ? COLUMN_ALIASES.productoPrestamo
      : column === 'productoPrestamo' && dataset === 'tarjetas'
        ? COLUMN_ALIASES.productoTarjeta
        : COLUMN_ALIASES[column]

  const key = findColumnKey(row, aliases)
  return normalizeText(key ? row[key] : '')
}

export function inferCurrency(value: string, dataset: InputDataset): 'DOP' | 'USD' | 'N/A' {
  const normalized = normalizeHeader(value)

  if (normalized === '214') return 'DOP'
  if (normalized === '840') return 'USD'
  if (normalized.includes('usd') || normalized.includes('dolar')) return 'USD'
  if (normalized.includes('dop') || normalized.includes('rd') || normalized.includes('peso')) return 'DOP'
  return dataset === 'prestamos' ? 'DOP' : 'N/A'
}
