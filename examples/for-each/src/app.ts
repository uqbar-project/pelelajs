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

type Bet = number | string

class BetClass {
  constructor(public description: string) {}
}

class NumericBet extends BetClass {
  get bets(): Bet[] {
    return [1, 2, 3, 4]
  }
}

class DozenBet extends BetClass {
  get bets(): Bet[] {
    return ['1-12', '13-24', '25-36']
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

class MultiplierOption {
  readonly label!: string
  readonly factor!: number
  constructor(label: string, factor: number) {
    Object.defineProperty(this, 'label', { value: label, enumerable: false })
    Object.defineProperty(this, 'factor', { value: factor, enumerable: false })
  }
  get info(): string {
    return `${this.label} x${this.factor}`
  }
}

export class App {
  // 1) Select example
  // 3) Dynamic filters example (if + for-each)
  betTypes: BetType[] = [
    { description: 'Ganador', active: true },
    { description: 'Segundo Puesto', active: true },
    { description: 'Tercero', active: false },
  ]

  selectedBetType: string = this.betTypes[0].description

  testObject: object = {
    // 2) Binding nested objects
    name: 'Nicolas',
    age: 30,
    // 6) Example of binding nested objects
    address: {
      street: {
        name: 'Calle Falsa',
        number: 123,
      },
    },
  }

  // 4) Example of combining directives for-each + if in visibility
  items: Item[] = [
    { text: 'Item 1', visible: true },
    { text: 'Item 2', visible: false },
    { text: 'Item 3', visible: true },
  ]

  // 5) Example of users
  users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  ]

  newUserName: string = ''
  newUserEmail: string = ''
  userSearch: string = ''
  userSearched: string = ''

  // 8) Nested paths example in for-each
  nested: { values: number[] } = {
    values: [1, 2, 3, 4],
  }

  get evenValues(): number[] {
    return this.nested.values.filter((value) => value % 2 === 0)
  }

  // 9) Select example with objects
  types: SelectableType[] = [
    { description: 'Type A', value: 1 },
    { description: 'Type B', value: 2 },
    { description: 'Type C', value: 3 },
  ]

  selectedType: SelectableType = this.types[0]

  // 10) Example of bind-src within for-each (Issue #131)
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

  // 12) Select with class instances with non-enumerable properties (Issue #135)
  multipliers: MultiplierOption[] = [
    new MultiplierOption('Low', 2),
    new MultiplierOption('Medium', 5),
    new MultiplierOption('High', 10),
  ]

  selectedMultiplier: MultiplierOption = this.multipliers[1]

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

  // 10) Select example with class instances
  betClasses: BetClass[] = [new NumericBet('Pleno'), new DozenBet('Docena')]

  selectedBetClass: BetClass = this.betClasses[0]
  selectedBet: Bet | null = null

  // 7) User interaction with internal logic
  async searchUser() {
    this.userSearched = 'Buscando...'
    await new Promise((resolve) => setTimeout(resolve, 500))
    const foundUser = this.users.find((user) => user.id.toString() === this.userSearch)
    this.userSearched = foundUser
      ? `Encontrado: ${foundUser.name} (${foundUser.email})`
      : 'Usuario no encontrado'
  }
}
