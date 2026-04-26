export class Contador {
  valor: number = 0;
  total: number = 0;

  incrementar() {
    if (this.valor < this.total) {
      this.valor++;
    } else {
      this.valor = 1;
    }
  }

  decrementar() {
    if (this.valor > 1) {
      this.valor--;
    } else {
      this.valor = this.total;
    }
  }
}
