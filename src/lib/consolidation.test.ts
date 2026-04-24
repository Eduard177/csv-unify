import { describe, expect, it } from 'vitest'
import { consolidateCsvData, getMissingRequiredColumnsMessage } from './consolidation'

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

  it('acepta los encabezados reales de tarjetas y prestamos en docs', () => {
    const tarjetas = [
      {
        TIPO_ORIGEN: 'TARJETAS',
        CUENTA: '*************6213',
        CIF: '0004791074',
        CEDULA: '40232434411',
        CLIENTE: 'SANDER ARIAS',
        'TC BALANCE': '77617,300',
        PRODUCTO: 'MC GNIAL',
        'TC DIAS DE ATRASO': '8',
        'TC MINIMO': '10661,910',
        'NUMERO TEL PRINCIPAL': '8294197838',
        CELULAR: '+18295251949',
        CASA: '+18295251949',
        TRABAJO: '+18295251949',
        FECHA_ASIGNACION: '03Mar2026',
        'TC MONEDA': '214',
      },
    ]

    const prestamos = [
      {
        TIPO_ORIGEN: 'PRESTAMO',
        CUENTA: '******0209',
        CIF: '0000010188',
        CEDULA: '00111477113',
        CLIENTE: 'JUAN ALBERTO ACEVEDO LUNA',
        'PR BALANCE': '146035,24',
        'PR ATRASOS': '7153,53',
        'PR MORA': '356,83',
        'PR DIAS DE ATRASO': '9',
        PRODUCTO: 'CONSUMO NIVELADO SEG INCL',
        'NUMERO TEL PRINCIPAL': '8099196182',
        CELULAR: '8099196182',
        CASA: '8295943299',
        TRABAJO: '0',
        FECHA_ASIGNACION: '03Mar2026',
      },
    ]

    expect(getMissingRequiredColumnsMessage(tarjetas, 'tarjetas')).toBeNull()
    expect(getMissingRequiredColumnsMessage(prestamos, 'prestamos')).toBeNull()

    const result = consolidateCsvData(tarjetas, prestamos)

    expect(result.outputRows).toHaveLength(2)
    expect(result.outputRows[0]).toMatchObject({
      cedula: '00111477113',
      monto_total_consolidado: '146035.24',
      pago_total_inmediato: '7153.53',
      max_atraso_global: 9,
    })
    expect(result.outputRows[1]).toMatchObject({
      cedula: '40232434411',
      monto_total_consolidado: '77617.30',
      pago_total_inmediato: '10661.91',
      monto_tc_dop: '77617.30',
      max_atraso_global: 8,
    })
  })
})
