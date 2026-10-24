export class Character {
  constructor(
    public name: string,
    public house: string,
    public age: number,
  ) {}

  get description(): string {
    return `${this.name} (${this.house})`
  }

  birthday() {
    this.age = this.age + 1
  }
}

export class App {
  characters: Character[] = [
    new Character('Harry Potter', 'Gryffindor', 17),
    new Character('Hermione Granger', 'Gryffindor', 17),
    new Character('Draco Malfoy', 'Slytherin', 17),
  ]

  selectedCharacter: Character = this.characters[0]
}
