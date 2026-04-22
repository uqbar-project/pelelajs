export class Home {
  indiceSeleccionado = 1;
  totalPersonas = 3;

  personas = [
    { id: 1, name: "Ana García" },
    { id: 2, name: "Carlos López" },
    { id: 3, name: "María Martínez" }
  ];


  get selectedPersonName() {
    const selected = this.personas.find(persona => persona.id === this.indiceSeleccionado);
    return selected ? selected.name : 'Ninguna';
  }
}
