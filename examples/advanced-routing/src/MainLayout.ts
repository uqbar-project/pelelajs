export class MainLayout {
  breadcrumb = ''
  platform = 'PelelaJS v1.0'

  constructor() {
    const pathname = window.location.pathname
    this.breadcrumb = pathname.startsWith('/detail/') ? ' > Detalle del libro' : ''
  }
}
