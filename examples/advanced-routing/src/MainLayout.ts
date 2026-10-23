import { router } from 'pelelajs'

export class MainLayout {
  breadcrumb = ''
  platform = 'PelelaJS v1.0'

  constructor() {
    const pathname = router.currentPath()
    this.breadcrumb = pathname.startsWith('/detail/') ? ' > Detalle del libro' : ''
  }
}
