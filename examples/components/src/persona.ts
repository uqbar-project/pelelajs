export class PersonaRow {
  persona: { id: number, name: string } | null = null;
  indiceSeleccionado: number = -1;

  get isSelected() {
    return this.persona?.id === this.indiceSeleccionado;
  }

  get personaClasses() {
    return { selected: this.isSelected };
  }
}
