/**
 * composables/useValidation.ts
 *
 * Client-side field validation against shape constraints.
 * Mirrors the server-side logic in server/utils/store.ts so that both
 * layers agree on what is valid (defence-in-depth, Nielsen H5).
 *
 * Design choices:
 *  - validate on blur per field (Nielsen H5: error prevention before submission)
 *  - validate all fields on submit to catch anything missed
 *  - never rely on color alone (errors include a text label + icon)
 *  - preserve user input even when validation fails (Nielsen H3)
 *  - focus the first invalid field on submit (Nielsen H9)
 */
import type { FieldShape, FieldValue, ValidationError } from '~/types/index'

export const useValidation = () => {
  /** Map from field key → ValidationError (null when field is valid). */
  const errors = ref<Record<string, ValidationError>>({})

  /** Clears all errors. */
  const clearErrors = (): void => {
    errors.value = {}
  }

  /**
   * Validates a single field against its shape.
   * Called on blur to give immediate, targeted feedback.
   */
  const validateField = (shape: FieldShape, value: FieldValue): void => {
    const error = checkField(shape, value)
    if (error) {
      errors.value = { ...errors.value, [shape.key]: error }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      const copy = { ...errors.value }
      delete copy[shape.key]
      errors.value = copy
    }
  }

  /**
   * Validates all editable fields and populates the errors map.
   * Returns true when all fields are valid.
   */
  const validateAll = (
    shapes: FieldShape[],
    values: Record<string, FieldValue>
  ): boolean => {
    const newErrors: Record<string, ValidationError> = {}

    for (const shape of shapes) {
      const error = checkField(shape, values[shape.key] ?? null)
      if (error) newErrors[shape.key] = error
    }

    errors.value = newErrors
    return Object.keys(newErrors).length === 0
  }

  /** True when there are no validation errors. */
  const isValid = computed(() => Object.keys(errors.value).length === 0)

  return { errors, isValid, validateField, validateAll, clearErrors }
}

// ── Pure validation logic ─────────────────────────────────────────────────────

function checkField(shape: FieldShape, value: FieldValue): ValidationError | null {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)

  if (shape.required && isEmpty) {
    return {
      field: shape.key,
      fieldLabel: shape.label,
      message: `${shape.label} is required.`,
      severity: 'error',
      suggestion: shape.allowedValues
        ? `Select one of: ${shape.allowedValues.join(', ')}.`
        : `Please fill in this field before saving.`
    }
  }

  if (isEmpty) return null // optional fields – no further checks needed

  if (shape.datatype === 'number') {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value)
    if (isNaN(num)) {
      return {
        field: shape.key,
        fieldLabel: shape.label,
        message: `${shape.label} must be a number.`,
        severity: 'error',
        suggestion: 'Enter a numeric value (e.g. 78 or 3.14).'
      }
    }
    if (shape.min !== undefined && num < shape.min) {
      return {
        field: shape.key,
        fieldLabel: shape.label,
        message: `${shape.label} must be at least ${shape.min}.`,
        severity: 'error',
        suggestion: `Enter a value between ${shape.min} and ${shape.max ?? '∞'}.`
      }
    }
    if (shape.max !== undefined && num > shape.max) {
      return {
        field: shape.key,
        fieldLabel: shape.label,
        message: `${shape.label} must be at most ${shape.max}.`,
        severity: 'error',
        suggestion: `Enter a value between ${shape.min ?? '0'} and ${shape.max}.`
      }
    }
  }

  if (shape.datatype === 'select' && shape.allowedValues && typeof value === 'string') {
    if (!shape.allowedValues.includes(value)) {
      return {
        field: shape.key,
        fieldLabel: shape.label,
        message: `'${value}' is not a valid option for ${shape.label}.`,
        severity: 'error',
        suggestion: `Choose from: ${shape.allowedValues.join(', ')}.`
      }
    }
  }

  if (shape.datatype === 'multiselect' && Array.isArray(value) && shape.allowedValues) {
    const invalid = value.filter((v) => !shape.allowedValues!.includes(v))
    if (invalid.length > 0) {
      return {
        field: shape.key,
        fieldLabel: shape.label,
        message: `${shape.label} contains unrecognised values: ${invalid.join(', ')}.`,
        severity: 'error',
        suggestion: `Allowed values: ${shape.allowedValues.join(', ')}.`
      }
    }
  }

  if (shape.datatype === 'date' && typeof value === 'string' && value.trim() !== '') {
    const d = new Date(value)
    if (isNaN(d.getTime())) {
      return {
        field: shape.key,
        fieldLabel: shape.label,
        message: `${shape.label} must be a valid date.`,
        severity: 'error',
        suggestion: 'Use the date picker or enter a date in YYYY-MM-DD format.'
      }
    }
  }

  return null
}
