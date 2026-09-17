import type { Order } from './order'
import { orderService } from './orderService'

export class Base {
  orders: Order[] = orderService.getAll()

  confirm({ order }: { order: Order }): void {
    order.confirm()
    console.info(order)
  }
}
