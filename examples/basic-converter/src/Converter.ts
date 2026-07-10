export class Converter {
  miles: number = 0
  kilometers: number | undefined = undefined
  inputEnabled: boolean = true

  convert() {
    this.kilometers = this.miles * 1.609344
  }

  get hasResult(): boolean {
    return this.kilometers !== undefined
  }

  get kilometersClass(): string {
    return (this.kilometers ?? 0) > 100 ? 'big' : 'small'
  }
}
