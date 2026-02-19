export type DomainElement = {
  errorsFrom(field: string): string
  hasErrors(field: string): boolean
}

export class ValidationField {
  domainElement!: DomainElement
  field!: string

  get hasErrors() {
    return this.domainElement.hasErrors(this.field)
  }

  get errorMessage() {
    return this.domainElement.errorsFrom(this.field)
  }
}

