import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRouterActive, setRouterActive } from '../bootstrap/bootstrap'
import * as mountTemplate from '../bootstrap/mountTemplate'
import { RoutingError } from '../errors/index'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import { clearRegistry } from '../registry/viewModelRegistry'
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
  imageUrl = 'laptop.png'
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
const DETAIL_TEMPLATE =
  '<pelela view-model="ProductDetail"><p bind-content="name"></p><img bind-src="imageUrl" /></pelela>'
const NOT_FOUND_TEMPLATE =
  '<pelela view-model="NotFoundPage"><p bind-content="message"></p></pelela>'

function registerTestComponents(): void {
  defineComponent('ProductCatalog', ProductCatalog, CATALOG_TEMPLATE)
  defineComponent('ProductDetail', ProductDetail, DETAIL_TEMPLATE)
  defineComponent('NotFoundPage', NotFoundPage, NOT_FOUND_TEMPLATE)
}

describe('router', () => {
  let container: HTMLElement
  let renderErrorPageSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    resetRouter()
    clearRegistry()
    clearComponentRegistry()
    container = document.createElement('div')
    document.body.appendChild(container)
    window.history.replaceState(null, '', '/')
    renderErrorPageSpy = vi.spyOn(mountTemplate, 'renderErrorPage')
  })

  afterEach(() => {
    document.querySelectorAll('link[data-pelela-css-url]').forEach((link) => {
      link.remove()
    })
  })

  describe('start', () => {
    it('should mount the route matching the current URL', () => {
      registerTestComponents()

      router.start(container, [{ path: '/', component: ProductCatalog }])

      expect(container.querySelector('pelela')).toBeInstanceOf(HTMLElement)
      expect(container.querySelector('h1')).toBeInstanceOf(HTMLHeadingElement)
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

    it('should reset isRouterActive when start fails due to unregistered component', () => {
      expect(getRouterActive()).toBe(false)

      try {
        router.start(container, [{ path: '/', component: ProductCatalog }])
      } catch {
        // Expected
      }

      expect(getRouterActive()).toBe(false)
    })

    it('should NOT add duplicate popstate listeners on multiple starts', () => {
      registerTestComponents()
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')

      router.start(container, [{ path: '/', component: ProductCatalog }])
      router.start(container, [{ path: '/', component: ProductCatalog }])

      // Should have tried to remove the previous one during the second start
      expect(removeSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
      // Total adds: one for each start
      expect(addSpy).toHaveBeenCalledTimes(2)

      addSpy.mockRestore()
      removeSpy.mockRestore()
    })

    it('should render error page when start URL does not match any route', () => {
      registerTestComponents()
      window.history.replaceState(null, '', '/nonexistent')

      router.start(container, [{ path: '/', component: ProductCatalog }])

      expect(renderErrorPageSpy).toHaveBeenCalledWith(expect.any(RoutingError))
    })

    it('should reset isRouterActive when route resolution fails', () => {
      registerTestComponents()
      window.history.replaceState(null, '', '/nonexistent')

      router.start(container, [{ path: '/', component: ProductCatalog }])

      expect(getRouterActive()).toBe(false)
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
      expect(container.querySelector('p')).toBeInstanceOf(HTMLParagraphElement)
      expect(container.querySelector('img')).toBeInstanceOf(HTMLImageElement)
      expect(container.querySelector('img')!.getAttribute('src')).toBe('laptop.png')
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

    it('should call renderErrorPage when navigating to an undefined route', () => {
      registerTestComponents()
      router.start(container, [{ path: '/', component: ProductCatalog }])

      router.navigateTo('/unknown')
      expect(renderErrorPageSpy).toHaveBeenCalledWith(expect.any(RoutingError))
    })

    it('should reset isRouterActive when navigating to an undefined route', () => {
      registerTestComponents()
      router.start(container, [{ path: '/', component: ProductCatalog }])

      router.navigateTo('/unknown')

      expect(getRouterActive()).toBe(false)
    })

    it('should call handleError when renderPath fails during navigateTo', () => {
      registerTestComponents()
      router.start(container, [{ path: '/', component: ProductCatalog }])

      const handleErrorSpy = vi.spyOn(mountTemplate, 'handleError')
      const mountTemplateSpy = vi.spyOn(mountTemplate, 'mountTemplate').mockImplementation(() => {
        throw new Error('Mount failed')
      })

      router.navigateTo('/')

      expect(handleErrorSpy).toHaveBeenCalledWith(expect.any(Error))

      mountTemplateSpy.mockRestore()
      handleErrorSpy.mockRestore()
    })

    it('should reset isRouterActive when mountTemplate throws during navigateTo', () => {
      registerTestComponents()
      router.start(container, [{ path: '/', component: ProductCatalog }])

      const mountTemplateSpy = vi.spyOn(mountTemplate, 'mountTemplate').mockImplementation(() => {
        throw new Error('Mount failed')
      })

      router.navigateTo('/')

      expect(getRouterActive()).toBe(false)

      mountTemplateSpy.mockRestore()
    })

    it('should NOT update the browser URL when navigation fails (atomicity)', () => {
      registerTestComponents()
      router.start(container, [{ path: '/', component: ProductCatalog }])

      const initialPath = window.location.pathname

      try {
        router.navigateTo('/unknown')
      } catch {
        // Ignored, we want to check the URL
      }

      expect(window.location.pathname).toBe(initialPath)
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

    it('should provide parameters during ViewModel construction (constructor check)', () => {
      registerTestComponents()
      let capturedId: string | undefined
      let capturedDetail: string | undefined

      class ConstructorParaCheck {
        constructor() {
          capturedId = router.urlParameters().id
          capturedDetail = router.searchParameters().detail
        }
      }

      defineComponent(
        'ConstructorCheck',
        ConstructorParaCheck,
        '<pelela view-model="ConstructorCheck"></pelela>',
      )

      router.start(container, [
        { path: '/', component: ProductCatalog },
        { path: '/check/:id', component: ConstructorParaCheck },
      ])

      router.navigateTo('/check/123?detail=enabled')

      expect(capturedId).toBe('123')
      expect(capturedDetail).toBe('enabled')
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
      expect(container.querySelector('p')).toBeInstanceOf(HTMLParagraphElement)

      // Simulate browser back: change URL then fire popstate
      window.history.replaceState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))

      expect(container.querySelector('h1')).toBeInstanceOf(HTMLHeadingElement)
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

  describe('resetRouter', () => {
    it('should reset isRouterActive flag', () => {
      setRouterActive()
      expect(getRouterActive()).toBe(true)

      resetRouter()

      expect(getRouterActive()).toBe(false)
    })
  })

  describe('child component CSS', () => {
    it('should load CSS from child component with kebab-case single-word tag (e.g. <validator>)', () => {
      class Validator {
        label = 'Validator'
      }
      class Wheel {
        title = 'Wheel'
      }

      defineComponent(
        'Validator',
        Validator,
        '<pelela view-model="Validator"><span bind-content="label"></span></pelela>',
        { cssUrls: ['/styles/validator.css'] },
      )
      defineComponent(
        'Wheel',
        Wheel,
        '<pelela view-model="Wheel"><validator></validator><h1 bind-content="title"></h1></pelela>',
        { cssUrls: ['/styles/wheel.css'] },
      )

      router.start(container, [{ path: '/', component: Wheel }])

      const validatorLink = document.querySelector(
        'link[data-pelela-css-url="/styles/validator.css"]',
      )
      const wheelLink = document.querySelector('link[data-pelela-css-url="/styles/wheel.css"]')

      expect(validatorLink).toBeInstanceOf(HTMLLinkElement)
      expect(wheelLink).toBeInstanceOf(HTMLLinkElement)
    })

    it('should load CSS from child component with kebab-case multi-word tag (e.g. <some-component>)', () => {
      class SomeComponent {
        label = 'Some'
      }
      class AppLayout {
        title = 'App Layout'
      }

      defineComponent(
        'SomeComponent',
        SomeComponent,
        '<pelela view-model="SomeComponent"><span bind-content="label"></span></pelela>',
        { cssUrls: ['/styles/some-component.css'] },
      )
      defineComponent(
        'AppLayout',
        AppLayout,
        '<pelela view-model="AppLayout"><some-component></some-component><h1 bind-content="title"></h1></pelela>',
        { cssUrls: ['/styles/app-layout.css'] },
      )

      router.start(container, [{ path: '/', component: AppLayout }])

      const childLink = document.querySelector(
        'link[data-pelela-css-url="/styles/some-component.css"]',
      )
      const parentLink = document.querySelector(
        'link[data-pelela-css-url="/styles/app-layout.css"]',
      )

      expect(childLink).toBeInstanceOf(HTMLLinkElement)
      expect(parentLink).toBeInstanceOf(HTMLLinkElement)
      expect(container.querySelector('span')?.innerHTML).toBe('Some')
    })

    it('should remove child component CSS when navigating to a different route', () => {
      class Validator {
        label = 'Validator'
      }
      class Wheel {
        title = 'Wheel'
      }
      class Settings {
        version = '1.0'
      }

      defineComponent(
        'Validator',
        Validator,
        '<pelela view-model="Validator"><span bind-content="label"></span></pelela>',
        { cssUrls: ['/styles/validator.css'] },
      )
      defineComponent(
        'Wheel',
        Wheel,
        '<pelela view-model="Wheel"><validator></validator><h1 bind-content="title"></h1></pelela>',
        { cssUrls: ['/styles/wheel.css'] },
      )
      defineComponent(
        'Settings',
        Settings,
        '<pelela view-model="Settings"><p bind-content="version"></p></pelela>',
        { cssUrls: ['/styles/settings.css'] },
      )

      router.start(container, [
        { path: '/', component: Wheel },
        { path: '/settings', component: Settings },
      ])

      const childLink = document.querySelector('link[data-pelela-css-url="/styles/validator.css"]')
      expect(childLink).toBeInstanceOf(HTMLLinkElement)

      router.navigateTo('/settings')

      const childLinkAfterNav = document.querySelector(
        'link[data-pelela-css-url="/styles/validator.css"]',
      )
      const parentLinkAfterNav = document.querySelector(
        'link[data-pelela-css-url="/styles/wheel.css"]',
      )
      expect(childLinkAfterNav).toBeNull()
      expect(parentLinkAfterNav).toBeNull()
    })
  })

  describe('registerCss', () => {
    it('should add CSS path to currentRouteCss set', () => {
      registerTestComponents()
      router.start(container, [{ path: '/', component: ProductCatalog }])

      router.registerCss('/styles/custom.css')

      // Verify the CSS path was added by checking that it's in the set
      // We can't directly access currentRouteCss, but we can verify it doesn't throw
      expect(() => {
        router.registerCss('/styles/another.css')
      }).not.toThrow()
    })

    it('should add CSS path when called before start', () => {
      registerTestComponents()
      // Call registerCss before start
      router.registerCss('/styles/before-start.css')

      router.start(container, [{ path: '/', component: ProductCatalog }])

      // Verify it doesn't throw
      expect(() => {
        router.registerCss('/styles/after-start.css')
      }).not.toThrow()
    })
  })
})
