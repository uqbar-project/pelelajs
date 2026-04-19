import { describe, expect, it } from 'vitest'
import { RoutingError } from '../errors/index'
import { matchRoute } from './routeMatcher'
import type { RouteDefinition } from './types'

class ProductCatalog {
  products: string[] = ['Laptop', 'Mouse']
  get count() {
    return this.products.length
  }
}

class ProductDetail {
  name = ''
  price = 0
  isAvailable() {
    return this.price > 0
  }
}

class CityGuide {
  city = ''
  attractions: string[] = []
}

class NotFoundPage {
  message = 'Page not found'
}

const ROUTES: RouteDefinition[] = [
  { path: '/', component: ProductCatalog },
  { path: '/product/:id', component: ProductDetail },
  { path: '/product/:id/city/:cityId', component: CityGuide },
  { path: '*', component: NotFoundPage },
]

describe('routeMatcher', () => {
  describe('exact path matching', () => {
    it('should match the root path', () => {
      const result = matchRoute('/', '', ROUTES)

      expect(result.route.component).toBe(ProductCatalog)
      expect(result.urlParameters).toEqual({})
    })

    it('should match root path with trailing slash', () => {
      const result = matchRoute('/', '', ROUTES)

      expect(result.route.component).toBe(ProductCatalog)
    })

    it('should default empty pathname to root', () => {
      const result = matchRoute('', '', ROUTES)

      expect(result.route.component).toBe(ProductCatalog)
    })
  })

  describe('dynamic segments', () => {
    it('should match a route with a single dynamic parameter', () => {
      const result = matchRoute('/product/42', '', ROUTES)

      expect(result.route.component).toBe(ProductDetail)
      expect(result.urlParameters).toEqual({ id: '42' })
    })

    it('should match a route with multiple dynamic parameters', () => {
      const result = matchRoute('/product/1/city/5', '', ROUTES)

      expect(result.route.component).toBe(CityGuide)
      expect(result.urlParameters).toEqual({ id: '1', cityId: '5' })
    })

    it('should match a route with trailing slash', () => {
      const result = matchRoute('/product/42/', '', ROUTES)

      expect(result.route.component).toBe(ProductDetail)
      expect(result.urlParameters).toEqual({ id: '42' })
    })
  })

  describe('catch-all route', () => {
    it('should match the catch-all for unknown paths', () => {
      const result = matchRoute('/inexistent/path', '', ROUTES)

      expect(result.route.component).toBe(NotFoundPage)
    })

    it('should match the catch-all for deeply nested unknown paths', () => {
      const result = matchRoute('/a/b/c/d/e', '', ROUTES)

      expect(result.route.component).toBe(NotFoundPage)
    })
  })

  describe('route not found', () => {
    it('should throw RoutingError when no route matches and no catch-all exists', () => {
      const routesWithoutCatchAll: RouteDefinition[] = [{ path: '/', component: ProductCatalog }]

      expect(() => {
        matchRoute('/unknown', '', routesWithoutCatchAll)
      }).toThrow(RoutingError)
    })

    it('should include the path in the error', () => {
      const routesWithoutCatchAll: RouteDefinition[] = [{ path: '/', component: ProductCatalog }]

      expect(() => {
        matchRoute('/not-found', '', routesWithoutCatchAll)
      }).toThrow('/not-found')
    })
  })

  describe('first match wins', () => {
    it('should return the first matching route when multiple could match', () => {
      const overlappingRoutes: RouteDefinition[] = [
        { path: '/product/:id', component: ProductDetail },
        { path: '*', component: NotFoundPage },
      ]

      const result = matchRoute('/product/42', '', overlappingRoutes)

      expect(result.route.component).toBe(ProductDetail)
    })

    it('should return catch-all only if no other route matches first', () => {
      const overlappingRoutes: RouteDefinition[] = [
        { path: '*', component: NotFoundPage },
        { path: '/product/:id', component: ProductDetail },
      ]

      const result = matchRoute('/product/42', '', overlappingRoutes)

      // catch-all defined first wins
      expect(result.route.component).toBe(NotFoundPage)
    })
  })

  describe('query parameters', () => {
    it('should extract query parameters from the search string', () => {
      const result = matchRoute('/', '?name=Juan&surname=Cont', ROUTES)

      expect(result.searchParameters).toEqual({
        name: 'Juan',
        surname: 'Cont',
      })
    })

    it('should return empty object when no query parameters exist', () => {
      const result = matchRoute('/', '', ROUTES)

      expect(result.searchParameters).toEqual({})
    })

    it('should handle query parameters with the ? prefix', () => {
      const result = matchRoute('/product/42', '?detail=true', ROUTES)

      expect(result.searchParameters).toEqual({ detail: 'true' })
      expect(result.urlParameters).toEqual({ id: '42' })
    })

    it('should decode URL-encoded query parameter values', () => {
      const result = matchRoute('/', '?name=Mar%C3%ADa', ROUTES)

      expect(result.searchParameters).toEqual({ name: 'María' })
    })
  })
})
