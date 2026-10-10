import type { Order } from './order'
import { orderService } from './orderService'

export class Base {
  orders: Order[] = orderService.getAll()
  orderHeader: IOrderHeader = new OrderHeader()

  confirm({ order }: { order: Order }): void {
    order.confirm()
    console.info(order)
  }
}

interface IOrderHeader {
  get description(): string
}

class OrderHeader implements IOrderHeader {
  get description() {
    return 'A list of orders'
  }
}
