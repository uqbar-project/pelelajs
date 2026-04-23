import { router } from "pelelajs"

type User = {
  id: number
  name: string
}
export class Home {
  title = "Página Principal"
  users: User[] = [
    { id: 1, name: "Ana García" },
    { id: 2, name: "Carlos López" },
    { id: 3, name: "María Martínez" }
  ]

  viewUserDetails({ user }: { user: User }) {
    router.navigateTo(`/users/${user.id}?name=${encodeURIComponent(user.name)}`)
  }
}
