export type Book = {
  id: string
  title: string
  author: string
  year: number
}

export const books: Book[] = [
  { id: '1', title: 'Cien años de soledad', author: 'Gabriel García Márquez', year: 1967 },
  { id: '2', title: 'El Aleph', author: 'Jorge Luis Borges', year: 1949 },
  { id: '3', title: 'Rayuela', author: 'Julio Cortázar', year: 1963 },
  { id: '4', title: 'La invención de Morel', author: 'Adolfo Bioy Casares', year: 1940 },
  { id: '5', title: 'Pedro Páramo', author: 'Juan Rulfo', year: 1955 },
]
