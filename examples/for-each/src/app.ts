interface Item {
  text: string;
  visible: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface TipoApuesta {
  descripcion: string;
  active?: boolean;
}

export class App {
  items: Item[] = [
    { text: "Item 1", visible: true },
    { text: "Item 2", visible: false },
    { text: "Item 3", visible: true },
  ];

  users: User[] = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
    { id: 3, name: "Charlie", email: "charlie@example.com" },
  ];

  tiposApuesta: TipoApuesta[] = [
    { descripcion: "Ganador", active: true },
    { descripcion: "Segundo Puesto", active: true },
    { descripcion: "Tercero" },
  ];

  tipoApuesta: string = this.tiposApuesta[0].descripcion;
  newUserName: string = "";
  newUserEmail: string = "";

  objeto = {
    clave1: "valor1",
    clave2: "valor2",
    clave3: "valor3",
  }

  addUser() {
    if (!this.newUserName || !this.newUserEmail) return;

    const newId = this.users.length > 0
      ? Math.max(...this.users.map((user) => user.id)) + 1
      : 1;

    this.users.push({
      id: newId,
      name: this.newUserName,
      email: this.newUserEmail,
    });

    this.newUserName = "";
    this.newUserEmail = "";
  }
}
