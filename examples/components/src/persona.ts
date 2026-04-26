export class PersonRow {
  person: { id: number, name: string } | null = null;
  selectedIndex: number = -1;

  get isSelected() {
    return this.person?.id === this.selectedIndex;
  }

  get personClasses() {
    return { selected: this.isSelected };
  }
}
