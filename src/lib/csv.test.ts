import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseInputFile } from './csv'

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
