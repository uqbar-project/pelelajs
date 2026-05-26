export class PersonRow {
  person: { id: number; name: string } | null = null
  selectedIndex = -1
  index = -1

  get isSelected() {
    return this.person?.id === this.selectedIndex
  }

  get evenRow() {
    return (this.index + 1) % 2 === 0
  }

  get personClasses() {
    return { selected: this.isSelected, even: this.evenRow }
  }
}
