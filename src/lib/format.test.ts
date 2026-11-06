import { describe, expect, it } from 'vitest'
import { formatDate, parseDateToTimestamp } from './format'

describe('fechas de exportacion', () => {
  it.each([
    ['46329', '03/11/2026'], ['46329.75', '03/11/2026'],
    ['11/18/2026', '18/11/2026'], ['04/11/2026', '04/11/2026'],
    ['2026-11-18', '18/11/2026'], ['2026-11-18T12:30:00Z', '18/11/2026'],
    ['03Mar2026', '03/03/2026'], ['03Dic2026', '03/12/2026'],
    ['29/02/2024', '29/02/2024'], ['1/2/26', '01/02/2026'],
    ['31/02/2026', ''], ['2026-02-30', ''], ['sin fecha', ''], ['', ''], ['N/A', ''],
  ])('convierte %s a %s', (raw, expected) => {
    expect(formatDate(raw)).toBe(expected)
  })

  it('compara fechas sin invertir dia y mes', () => {
    expect(parseDateToTimestamp('04/11/2026')).toBeGreaterThan(parseDateToTimestamp('12/03/2026'))
  })
})

it.each([
  ['20261103', '03/11/2026'],
  ['20260229', ''],
  ['20240229', '29/02/2024'],
])('interpreta fecha compacta de tarjetas %s', (raw, expected) => {
  expect(formatDate(raw)).toBe(expected)
})
