export class BetModel {
  amount = ''
  errors: string[] = []

  validate() {
    this.errors.length = 0 // clear errors
    if (!this.amount) {
      this.errors.push('You must enter a bet amount')
    } else if (Number(this.amount) <= 0) {
      this.errors.push('Amount must be greater than zero')
    }
    return this.errors.length === 0
  }
}
