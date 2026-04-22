export const PhoneValidationErrorCode = {
  EMPTY: 'EMPTY',
  INVALID_CHARACTERS: 'INVALID_CHARACTERS',
  TOO_SHORT: 'TOO_SHORT',
  TOO_LONG: 'TOO_LONG',
  INVALID_FORMAT: 'INVALID_FORMAT',
} as const

export type PhoneValidationErrorCode =
  (typeof PhoneValidationErrorCode)[keyof typeof PhoneValidationErrorCode]

export const PhoneValidationStatus = {
  VALID: 'VALID',
  FIXED: 'FIXED',
  INVALID: 'INVALID',
} as const

export type PhoneValidationStatus =
  (typeof PhoneValidationStatus)[keyof typeof PhoneValidationStatus]
