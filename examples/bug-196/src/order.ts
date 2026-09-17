export class Order {
  status = 'PENDING'

  constructor(
    public description: string,
    public amount: number,
  ) {}

  confirm(): void {
    this.status = 'DONE'
  }

  get statusClass(): string {
    return this.status === 'PENDING' ? 'pending' : 'ok'
  }
}
