export class Counter {
  value: number = 0;
  total: number = 0;

  increment() {
    if (this.value < this.total) {
      this.value++;
    } else {
      this.value = 1;
    }
  }

  decrement() {
    if (this.value > 1) {
      this.value--;
    } else {
      this.value = this.total;
    }
  }
}
