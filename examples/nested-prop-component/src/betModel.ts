export class BetModel {
  amount = ''
  errors: string[] = []

  validate() {
    this.errors.length = 0
    if (this.amount) {
      const amountValue = Number(this.amount)
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        this.errors.push('Amount must be greater than zero')
      }
    } else {
      this.errors.push('You must enter a bet amount')
    }
    return this.errors.length === 0
  }
}
