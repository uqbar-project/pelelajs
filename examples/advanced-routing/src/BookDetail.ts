import { router } from 'pelelajs'
import { books } from './books'

export class BookDetail {
  title = ''
  author = ''
  year = ''
  platform = ''

  constructor() {
    const { id } = router.urlParameters()
    const book = books.find((book) => book.id === id)

    if (book) {
      this.title = book.title
      this.author = book.author
      this.year = String(book.year)
    } else {
      this.title = 'Libro no encontrado'
      this.author = '—'
      this.year = '—'
    }
  }

  goBack() {
    router.navigateTo('/')
  }
}
