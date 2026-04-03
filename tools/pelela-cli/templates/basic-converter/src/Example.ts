export class Conversor {
  millas: number = 0
  kilometros: number | undefined = undefined

  convertir(millas: number): void {
    this.millas = millas
    this.kilometros = millas * 1.60934
  }

  get hasResult(): boolean {
    return this.kilometros !== undefined
  }

  get result(): string {
    return (this.kilometros ?? 0) > 100 ? 'big' : 'small'
  }
}
