import { describe, expect, it } from 'vitest'
import { consolidateCsvData } from './consolidation'

describe('consolidateCsvData', () => {
  it('unifica deudas por cedula y conserva el contacto mas reciente', () => {
    const tarjetas = [
      {
        CEDULA: '001-1234567-8',
        CIF: 'C001',
        CLIENTE: 'Ana Perez',
        FECHA_ASIGNACION: '01/01/2026',
        TEL_PRINCIPAL: '8091111111',
        CELULAR: '8291111111',
        PRODUCTO: 'Visa Clasica',
        CUENTA: 'TC-1',
        BALANCE: '77.617,30',
        MINIMO: '3.500,00',
        ATRASO: '65',
        MONEDA: 'DOP',
      },
    ]

    const prestamos = [
      {
        cedula: '00112345678',
        cif: 'C001',
        cliente: 'Ana Perez Actualizada',
        fecha_asignacion: '15/02/2026',
        tel_principal: '8092222222',
        celular: '8292222222',
        producto: 'Prestamo Personal',
        cuenta: 'PR-9',
        balance: '150000,00',
        minimo: '12000,00',
        atraso: '12',
        moneda: 'DOP',
      },
    ]

    const result = consolidateCsvData(tarjetas, prestamos)

    expect(result.groupedClients).toBe(1)
    expect(result.outputRows).toHaveLength(1)
    expect(result.outputRows[0]).toMatchObject({
      cedula: '00112345678',
      cliente: 'Ana Perez Actualizada',
      tiene_tarjeta: 'SI',
      tiene_prestamo: 'SI',
      tel_principal: '+18092222222',
      celular: '+18292222222',
      monto_total_consolidado: '227617.30',
      pago_total_inmediato: '15500.00',
      max_atraso_global: 65,
      deuda_1_producto: 'Visa Clasica',
      deuda_2_producto: 'Prestamo Personal',
    })
  })

  it('recorta a 10 deudas y emite advertencia', () => {
    const tarjetas = Array.from({ length: 11 }, (_, index) => ({
      cedula: '40200000001',
      cliente: 'Cliente Exceso',
      fecha_asignacion: '10/01/2026',
      producto: `Tarjeta ${index + 1}`,
      cuenta: `TC-${index + 1}`,
      balance: `${1000 + index},00`,
      minimo: '50,00',
      atraso: `${index}`,
      moneda: 'DOP',
    }))

    const result = consolidateCsvData(tarjetas, [])
    const warning = result.warnings.find((entry) => entry.code === 'EXTRA_DEBTS_TRUNCATED')

    expect(result.outputRows[0].deuda_10_producto).toBeTruthy()
    expect(result.outputRows[0].deuda_10_producto).toBe('Tarjeta 2')
    expect(warning).toMatchObject({
      cedula: '40200000001',
      skippedCount: 1,
    })
  })
})
