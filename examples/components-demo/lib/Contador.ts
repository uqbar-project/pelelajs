export class Contador {
  valor!: number
  desde: number = 0
  hasta: number = 100

  get canIncrement() {
    return this.valor < this.hasta
  }

  get canDecrement() {
    return this.valor > this.desde
  }

  increment() {
    if (this.canIncrement) {
      this.valor++
    }
  }

  decrement() {
    if (this.canDecrement) {
      this.valor--
    }
  }
}

