interface Item {
  text: string
  visible: boolean
}

interface User {
  id: number
  name: string
  email: string
}

interface BetType {
  description: string
  active?: boolean
}

export class App {
  // 1) Ejemplo Select
  // 3) Ejemplo de filtros dinámicos (if + for-each)
  betTypes: BetType[] = [
    { description: 'Ganador', active: true },
    { description: 'Segundo Puesto', active: true },
    { description: 'Tercero', active: false },
  ]

  selectedBetType: string = this.betTypes[0].description

  testObject: object = {
    // 2) Ejemplo Binding Objetos anidados
    name: 'Nicolas',
    age: 30,
    // 6) Ejemplo Binding en profundidad sobre un objeto compuesto
    address: {
      street: {
        name: 'Calle Falsa',
        number: 123,
      },
    },
  }

  // 4) Ejemplo combinación de directivas for-each + if en visibilidad
  items: Item[] = [
    { text: 'Item 1', visible: true },
    { text: 'Item 2', visible: false },
    { text: 'Item 3', visible: true },
  ]

  // 5) Ejemplo Usuarios
  users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  ]

  newUserName: string = ''
  newUserEmail: string = ''
  userSearch: string = ''
  userSearched: string = ''

  addUser() {
    if (!this.newUserName || !this.newUserEmail) return

    const newId = this.users.length > 0 ? Math.max(...this.users.map((user) => user.id)) + 1 : 1

    this.users.push({
      id: newId,
      name: this.newUserName,
      email: this.newUserEmail,
    })

    this.newUserName = ''
    this.newUserEmail = ''
  }

  // 7) Interacción del usuario con lógica interna
  async searchUser() {
    this.userSearched = 'Buscando...'
    await new Promise((resolve) => setTimeout(resolve, 500))
    const foundUser = this.users.find((user) => user.id.toString() === this.userSearch)
    this.userSearched = foundUser
      ? `Encontrado: ${foundUser.name} (${foundUser.email})`
      : 'Usuario no encontrado'
  }
}
