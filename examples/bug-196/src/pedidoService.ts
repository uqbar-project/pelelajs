import { Pedido } from './pedido'

class PedidoService {
  pedidos = [
    new Pedido('Grande Muzzarella', 500),
    new Pedido('Fugazza', 250),
    new Pedido('Grande Fugazzetta', 500),
    new Pedido('Grande Napolitana', 600),
    new Pedido('Grande Jamón y Morrones', 800),
  ]

  getAll(): Pedido[] {
    return [...this.pedidos]
  }
}

export const pedidoService: PedidoService = new PedidoService()
