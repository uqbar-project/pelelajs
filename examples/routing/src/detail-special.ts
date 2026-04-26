import { router } from 'pelelajs'

export class DetailSpecial {
  id = ''
  name = ''

  constructor() {
    // Obtenemos los parametros dinamicos de la ruta (e.g., /users/:id)
    const { id } = router.urlParameters()
    this.id = id

    // Obtenemos los query parameters (e.g., ?name=Leon)
    const { name } = router.searchParameters()
    this.name = name || 'Usuario Desconocido'
  }

  goBack() {
    router.navigateTo('/')
  }
}
