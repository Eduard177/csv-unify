import { describe, expect, it } from 'vitest'
import { PhoneValidationErrorCode, PhoneValidationStatus } from '../enum/phone-validation-error.enum'
import { normalizePhoneOrKeepRaw, validateAndNormalizePhone } from './phone'

describe('validateAndNormalizePhone', () => {
  it('normaliza un numero dominicano local al formato internacional', () => {
    const result = validateAndNormalizePhone('809-555-1234')

    expect(result).toEqual({
      raw: '809-555-1234',
      normalized: '+18095551234',
      status: PhoneValidationStatus.FIXED,
    })
  })

  it('acepta un numero ya normalizado', () => {
    const result = validateAndNormalizePhone('+18295551234')

    expect(result).toEqual({
      raw: '+18295551234',
      normalized: '+18295551234',
      status: PhoneValidationStatus.VALID,
    })
  })

  it('marca vacio como invalido', () => {
    const result = validateAndNormalizePhone('')

    expect(result.status).toBe(PhoneValidationStatus.INVALID)
    expect(result.error?.code).toBe(PhoneValidationErrorCode.EMPTY)
  })

  it('marca formatos no dominicanos como invalidos', () => {
    const result = validateAndNormalizePhone('5551234567')

    expect(result.status).toBe(PhoneValidationStatus.INVALID)
    expect(result.error?.code).toBe(PhoneValidationErrorCode.INVALID_FORMAT)
  })
})

describe('normalizePhoneOrKeepRaw', () => {
  it('devuelve el valor normalizado cuando es valido o corregible', () => {
    expect(normalizePhoneOrKeepRaw('849.555.0000')).toBe('+18495550000')
  })

  it('mantiene el valor original si no puede normalizarlo', () => {
    expect(normalizePhoneOrKeepRaw('ext. 123')).toBe('ext. 123')
  })
})
