export class App {
  counter: number = 0;

  increment() {
    this.counter++;
  }

  decrement() {
    this.counter--;
  }

  isCounterPositive(): boolean {
    return this.counter > 0;
  }
}