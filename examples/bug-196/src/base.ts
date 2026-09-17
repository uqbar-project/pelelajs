import type { Pedido } from './pedido'
import { pedidoService } from './pedidoService'

export class Base {
  pedidos: Pedido[] = pedidoService.getAll()

  confirmarse({ pedido }: { pedido: Pedido }): void {
    pedido.confirmar()
    console.info(pedido)
  }
}
