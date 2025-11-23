export class Conversor {
  millas: number = 0;

  get kilometers(): number {
    return this.millas * 1.609344;
  }

  get hasResult(): boolean {
    return this.millas > 0;
  }

  get kilometersClass(): string {
    const km = this.kilometers;

    if (km > 100) {
      return "km-high";
    }

    if (km > 0) {
      return "km-low";
    }

    return "";
  }
}