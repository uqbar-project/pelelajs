import { BetModel } from './betModel'

export class Bet {
  bet = new BetModel()
  placed = false

  place() {
    if (this.bet.validate()) {
      this.placed = true
      console.log('Bet placed:', this.bet.amount)
    } else {
      this.placed = false
      console.log('Bet errors:', this.bet.errors)
    }
  }
}
