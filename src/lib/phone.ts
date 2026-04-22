import {
  PhoneValidationErrorCode,
  PhoneValidationStatus,
} from '../enum/phone-validation-error.enum'

export interface PhoneValidationError {
  code: PhoneValidationErrorCode
  message: string
  rawPhone: string
}

export interface PhoneValidationResult {
  raw: string
  normalized?: string
  status: PhoneValidationStatus
  error?: PhoneValidationError
}

export function validateAndNormalizePhone(phoneNumber: string): PhoneValidationResult {
  const raw = phoneNumber || ''

  if (!raw || raw.trim() === '') {
    return {
      raw,
      status: PhoneValidationStatus.INVALID,
      error: {
        code: PhoneValidationErrorCode.EMPTY,
        message: 'Phone number is empty or null',
        rawPhone: raw,
      },
    }
  }

  const cleanNumber = raw.replace(/[\s\-().]/g, '')

  if (!/^[\d+]+$/.test(cleanNumber)) {
    return {
      raw,
      status: PhoneValidationStatus.INVALID,
      error: {
        code: PhoneValidationErrorCode.INVALID_CHARACTERS,
        message: 'Phone number contains invalid characters (only digits and + allowed)',
        rawPhone: raw,
      },
    }
  }

  const digitsOnly = cleanNumber.replace(/\+/g, '')

  if (digitsOnly.length < 10) {
    return {
      raw,
      status: PhoneValidationStatus.INVALID,
      error: {
        code: PhoneValidationErrorCode.TOO_SHORT,
        message: `Phone number is too short (${digitsOnly.length} digits, expected 10 or 11)`,
        rawPhone: raw,
      },
    }
  }

  if (digitsOnly.length > 11) {
    return {
      raw,
      status: PhoneValidationStatus.INVALID,
      error: {
        code: PhoneValidationErrorCode.TOO_LONG,
        message: `Phone number is too long (${digitsOnly.length} digits, expected 10 or 11)`,
        rawPhone: raw,
      },
    }
  }

  if (/^\+1(809|829|849)\d{7}$/.test(cleanNumber)) {
    return {
      raw,
      normalized: cleanNumber,
      status: PhoneValidationStatus.VALID,
    }
  }

  if (/^1(809|829|849)\d{7}$/.test(cleanNumber)) {
    return {
      raw,
      normalized: `+${cleanNumber}`,
      status: PhoneValidationStatus.FIXED,
    }
  }

  if (/^(809|829|849)\d{7}$/.test(cleanNumber)) {
    return {
      raw,
      normalized: `+1${cleanNumber}`,
      status: PhoneValidationStatus.FIXED,
    }
  }

  if (/^\+(809|829|849)\d{7}$/.test(cleanNumber)) {
    return {
      raw,
      normalized: `+1${cleanNumber.substring(1)}`,
      status: PhoneValidationStatus.FIXED,
    }
  }

  return {
    raw,
    status: PhoneValidationStatus.INVALID,
    error: {
      code: PhoneValidationErrorCode.INVALID_FORMAT,
      message:
        'Phone number must be a valid Dominican Republic number (809, 829, or 849 area codes). Format: (8x9) (xxx) (xxxx)',
      rawPhone: raw,
    },
  }
}

export function normalizePhoneOrKeepRaw(phoneNumber: string): string {
  const result = validateAndNormalizePhone(phoneNumber)
  return result.normalized ?? phoneNumber.trim()
}
