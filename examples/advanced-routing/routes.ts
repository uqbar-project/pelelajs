import type { RouteDefinition } from 'pelelajs'
import { BookDetail } from './src/book-detail'
import { BookList } from './src/book-list'
import { MainLayout } from './src/main-layout'
import { NotFoundPage } from './src/not-found-page'

export const routes: RouteDefinition[] = [
  {
    path: '',
    layout: MainLayout,
    children: [
      { path: '', component: BookList },
      { path: 'detail/:id', component: BookDetail },
    ],
  },
  { path: '*', component: NotFoundPage },
]
