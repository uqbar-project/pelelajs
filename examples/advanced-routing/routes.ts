import type { RouteDefinition } from 'pelelajs'
import { BookDetail } from './src/BookDetail'
import { BookList } from './src/BookList'
import { MainLayout } from './src/MainLayout'
import { NotFoundPage } from './src/NotFoundPage'

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
