import type { Order } from './order'
import { orderService } from './orderService'

export class Base {
  orders: Order[] = orderService.getAll()
  document: IDocument = new Document()

  confirm({ order }: { order: Order }): void {
    order.confirm()
    console.info(order)
  }
}

interface IDocument {
  get description(): string
}

class Document implements IDocument {
  get description() {
    return 'A list of orders'
  }
}
