import { router } from 'pelelajs'

type User = {
  id: number
  name: string
}
export class Home {
  title = 'Página Principal'
  users: User[] = [
    { id: 1, name: 'Ana García' },
    { id: 3, name: 'Carlos López' },
    { id: 5, name: 'María Martínez' },
  ]

  viewUserDetails({ user }: { user: User }) {
    router.navigateTo(`/users/${user.id}?name=${encodeURIComponent(user.name)}`)
  }

  viewSpecialUserDetails() {
    router.navigateTo(`/special-users/99?name=Usuario%20Especial`)
  }
}
