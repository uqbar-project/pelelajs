import { router } from 'pelelajs'
import { type Book, books } from './books'

export class BookList {
  description = 'Seleccioná un libro para ver su detalle:'
  platform = ''
  books: Book[] = books

  viewDetail({ book }: { book: Book }) {
    router.navigateTo(`/detail/${book.id}`)
  }
}
