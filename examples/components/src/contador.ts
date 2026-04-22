export class Contador {
  valor: number = 1;
  total: number = 3;

  incrementar() {
    if (this.valor < this.total) {
      this.valor++;
    }
  }

  decrementar() {
    if (this.valor > 1) {
      this.valor--;
    }
  }
}
