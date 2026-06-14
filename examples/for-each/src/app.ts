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

class BetClass {
  constructor(
    public description: string,
    public multiplier: number,
  ) {}

  getLabel(): string {
    return `${this.description} x${this.multiplier}`
  }
}

interface SelectableType {
  description: string
  value: number
}

interface Character {
  name: string
  image: string
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

  // 8) Ejemplo Paths anidados en for-each
  nested: { values: number[] } = {
    values: [1, 2, 3, 4],
  }

  get evenValues(): number[] {
    return this.nested.values.filter((value) => value % 2 === 0)
  }

  // 9) Ejemplo Select con objetos
  types: SelectableType[] = [
    { description: 'Type A', value: 1 },
    { description: 'Type B', value: 2 },
    { description: 'Type C', value: 3 },
  ]

  selectedType: SelectableType = this.types[0]

  // 10) Ejemplo bind-src dentro de for-each (Issue #131)
  characters: Character[] = [
    {
      name: 'Mario',
      image: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/emoji_u1f935.svg',
    },
    {
      name: 'Luigi',
      image: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/emoji_u1f935.svg',
    },
    {
      name: 'Peach',
      image: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/emoji_u1f478.svg',
    },
  ]

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

  // 10) Ejemplo Select con class instances
  betClasses: BetClass[] = [
    new BetClass('Ganador', 3),
    new BetClass('Segundo Puesto', 2),
    new BetClass('Tercero', 1.5),
  ]

  selectedBetClass: BetClass = this.betClasses[0]

  get selectedBetLabel(): string {
    return this.selectedBetClass.getLabel()
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
