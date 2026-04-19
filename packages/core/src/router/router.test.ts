import { beforeEach, describe, expect, it } from 'vitest'
import { RoutingError } from '../errors/index'
import { clearRegistry } from '../registry/viewModelRegistry'
import { clearComponentRegistry, defineComponent } from './componentRegistry'
import { resetRouter, router } from './router'

class ProductCatalog {
  products = ['Laptop', 'Mouse', 'Keyboard']
  get count() {
    return this.products.length
  }
}

class ProductDetail {
  name = 'Laptop Pro'
  price = 1299
  isAvailable() {
    return this.price > 0
  }
}

class NotFoundPage {
  message = 'Page not found'
  attemptedPath = ''
}

const CATALOG_TEMPLATE =
  '<pelela view-model="ProductCatalog"><h1 bind-content="count"></h1></pelela>'
const DETAIL_TEMPLATE = '<pelela view-model="ProductDetail"><p bind-content="name"></p></pelela>'
const NOT_FOUND_TEMPLATE =
  '<pelela view-model="NotFoundPage"><p bind-content="message"></p></pelela>'

function registerTestComponents(): void {
  defineComponent('ProductCatalog', ProductCatalog, CATALOG_TEMPLATE)
  defineComponent('ProductDetail', ProductDetail, DETAIL_TEMPLATE)
  defineComponent('NotFoundPage', NotFoundPage, NOT_FOUND_TEMPLATE)
}

describe('router', () => {
  let container: HTMLElement

  beforeEach(() => {
    resetRouter()
    clearRegistry()
    clearComponentRegistry()
    container = document.createElement('div')
    document.body.appendChild(container)
    window.history.replaceState(null, '', '/')
  })

  describe('start', () => {
    it('should mount the route matching the current URL', () => {
      registerTestComponents()

      router.start(container, [{ path: '/', component: ProductCatalog }])

      expect(container.querySelector('pelela')).toBeDefined()
      expect(container.querySelector('h1')).toBeDefined()
    })

    it('should render the initial route content with bindings', () => {
      registerTestComponents()

      router.start(container, [{ path: '/', component: ProductCatalog }])

      const heading = container.querySelector('h1')

      expect(heading!.innerHTML).toBe('3')
    })

    it('should throw RoutingError when a component has no template', () => {
      expect(() => {
        router.start(container, [{ path: '/', component: ProductCatalog }])
      }).toThrow(RoutingError)
    })

    it('should throw RoutingError when no route matches the current URL', () => {
      registerTestComponents()
      window.history.replaceState(null, '', '/nonexistent')

      expect(() => {
        router.start(container, [{ path: '/', component: ProductCatalog }])
      }).toThrow(RoutingError)
    })
  })

  describe('navigateTo', () => {
    it('should replace the container content with the new route', () => {
      registerTestComponents()
      router.start(container, [
        { path: '/', component: ProductCatalog },
        { path: '/product/:id', component: ProductDetail },
      ])

      router.navigateTo('/product/42')

      expect(container.querySelector('h1')).toBeNull()
      expect(container.querySelector('p')).toBeDefined()
    })

    it('should update the browser URL', () => {
      registerTestComponents()
      router.start(container, [
        { path: '/', component: ProductCatalog },
        { path: '/product/:id', component: ProductDetail },
      ])

      router.navigateTo('/product/42')

      expect(window.location.pathname).toBe('/product/42')
    })

    it('should throw RoutingError when navigating to an undefined route', () => {
      registerTestComponents()
      router.start(container, [{ path: '/', component: ProductCatalog }])

      expect(() => {
        router.navigateTo('/unknown')
      }).toThrow(RoutingError)
    })
  })

  describe('urlParameters', () => {
    it('should return empty object when route has no dynamic segments', () => {
      registerTestComponents()
      router.start(container, [{ path: '/', component: ProductCatalog }])

      expect(router.urlParameters()).toEqual({})
    })

    it('should return dynamic segments after navigation', () => {
      registerTestComponents()
      router.start(container, [
        { path: '/', component: ProductCatalog },
        { path: '/product/:id', component: ProductDetail },
      ])

      router.navigateTo('/product/42')

      expect(router.urlParameters()).toEqual({ id: '42' })
    })

    it('should update parameters when navigating to a different route', () => {
      registerTestComponents()
      router.start(container, [
        { path: '/', component: ProductCatalog },
        { path: '/product/:id', component: ProductDetail },
      ])

      router.navigateTo('/product/42')
      router.navigateTo('/product/99')

      expect(router.urlParameters()).toEqual({ id: '99' })
    })
  })

  describe('searchParameters', () => {
    it('should return query parameters from the URL', () => {
      registerTestComponents()
      window.history.replaceState(null, '', '/?name=Juan&surname=Cont')

      router.start(container, [{ path: '/', component: ProductCatalog }])

      expect(router.searchParameters()).toEqual({
        name: 'Juan',
        surname: 'Cont',
      })
    })

    it('should return empty object when no query parameters exist', () => {
      registerTestComponents()
      router.start(container, [{ path: '/', component: ProductCatalog }])

      expect(router.searchParameters()).toEqual({})
    })

    it('should return query parameters after navigateTo', () => {
      registerTestComponents()
      router.start(container, [
        { path: '/', component: ProductCatalog },
        { path: '/product/:id', component: ProductDetail },
      ])

      router.navigateTo('/product/42?detail=true')

      expect(router.searchParameters()).toEqual({ detail: 'true' })
    })
  })

  describe('popstate (browser back)', () => {
    it('should re-render the previous route when popstate fires', () => {
      registerTestComponents()
      router.start(container, [
        { path: '/', component: ProductCatalog },
        { path: '/product/:id', component: ProductDetail },
      ])

      router.navigateTo('/product/42')
      expect(container.querySelector('p')).toBeDefined()

      // Simulate browser back: change URL then fire popstate
      window.history.replaceState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))

      expect(container.querySelector('h1')).toBeDefined()
      expect(container.querySelector('h1')!.innerHTML).toBe('3')
    })

    it('should update urlParameters after popstate', () => {
      registerTestComponents()
      router.start(container, [
        { path: '/', component: ProductCatalog },
        { path: '/product/:id', component: ProductDetail },
      ])

      router.navigateTo('/product/42')
      expect(router.urlParameters()).toEqual({ id: '42' })

      window.history.replaceState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))

      expect(router.urlParameters()).toEqual({})
    })
  })

  describe('catch-all route', () => {
    it('should fallback to the catch-all route for unknown paths', () => {
      registerTestComponents()
      window.history.replaceState(null, '', '/anything/here')

      router.start(container, [
        { path: '/', component: ProductCatalog },
        { path: '*', component: NotFoundPage },
      ])

      expect(container.querySelector('p')!.innerHTML).toBe('Page not found')
    })
  })
})
