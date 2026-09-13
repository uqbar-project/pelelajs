export class App {
  counter: number = 0

  increment() {
    this.counter++
  }

  decrement() {
    this.counter--
    return 0
  }

  get counteRPlusOne() {
    return this.counter + 1
  }
}
