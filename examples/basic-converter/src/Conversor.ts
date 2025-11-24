export class Conversor {
  millas: number = 0;
  kilometros: number | undefined = undefined;

  convertir() {
    this.kilometros = this.millas * 1.609344;
  }

  get hasResult(): boolean {
    return this.kilometros != undefined;
  }

  get claseKilometros(): string {
    return (this.kilometros ?? 0) > 100 ? 'big' : 'small'
  }
}