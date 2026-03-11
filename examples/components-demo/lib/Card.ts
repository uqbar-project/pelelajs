export class Card {
  titulo!: string
  descripcion!: string
  estado!: string

  get estadoColor() {
    const colores: Record<string, string> = {
      'Completado': 'green',
      'En Progreso': 'yellow',
      'Pendiente': 'red',
      'Nuevo': 'blue'
    }
    return colores[this.estado] || 'blue'
  }
}

