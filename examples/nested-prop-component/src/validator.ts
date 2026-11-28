import type { ValidationError } from './validation-error'

export class Validator {
  fieldName = ''
  errors: ValidationError[] = []

  get filteredErrors(): ValidationError[] {
    return this.errors.filter((error) => error.fieldName === this.fieldName)
  }
}
