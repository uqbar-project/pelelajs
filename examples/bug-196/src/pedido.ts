export class Pedido {
  estado = 'PENDIENTE'

  constructor(
    public descripcion: string,
    public monto: number,
  ) {}

  confirmar(): void {
    this.estado = 'CUMPLIDO'
  }

  get clasePedido(): string {
    return this.estado === 'PENDIENTE' ? 'pending' : 'ok'
  }
}
