type ValidationError = {
  fieldName: string
  errorMessage: string
}

export class Validator {
  fieldName = ''
  errors: ValidationError[] = []

  get filteredErrors(): ValidationError[] {
    return this.errors.filter((error) => error.fieldName === this.fieldName)
  }
}
