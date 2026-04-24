import { getColumnValue, hasLogicalColumn, inferCurrency } from './columns'
import {
  cleanCedula,
  formatAmount,
  formatDate,
  normalizeText,
  parseDateToTimestamp,
  parseDominicanAmount,
  parseInteger,
} from './format'
import { normalizePhoneOrKeepRaw } from './phone'
import type {
  ConsolidatedClient,
  ContactSnapshot,
  Currency,
  InputDataset,
  NormalizedDebt,
  OutputRow,
  ProcessWarning,
  RawCsvRow,
  ProcessingSummary,
} from './types'

const MAX_DEBTS = 10

function normalizeContact(row: RawCsvRow): ContactSnapshot {
  return {
    cif: getColumnValue(row, 'cif', 'tarjetas') || getColumnValue(row, 'cif', 'prestamos'),
    cliente: getColumnValue(row, 'cliente', 'tarjetas') || getColumnValue(row, 'cliente', 'prestamos'),
    telPrincipal: normalizePhoneOrKeepRaw(
      getColumnValue(row, 'telPrincipal', 'tarjetas') ||
        getColumnValue(row, 'telPrincipal', 'prestamos'),
    ),
    celular: normalizePhoneOrKeepRaw(
      getColumnValue(row, 'celular', 'tarjetas') || getColumnValue(row, 'celular', 'prestamos'),
    ),
    telCasa: normalizePhoneOrKeepRaw(
      getColumnValue(row, 'telCasa', 'tarjetas') || getColumnValue(row, 'telCasa', 'prestamos'),
    ),
    telTrabajo: normalizePhoneOrKeepRaw(
      getColumnValue(row, 'telTrabajo', 'tarjetas') ||
        getColumnValue(row, 'telTrabajo', 'prestamos'),
    ),
    fechaAsignacion:
      getColumnValue(row, 'fechaAsignacion', 'tarjetas') ||
      getColumnValue(row, 'fechaAsignacion', 'prestamos'),
  }
}

function normalizeDebt(row: RawCsvRow, dataset: InputDataset): NormalizedDebt {
  const producto =
    dataset === 'tarjetas'
      ? getColumnValue(row, 'productoTarjeta', dataset)
      : getColumnValue(row, 'productoPrestamo', dataset)

  const rawCurrency = getColumnValue(row, 'moneda', dataset)
  const currency = inferCurrency(rawCurrency || producto, dataset) as Currency

  return {
    tipo: dataset === 'tarjetas' ? 'tarjeta' : 'prestamo',
    producto: producto || (dataset === 'tarjetas' ? 'Tarjeta' : 'Préstamo'),
    cuenta: getColumnValue(row, 'cuenta', dataset),
    balance: parseDominicanAmount(getColumnValue(row, 'balance', dataset)),
    minimo: parseDominicanAmount(getColumnValue(row, 'minimo', dataset)),
    atraso: parseInteger(getColumnValue(row, 'atraso', dataset)),
    moneda: currency,
    fechaAsignacion: getColumnValue(row, 'fechaAsignacion', dataset),
  }
}

function mergeContact(current: ContactSnapshot, candidate: ContactSnapshot): ContactSnapshot {
  const currentTs = parseDateToTimestamp(current.fechaAsignacion)
  const candidateTs = parseDateToTimestamp(candidate.fechaAsignacion)

  if (candidateTs >= currentTs) {
    return {
      ...current,
      ...candidate,
    }
  }

  return current
}

function buildFocus(debts: NormalizedDebt[]): string {
  if (debts.length === 0) return 'Sin deudas detectadas'

  const highestDelay = [...debts].sort((a, b) => b.atraso - a.atraso)[0]
  if (highestDelay.atraso > 0) {
    return `Priorizar ${highestDelay.producto} por atraso de ${highestDelay.atraso} dias`
  }

  const highestBalance = [...debts].sort((a, b) => b.balance - a.balance)[0]
  return `Priorizar ${highestBalance.producto} por balance de ${formatAmount(highestBalance.balance)}`
}

function buildSummary(debts: NormalizedDebt[]): string {
  const cardCount = debts.filter((debt) => debt.tipo === 'tarjeta').length
  const loanCount = debts.filter((debt) => debt.tipo === 'prestamo').length
  return `${cardCount} tarjetas, ${loanCount} prestamos, ${debts.length} deudas totales`
}

function sortDebtsForExport(debts: NormalizedDebt[]): NormalizedDebt[] {
  return [...debts].sort((left, right) => {
    if (right.atraso !== left.atraso) return right.atraso - left.atraso
    if (right.balance !== left.balance) return right.balance - left.balance
    return parseDateToTimestamp(right.fechaAsignacion) - parseDateToTimestamp(left.fechaAsignacion)
  })
}

function createBaseOutput(client: ConsolidatedClient, debts: NormalizedDebt[]): OutputRow {
  const montoTcDop = debts
    .filter((debt) => debt.tipo === 'tarjeta' && debt.moneda === 'DOP')
    .reduce((sum, debt) => sum + debt.balance, 0)

  const montoTcUsd = debts
    .filter((debt) => debt.tipo === 'tarjeta' && debt.moneda === 'USD')
    .reduce((sum, debt) => sum + debt.balance, 0)

  const montoPrestamosDop = debts
    .filter((debt) => debt.tipo === 'prestamo')
    .reduce((sum, debt) => sum + debt.balance, 0)

  const montoTotal = debts.reduce((sum, debt) => sum + debt.balance, 0)
  const pagoTotal = debts.reduce((sum, debt) => sum + debt.minimo, 0)
  const maxAtraso = debts.reduce((max, debt) => Math.max(max, debt.atraso), 0)

  return {
    cedula: client.cedula,
    cif: client.contact.cif,
    cliente: client.contact.cliente,
    tiene_tarjeta: client.hasTarjeta ? 'SI' : 'NO',
    tiene_prestamo: client.hasPrestamo ? 'SI' : 'NO',
    fecha_asignacion_reciente: formatDate(client.contact.fechaAsignacion),
    tel_principal: client.contact.telPrincipal,
    celular: client.contact.celular,
    tel_casa: client.contact.telCasa,
    tel_trabajo: client.contact.telTrabajo,
    monto_total_consolidado: formatAmount(montoTotal),
    pago_total_inmediato: formatAmount(pagoTotal),
    max_atraso_global: maxAtraso,
    monto_tc_dop: formatAmount(montoTcDop),
    monto_tc_usd: formatAmount(montoTcUsd),
    monto_prestamos_dop: formatAmount(montoPrestamosDop),
    foco_de_atencion: buildFocus(debts),
    resumen_deudas: buildSummary(debts),
  }
}

function appendDebtSlots(row: OutputRow, debts: NormalizedDebt[]): OutputRow {
  const nextRow = { ...row }

  for (let index = 0; index < MAX_DEBTS; index += 1) {
    const debt = debts[index]
    const slot = index + 1

    nextRow[`deuda_${slot}_tipo`] = debt?.tipo ?? ''
    nextRow[`deuda_${slot}_producto`] = debt?.producto ?? ''
    nextRow[`deuda_${slot}_cuenta`] = debt?.cuenta ?? ''
    nextRow[`deuda_${slot}_balance`] = debt ? formatAmount(debt.balance) : ''
    nextRow[`deuda_${slot}_minimo`] = debt ? formatAmount(debt.minimo) : ''
    nextRow[`deuda_${slot}_atraso`] = debt?.atraso ?? ''
    nextRow[`deuda_${slot}_moneda`] = debt?.moneda ?? ''
  }

  return nextRow
}

function upsertClient(
  clients: Map<string, ConsolidatedClient>,
  row: RawCsvRow,
  dataset: InputDataset,
  warnings: ProcessWarning[],
): void {
  const cedula = cleanCedula(getColumnValue(row, 'cedula', dataset))
  if (!cedula) {
    warnings.push({
      code: 'MISSING_CEDULA',
      message: `Se omitio una fila de ${dataset} por no tener cedula valida.`,
    })
    return
  }

  const debt = normalizeDebt(row, dataset)
  const contact = normalizeContact(row)
  const current = clients.get(cedula)

  if (!current) {
    clients.set(cedula, {
      cedula,
      contact,
      debts: [debt],
      hasTarjeta: dataset === 'tarjetas',
      hasPrestamo: dataset === 'prestamos',
    })
    return
  }

  current.debts.push(debt)
  current.contact = mergeContact(current.contact, contact)
  current.hasTarjeta = current.hasTarjeta || dataset === 'tarjetas'
  current.hasPrestamo = current.hasPrestamo || dataset === 'prestamos'
}

export function consolidateCsvData(
  tarjetaRows: RawCsvRow[],
  prestamoRows: RawCsvRow[],
): ProcessingSummary {
  const clients = new Map<string, ConsolidatedClient>()
  const warnings: ProcessWarning[] = []

  tarjetaRows.forEach((row) => upsertClient(clients, row, 'tarjetas', warnings))
  prestamoRows.forEach((row) => upsertClient(clients, row, 'prestamos', warnings))

  const outputRows = [...clients.values()].map((client) => {
    const orderedDebts = sortDebtsForExport(client.debts)
    if (orderedDebts.length > MAX_DEBTS) {
      warnings.push({
        code: 'EXTRA_DEBTS_TRUNCATED',
        cedula: client.cedula,
        skippedCount: orderedDebts.length - MAX_DEBTS,
        message: `La cedula ${client.cedula} supera el limite de ${MAX_DEBTS} deudas.`,
      })
    }

    const trimmedDebts = orderedDebts.slice(0, MAX_DEBTS)
    return appendDebtSlots(createBaseOutput(client, trimmedDebts), trimmedDebts)
  })

  outputRows.sort((left, right) => left.cedula.localeCompare(right.cedula))

  return {
    outputRows,
    warnings,
    processedRows: tarjetaRows.length + prestamoRows.length,
    groupedClients: clients.size,
  }
}

export function buildOutputFileName(): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return `consolidador-deudas-${stamp}.csv`
}

export function summarizeWarnings(warnings: ProcessWarning[]): string {
  const truncated = warnings.filter((warning) => warning.code === 'EXTRA_DEBTS_TRUNCATED')
  const missingCedula = warnings.filter((warning) => warning.code === 'MISSING_CEDULA')

  const parts = []
  if (truncated.length > 0) {
    parts.push(`${truncated.length} clientes con mas de 10 deudas`) 
  }
  if (missingCedula.length > 0) {
    parts.push(`${missingCedula.length} filas omitidas por cedula invalida`)
  }

  return parts.join(' | ')
}

export function getFileLabel(dataset: InputDataset): string {
  return dataset === 'tarjetas' ? 'Archivo Tarjetas' : 'Archivo Préstamos'
}

export function getAcceptedFileError(file: File): string | null {
  const lowerName = normalizeText(file.name).toLowerCase()
  if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.xlsx')) {
    return 'Solo se permiten archivos CSV o XLSX.'
  }

  return null
}

export function getMissingRequiredColumnsMessage(
  rows: RawCsvRow[],
  dataset: InputDataset,
): string | null {
  const firstRow = rows[0]
  if (!firstRow) {
    return 'El archivo no contiene filas para procesar.'
  }

  const missingColumns = []

  if (!hasLogicalColumn(firstRow, 'cedula', dataset)) {
    missingColumns.push('cedula')
  }

  if (!hasLogicalColumn(firstRow, 'balance', dataset)) {
    missingColumns.push('balance')
  }

  return missingColumns.length > 0
    ? `Faltan columnas obligatorias: ${missingColumns.join(', ')}.`
    : null
}
