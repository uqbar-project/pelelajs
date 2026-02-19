export class App {
  itemSeleccionado: number = 1
  totalProductos: number = 10

  apuesta = {
    monto: 0,
    tipo: ''
  }

  tarjetas = [
    { titulo: 'Implementar Login', descripcion: 'Crear sistema de autenticación de usuarios', estado: 'Completado' },
    { titulo: 'Diseñar Dashboard', descripcion: 'Crear interfaz principal del sistema', estado: 'En Progreso' },
    { titulo: 'API de Productos', descripcion: 'Desarrollar endpoints REST para productos', estado: 'Pendiente' },
    { titulo: 'Tests Unitarios', descripcion: 'Escribir tests para componentes críticos', estado: 'Nuevo' }
  ]

  hasErrors(field: string): boolean {
    if (field === 'monto') {
      return this.apuesta.monto < 100
    }
    return false
  }

  errorsFrom(field: string): string {
    if (field === 'monto' && this.apuesta.monto < 100) {
      return 'El monto mínimo es $100'
    }
    return ''
  }
}

