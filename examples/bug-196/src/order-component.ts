import type { Order } from './order'

export class OrderComponent {
  order!: Order

  confirm(): void {
    this.order.confirm()
  }
}
