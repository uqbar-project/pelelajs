import { router } from 'pelelajs'

export class Detail {
  id = ''
  name = ''
  avatarUrl = ''
  favoritePokemonName = 'Cargando...'

  constructor() {
    // Obtenemos los parámetros dinámicos de la ruta (e.g., /users/:id)
    const { id } = router.urlParameters()
    this.id = id
    this.avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`

    // Obtenemos los query parameters (e.g., ?name=Leon)
    const { name } = router.searchParameters()
    this.name = name || 'Usuario Desconocido'
  }

  async initialize() {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${this.id}/`)
      if (response.ok) {
        const data = await response.json()
        this.favoritePokemonName = data.name
      } else {
        this.favoritePokemonName = 'No tiene pokemon favorito'
      }
    } catch (error) {
      console.error('Error fetching pokemon:', error)
      this.favoritePokemonName = 'Error al cargar pokemon'
    }
  }

  goBack() {
    router.navigateTo('/')
  }
}
