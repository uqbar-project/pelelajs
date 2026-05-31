import type { ValidationError } from './validationError'

export class BetModel {
  date: string = ''
  amount = ''
  errors: ValidationError[] = []

  validate() {
    this.errors.length = 0
    if (!this.date) {
      this.errors.push({
        fieldName: 'date',
        errorMessage: 'Date is required',
      })
    }

    if (this.amount) {
      const amountValue = Number(this.amount)
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        this.errors.push({
          fieldName: 'amount',
          errorMessage: 'Amount must be greater than zero',
        })
      }
    } else {
      this.errors.push({
        fieldName: 'amount',
        errorMessage: 'You must enter a bet amount',
      })
    }
    return this.errors.length === 0
  }
}
