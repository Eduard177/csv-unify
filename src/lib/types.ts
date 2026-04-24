export type ProductType = 'tarjeta' | 'prestamo'

export type Currency = 'DOP' | 'USD' | 'N/A'

export type InputDataset = 'tarjetas' | 'prestamos'

export type RawCsvRow = Record<string, string | undefined>

export interface ParsedCsvFile {
  rows: RawCsvRow[]
  rowCount: number
  fileName: string
  sourceFormat: 'csv' | 'xlsx'
  sheetName?: string
}

export interface ProcessWarning {
  code: 'MISSING_CEDULA' | 'EXTRA_DEBTS_TRUNCATED'
  message: string
  cedula?: string
  skippedCount?: number
}

export interface NormalizedDebt {
  tipo: ProductType
  producto: string
  cuenta: string
  balance: number
  minimo: number
  atraso: number
  moneda: Currency
  fechaAsignacion: string
}

export interface ContactSnapshot {
  cif: string
  cliente: string
  telPrincipal: string
  celular: string
  telCasa: string
  telTrabajo: string
  fechaAsignacion: string
}

export interface ConsolidatedClient {
  cedula: string
  contact: ContactSnapshot
  debts: NormalizedDebt[]
  hasTarjeta: boolean
  hasPrestamo: boolean
}

export interface OutputRow {
  cedula: string
  cif: string
  cliente: string
  tiene_tarjeta: 'SI' | 'NO'
  tiene_prestamo: 'SI' | 'NO'
  fecha_asignacion_reciente: string
  tel_principal: string
  celular: string
  tel_casa: string
  tel_trabajo: string
  monto_total_consolidado: string
  pago_total_inmediato: string
  max_atraso_global: number
  monto_tc_dop: string
  monto_tc_usd: string
  monto_prestamos_dop: string
  foco_de_atencion: string
  resumen_deudas: string
  [key: string]: string | number
}

export interface ProcessingSummary {
  outputRows: OutputRow[]
  warnings: ProcessWarning[]
  processedRows: number
  groupedClients: number
}

export interface FileState {
  file: File | null
  parsed: ParsedCsvFile | null
  error: string | null
}
