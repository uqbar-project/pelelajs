import { router } from "pelelajs";

export class Home {
  title = "Página Principal";
  users = [
    { id: 1, name: "Ana García" },
    { id: 2, name: "Carlos López" },
    { id: 3, name: "María Martínez" }
  ];

  /**
   * Navega al detalle del usuario.
   * Nota: En Pelela, los handlers de click dentro de un loop
   * tienen acceso a las variables del loop a través de 'this'.
   */
  viewUserDetails() {
    const user = (this as any).user;
    router.navigateTo(`/users/${user.id}?name=${encodeURIComponent(user.name)}`);
  }
}
