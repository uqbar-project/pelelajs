import { Order } from './order'

class OrderService {
  orders = [
    new Order('Grande Muzzarella', 500),
    new Order('Fugazza', 250),
    new Order('Grande Fugazzetta', 500),
    new Order('Grande Napolitana', 600),
    new Order('Grande Jamón y Morrones', 800),
  ]

  getAll(): Order[] {
    return [...this.orders]
  }
}

export const orderService: OrderService = new OrderService()
