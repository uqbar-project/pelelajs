import { router } from 'pelelajs'

export class Detail {
  id = ''
  name = ''
  avatarUrl = ''

  constructor() {
    // Obtenemos los parámetros dinámicos de la ruta (e.g., /users/:id)
    const { id } = router.urlParameters()
    this.id = id
    this.avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`

    // Obtenemos los query parameters (e.g., ?name=Leon)
    const { name } = router.searchParameters()
    this.name = name || 'Usuario Desconocido'
  }

  goBack() {
    router.navigateTo('/')
  }
}
