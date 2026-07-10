import { describe, expect, it } from 'vitest'
import { RoutingError } from '../errors/index'
import { flattenRoutes, joinPaths, matchRoute } from './routeMatcher'
import type { FlattenedRoute, RouteDefinition } from './types'

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

class AboutPage {
  message = 'About us'
}

class MainLayout {
  title = 'Main Layout'
}

class AnotherLayout {
  title = 'Another'
}

const ROUTES: FlattenedRoute[] = [
  { path: '/', component: ProductCatalog },
  { path: '/about', component: AboutPage },
  { path: '/product/:id', component: ProductDetail },
  { path: '/product/:id/city/:cityId', component: CityGuide },
  { path: '*', component: NotFoundPage },
]

describe('joinPaths', () => {
  it('should return root when both parent and child are empty', () => {
    expect(joinPaths('', '')).toBe('/')
  })

  it('should join empty parent with child path', () => {
    expect(joinPaths('', 'detail/:id')).toBe('/detail/:id')
  })

  it('should join non-empty parent with child', () => {
    expect(joinPaths('admin', 'settings')).toBe('/admin/settings')
  })

  it('should handle trailing slash in parent', () => {
    expect(joinPaths('admin/', 'settings')).toBe('/admin/settings')
  })

  it('should handle root parent with child', () => {
    expect(joinPaths('', '')).toBe('/')
  })
})

describe('flattenRoutes', () => {
  it('should flatten a simple list of routes without layout', () => {
    const routes: RouteDefinition[] = [
      { path: '/', component: ProductCatalog },
      { path: '/about', component: AboutPage },
    ]

    const result = flattenRoutes(routes)

    expect(result).toEqual([
      { path: '/', component: ProductCatalog, layout: undefined },
      { path: '/about', component: AboutPage, layout: undefined },
    ])
  })

  it('should flatten routes with layout and children', () => {
    const routes: RouteDefinition[] = [
      {
        path: '',
        layout: MainLayout,
        children: [
          { path: '', component: ProductCatalog },
          { path: 'detail/:id', component: ProductDetail },
        ],
      },
    ]

    const result = flattenRoutes(routes)

    expect(result).toEqual([
      { path: '/', component: ProductCatalog, layout: MainLayout },
      { path: '/detail/:id', component: ProductDetail, layout: MainLayout },
    ])
  })

  it('should inherit parent layout when child has no layout', () => {
    const routes: RouteDefinition[] = [
      {
        path: '',
        layout: MainLayout,
        children: [{ path: '', component: ProductCatalog }],
      },
    ]

    const result = flattenRoutes(routes)

    expect(result).toEqual([{ path: '/', component: ProductCatalog, layout: MainLayout }])
  })

  it('should throw when a route has both component and children', () => {
    const routes: RouteDefinition[] = [
      {
        path: '',
        component: ProductCatalog,
        layout: MainLayout,
        children: [],
      },
    ]

    expect(() => flattenRoutes(routes)).toThrow('cannot have a component')
  })

  it('should throw when nested layouts are detected (layout inside another layout)', () => {
    const routes: RouteDefinition[] = [
      {
        path: '',
        layout: MainLayout,
        children: [
          {
            path: 'sub',
            layout: AnotherLayout,
            children: [{ path: '', component: ProductCatalog }],
          },
        ],
      },
    ]

    expect(() => flattenRoutes(routes)).toThrow('Nested layouts are not supported')
  })

  it('should preserve layout for sibling routes under the same parent', () => {
    const routes: RouteDefinition[] = [
      {
        path: '',
        layout: MainLayout,
        children: [
          { path: '', component: ProductCatalog },
          { path: 'detail/:id', component: ProductDetail },
          { path: 'about', component: AboutPage },
        ],
      },
    ]

    const result = flattenRoutes(routes)

    expect(result).toHaveLength(3)
    result.forEach((flattenedRoute: FlattenedRoute) => {
      expect(flattenedRoute.layout).toBe(MainLayout)
    })
  })

  it('should keep routes without layout when no parent layout exists', () => {
    const routes: RouteDefinition[] = [
      { path: '/', component: ProductCatalog },
      { path: '/login', component: AboutPage },
    ]

    const result = flattenRoutes(routes)

    expect(result).toEqual([
      { path: '/', component: ProductCatalog, layout: undefined },
      { path: '/login', component: AboutPage, layout: undefined },
    ])
  })
})

describe('routeMatcher', () => {
  describe('exact path matching', () => {
    it('should match the root path', () => {
      const result = matchRoute('/', '', ROUTES)

      expect(result.route.component).toBe(ProductCatalog)
      expect(result.urlParameters).toEqual({})
    })

    it('should match a non-root static route with trailing slash', () => {
      const result = matchRoute('/about/', '', ROUTES)

      expect(result.route.component).toBe(AboutPage)
    })

    it('should default empty pathname to root', () => {
      const result = matchRoute('', '', ROUTES)

      expect(result.route.component).toBe(ProductCatalog)
    })

    it('should escape regex metacharacters in static routes', () => {
      const staticWithMeta: FlattenedRoute[] = [
        { path: '/static.html', component: AboutPage },
        { path: '*', component: NotFoundPage },
      ]

      // Should match exactly
      expect(matchRoute('/static.html', '', staticWithMeta).route.component).toBe(AboutPage)

      // Should NOT match /static-html (if . was a wildcard it would match)
      expect(matchRoute('/static-html', '', staticWithMeta).route.component).toBe(NotFoundPage)
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
      const routesWithoutCatchAll: FlattenedRoute[] = [{ path: '/', component: ProductCatalog }]

      expect(() => {
        matchRoute('/unknown', '', routesWithoutCatchAll)
      }).toThrow(RoutingError)
    })

    it('should include the path in the error', () => {
      const routesWithoutCatchAll: FlattenedRoute[] = [{ path: '/', component: ProductCatalog }]

      expect(() => {
        matchRoute('/not-found', '', routesWithoutCatchAll)
      }).toThrow(new RoutingError('/not-found', 'route-not-found'))
    })
  })

  describe('first match wins', () => {
    it('should return the first matching route when multiple could match', () => {
      const overlappingRoutes: FlattenedRoute[] = [
        { path: '/product/:id', component: ProductDetail },
        { path: '*', component: NotFoundPage },
      ]

      const result = matchRoute('/product/42', '', overlappingRoutes)

      expect(result.route.component).toBe(ProductDetail)
    })

    it('should return catch-all only if no other route matches first', () => {
      const overlappingRoutes: FlattenedRoute[] = [
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
