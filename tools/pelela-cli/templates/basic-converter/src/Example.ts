export class Example {
  miles: number = 0
  kilometers: number | undefined = undefined

  convert(): void {
    this.kilometers = this.miles * 1.609344
  }

  get hasKilometers(): boolean {
    return this.kilometers !== undefined
  }

  get kilometersClass(): string {
    return (this.kilometers ?? 0) > 100 ? 'big' : 'small'
  }
}
