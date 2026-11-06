import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildCsvContent, parseInputFile } from './csv'
import type { OutputRow } from './types'

describe('buildCsvContent', () => {
  it('reemplaza campos vacios con N/A al exportar CSV', () => {
    const rows: OutputRow[] = [
      {
        cedula: '001',
        cif: '',
        saludo: 'Señora',
        first_name: 'Ana',
        last_name: 'Perez',
        tiene_tarjeta: 'SI',
        tiene_prestamo: 'NO',
        fecha_asignacion_reciente: '',
        tel_principal: '8095551111',
        celular: '',
        tel_casa: '',
        tel_trabajo: '',
        monto_total_consolidado: '1000.00',
        pago_total_inmediato: '500.00',
        max_atraso_global: 0,
        monto_tc_dop: '1000.00',
        monto_tc_usd: '',
        monto_prestamos_dop: '',
        foco_de_atencion: 'Foco',
        resumen_deudas: '1 tarjeta',
      } as OutputRow,
    ]

    const csv = buildCsvContent(rows)

    expect(csv).toContain(',N/A,')
    expect(csv).not.toContain(',,')
    expect(csv).toContain('Ana')
    expect(csv).toContain('8095551111')
  })

  it('no muta las filas originales', () => {
    const rows: OutputRow[] = [
      {
        cedula: '001',
        cif: '',
        saludo: 'Señora',
        first_name: 'Ana',
        last_name: 'Perez',
        tiene_tarjeta: 'SI',
        tiene_prestamo: 'NO',
        fecha_asignacion_reciente: '',
        tel_principal: '8095551111',
        celular: '',
        tel_casa: '',
        tel_trabajo: '',
        monto_total_consolidado: '1000.00',
        pago_total_inmediato: '500.00',
        max_atraso_global: 0,
        monto_tc_dop: '1000.00',
        monto_tc_usd: '',
        monto_prestamos_dop: '',
        foco_de_atencion: 'Foco',
        resumen_deudas: '1 tarjeta',
      } as OutputRow,
    ]

    buildCsvContent(rows)

    expect(rows[0].cif).toBe('')
    expect(rows[0].celular).toBe('')
  })
})

describe('parseInputFile', () => {
  it('parsea XLSX usando la primera hoja y lo normaliza a filas', async () => {
    const workbook = XLSX.utils.book_new()
    const firstSheet = XLSX.utils.json_to_sheet([
      { cedula: '00112345678', balance: '1550,00', cliente: 'Ana' },
    ])
    const secondSheet = XLSX.utils.json_to_sheet([
      { cedula: '99999999999', balance: '0', cliente: 'Ignorar' },
    ])

    XLSX.utils.book_append_sheet(workbook, firstSheet, 'Principal')
    XLSX.utils.book_append_sheet(workbook, secondSheet, 'Secundaria')

    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    const file = new File([arrayBuffer], 'prestamos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const result = await parseInputFile(file)

    expect(result.sourceFormat).toBe('xlsx')
    expect(result.sheetName).toBe('Principal')
    expect(result.rows).toEqual([
      { cedula: '00112345678', balance: '1550,00', cliente: 'Ana' },
    ])
  })
})

it('formatea todas las columnas fecha al exportar, sin modificar las filas', () => {
  const row = {
    fecha_asignacion_reciente: '46329',
    'deuda_1_fecha_de_factura': '11/18/2026',
    'Otra FECHA': '2026-11-19',
    fecha_invalida: 'pendiente',
    fecha_vacia: '',
    cuenta: '46329',
  } as unknown as OutputRow
  const csv = buildCsvContent([row])
  expect(csv.split('\r\n')[1]).toBe('03/11/2026,18/11/2026,19/11/2026,N/A,N/A,46329')
  expect(row.fecha_asignacion_reciente).toBe('46329')
})

it.each([false, true])('normaliza fechas numericas de XLSX con date1904=%s', async (date1904) => {
  const workbook = XLSX.utils.book_new()
  workbook.Workbook = { WBProps: { date1904 } }
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { cedula: '001', balance: 10, FECHA_ASIGNACION: date1904 ? 44867 : 46329 },
  ]), 'Prestamos')
  const file = new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], 'prestamos.xlsx')
  const result = await parseInputFile(file)
  expect(result.rows[0].FECHA_ASIGNACION).toBe('03/11/2026')
  expect(result.rows[0].balance).toBe('10')
})

it.each([false, true])('exporta fechas por origen sin invertirlas dos veces (date1904=%s)', async (date1904) => {
  async function readRows(dataset: 'tarjetas' | 'prestamos', rows: Record<string, unknown>[]) {
    const workbook = XLSX.utils.book_new()
    workbook.Workbook = { WBProps: { date1904 } }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Datos')
    const file = new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], `${dataset}.xlsx`)
    return (await parseInputFile(file, dataset)).rows
  }
  const cards = await readRows('tarjetas', [
    { cedula: '001', balance: 10, FECHA_ASIGNACION: 20261103 },
    { cedula: '002', balance: 10, FECHA_ASIGNACION: '20261103' },
  ])
  const loans = await readRows('prestamos', [
    { cedula: '001', balance: 20, FECHA_ASIGNACION: '11/04/2026', 'PR FECHA DE FACTURA': '11/05/2026' },
    { cedula: '002', balance: 20, FECHA_ASIGNACION: '10/12/2026', 'PR FECHA DE FACTURA': '11/18/2026' },
  ])
  expect(cards.map(row => row.FECHA_ASIGNACION)).toEqual(['03/11/2026', '03/11/2026'])
  expect(loans.map(row => row.FECHA_ASIGNACION)).toEqual(['04/11/2026', '12/10/2026'])
  const { consolidateCsvData } = await import('./consolidation')
  const output = consolidateCsvData(cards, loans).outputRows
  expect(output.map(row => row.fecha_asignacion_reciente)).toEqual(['04/11/2026', '03/11/2026'])
  const csv = buildCsvContent(output)
  expect(csv).toContain('05/11/2026')
  expect(csv).toContain('18/11/2026')
  expect(csv).not.toContain('11/05/2026')
})
