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
        cliente: 'Ana',
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
        cliente: 'Ana',
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
