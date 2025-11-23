export class Conversor {
  millas: number = 0;

  get kilometers(): number {
    return this.millas * 1.609344;
  }

  get hasResult(): boolean {
    return this.millas > 0;
  }
}