export class Home {
  selectedIndex = 1;
  
  get totalPeople() {
    return this.people.length;
  }

  people = [
    { id: 1, name: "Ana García" },
    { id: 2, name: "Carlos López" },
    { id: 3, name: "María Martínez" }
  ];


  get selectedPersonName() {
    const selected = this.people.find(person => person.id === this.selectedIndex);
    return selected ? selected.name : 'Ninguna';
  }
}
