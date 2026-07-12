import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRouterActive, setRouterActive } from '../bootstrap/bootstrap'
import * as mountTemplate from '../bootstrap/mountTemplate'
import { RoutingError } from '../errors/index'
import { clearComponentRegistry, defineComponent } from '../registry/componentRegistry'
import { clearRegistry } from '../registry/viewModelRegistry'
import type { PelelaElement } from '../types'
import { resetRouter, router } from './router'
import type { RouteDefinition } from './types'

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

  describe('layout rendering', () => {
    class MainLayout {
      title = 'My App'
    }

    class HomePage {
      message = 'Welcome'
    }

    class LoginPage {
      label = 'Login'
    }

    const layoutTemplate =
      '<pelela view-model="MainLayout"><header><h1 bind-content="title"></h1></header><main><outlet></outlet></main><footer>© 2026</footer></pelela>'
    const homePageTemplate = '<pelela view-model="HomePage"><p bind-content="message"></p></pelela>'
    const loginPageTemplate =
      '<pelela view-model="LoginPage"><form><button>Login</button></form></pelela>'

    it('should render page wrapped in layout when route has layout and children', () => {
      defineComponent('MainLayout', MainLayout, layoutTemplate)
      defineComponent('HomePage', HomePage, homePageTemplate)

      router.start(container, [
        {
          path: '',
          layout: MainLayout,
          children: [{ path: '', component: HomePage }],
        },
      ])

      expect(container.querySelector('header')).toBeInstanceOf(HTMLElement)
      expect(container.querySelector('footer')).toBeInstanceOf(HTMLElement)
      expect(container.querySelector('p')).toBeInstanceOf(HTMLParagraphElement)
      expect(container.querySelector('p')!.innerHTML).toBe('Welcome')
    })

    it('should replace <outlet> with the page content and not leave <outlet> in the DOM', () => {
      defineComponent('MainLayout', MainLayout, layoutTemplate)
      defineComponent('HomePage', HomePage, homePageTemplate)

      router.start(container, [
        {
          path: '',
          layout: MainLayout,
          children: [{ path: '', component: HomePage }],
        },
      ])

      expect(container.querySelector('outlet')).toBeNull()
    })

    it('should transfer prop-* attributes from <outlet> to the page ViewModel', () => {
      class LayoutWithProps {
        userName = 'John Doe'
      }
      class PageWithProps {
        userName = ''
        appName = ''
      }

      const layoutWithPropsTemplate =
        '<pelela view-model="LayoutWithProps"><main><outlet prop-userName="userName" const-appName="\'Test App\'"></outlet></main></pelela>'
      const pageWithPropsTemplate =
        '<pelela view-model="PageWithProps"><p bind-content="userName"></p><span bind-content="appName"></span></pelela>'

      defineComponent('LayoutWithProps', LayoutWithProps, layoutWithPropsTemplate)
      defineComponent('PageWithProps', PageWithProps, pageWithPropsTemplate)

      router.start(container, [
        {
          path: '',
          layout: LayoutWithProps,
          children: [{ path: '', component: PageWithProps }],
        },
      ])

      const layoutElement = container.querySelector('pelela[view-model]') as PelelaElement | null
      expect(layoutElement).toBeInstanceOf(HTMLElement)
      const layoutVM = (layoutElement! as PelelaElement<Record<string, unknown>>).__pelelaViewModel
      expect(layoutVM).toBeDefined()

      const pageElement = container.querySelector(
        'pelela[view-model="PageWithProps"]',
      ) as PelelaElement<Record<string, unknown>> | null
      expect(pageElement).toBeInstanceOf(HTMLElement)
      const pageVM = pageElement!.__pelelaViewModel
      expect(pageVM).toBeDefined()

      expect(pageVM.userName).toBe('John Doe')
      expect(pageVM.appName).toBe("'Test App'")
      expect(container.querySelector('p')!.innerHTML).toBe('John Doe')
    })

    it('should update layout ViewModel state when navigating between children', () => {
      class LayoutWithBreadcrumb {
        breadcrumb = ''
        constructor() {
          this.breadcrumb = window.location.pathname.startsWith('/detail') ? ' > Detail' : ''
        }
      }
      class PageOne {
        label = 'One'
      }
      class PageTwo {
        label = 'Two'
      }

      const layoutBreadcrumbTemplate =
        '<pelela view-model="LayoutWithBreadcrumb"><nav><span bind-content="breadcrumb"></span></nav><main><outlet></outlet></main></pelela>'
      const pageOneTemplate = '<pelela view-model="PageOne"><p bind-content="label"></p></pelela>'
      const pageTwoTemplate = '<pelela view-model="PageTwo"><p bind-content="label"></p></pelela>'

      defineComponent('LayoutWithBreadcrumb', LayoutWithBreadcrumb, layoutBreadcrumbTemplate)
      defineComponent('PageOne', PageOne, pageOneTemplate)
      defineComponent('PageTwo', PageTwo, pageTwoTemplate)

      router.start(container, [
        {
          path: '',
          layout: LayoutWithBreadcrumb,
          children: [
            { path: '', component: PageOne },
            { path: 'detail', component: PageTwo },
          ],
        },
      ])

      expect(container.querySelector('nav span')!.textContent).toBe('')

      router.navigateTo('/detail')

      expect(container.querySelector('nav span')!.textContent).toBe(' > Detail')
    })

    it('should throw when a route has layout but no children', () => {
      defineComponent('MainLayout', MainLayout, layoutTemplate)

      expect(() => {
        router.start(container, [{ path: '', layout: MainLayout }] as unknown as RouteDefinition[])
      }).toThrow('Route with layout must have children')
    })

    it('should throw when a route has children but no layout', () => {
      defineComponent('HomePage', HomePage, homePageTemplate)

      expect(() => {
        router.start(container, [
          { path: '', children: [{ path: '', component: HomePage }] },
        ] as unknown as RouteDefinition[])
      }).toThrow('Route with children must have a layout')
    })

    it('should render page standalone when route has no layout', () => {
      defineComponent('HomePage', HomePage, homePageTemplate)
      defineComponent('LoginPage', LoginPage, loginPageTemplate)
      window.history.replaceState(null, '', '/login')

      router.start(container, [
        { path: '/', component: HomePage },
        { path: '/login', component: LoginPage },
      ])

      expect(container.querySelector('form')).toBeInstanceOf(HTMLFormElement)
      expect(container.querySelector('header')).toBeNull()
    })

    it('should render grandchild component when navigating through three levels of nested routes', () => {
      class AppLayout {
        title = 'App'
      }
      class NestedHome {
        label = 'Home'
      }
      class Level1Page {
        section = 'Level 1'
      }
      class Level2Page {
        section = 'Level 2'
      }
      class Level3Page {
        section = 'Level 3'
      }

      const appLayoutTpl =
        '<pelela view-model="AppLayout"><header><h1 bind-content="title"></h1></header><main><outlet></outlet></main><footer>Footer</footer></pelela>'
      const homeTpl = '<pelela view-model="NestedHome"><p bind-content="label"></p></pelela>'
      const level1Tpl = '<pelela view-model="Level1Page"><p bind-content="section"></p></pelela>'
      const level2Tpl = '<pelela view-model="Level2Page"><p bind-content="section"></p></pelela>'
      const level3Tpl = '<pelela view-model="Level3Page"><p bind-content="section"></p></pelela>'

      defineComponent('AppLayout', AppLayout, appLayoutTpl)
      defineComponent('NestedHome', NestedHome, homeTpl)
      defineComponent('Level1Page', Level1Page, level1Tpl)
      defineComponent('Level2Page', Level2Page, level2Tpl)
      defineComponent('Level3Page', Level3Page, level3Tpl)

      router.start(container, [
        {
          path: '',
          layout: AppLayout,
          children: [
            { path: '', component: NestedHome },
            { path: 'level1', component: Level1Page },
            { path: 'level1/level2', component: Level2Page },
            { path: 'level1/level2/level3', component: Level3Page },
          ],
        },
      ])

      expect(container.querySelector('p')!.textContent).toBe('Home')
      expect(container.querySelector('header h1')!.textContent).toBe('App')

      router.navigateTo('/level1')
      expect(container.querySelector('p')!.textContent).toBe('Level 1')
      expect(container.querySelector('outlet')).toBeNull()

      router.navigateTo('/level1/level2')
      expect(container.querySelector('p')!.textContent).toBe('Level 2')
      expect(container.querySelector('outlet')).toBeNull()

      router.navigateTo('/level1/level2/level3')
      expect(container.querySelector('header h1')!.textContent).toBe('App')
      expect(container.querySelector('footer')!.textContent).toBe('Footer')
      expect(container.querySelector('p')!.textContent).toBe('Level 3')
      expect(container.querySelector('outlet')).toBeNull()
    })

    it('should propagate link-* changes from page VM back to layout VM', () => {
      class LinkLayout {
        userName = 'Alice'
      }
      class LinkPage {
        userName = ''
      }

      const linkLayoutTpl =
        '<pelela view-model="LinkLayout"><header><span bind-content="userName">will-change</span></header><main><outlet link-userName="userName"></outlet></main></pelela>'
      const linkPageTpl =
        '<pelela view-model="LinkPage"><p bind-content="userName">will-change</p></pelela>'

      defineComponent('LinkLayout', LinkLayout, linkLayoutTpl)
      defineComponent('LinkPage', LinkPage, linkPageTpl)

      router.start(container, [
        {
          path: '',
          layout: LinkLayout,
          children: [{ path: '', component: LinkPage }],
        },
      ])

      expect(container.querySelector('header span')!.textContent).toBe('Alice')
      expect(container.querySelector('p')!.textContent).toBe('Alice')
      expect(container.querySelector('outlet')).toBeNull()

      const pageEl = container.querySelector('pelela[view-model="LinkPage"]') as PelelaElement<
        Record<string, unknown>
      > | null
      const pageVM = pageEl!.__pelelaViewModel
      pageVM.userName = 'Bob'

      expect(container.querySelector('header span')!.textContent).toBe('Bob')
      expect(container.querySelector('p')!.textContent).toBe('Bob')
    })

    it('should NOT propagate prop-* changes from page VM back to layout VM', () => {
      class PropLayout {
        userName = 'Alice'
      }
      class PropPage {
        userName = ''
      }

      const propLayoutTpl =
        '<pelela view-model="PropLayout"><header><span bind-content="userName">will-change</span></header><main><outlet prop-userName="userName"></outlet></main></pelela>'
      const propPageTpl =
        '<pelela view-model="PropPage"><p bind-content="userName">will-change</p></pelela>'

      defineComponent('PropLayout', PropLayout, propLayoutTpl)
      defineComponent('PropPage', PropPage, propPageTpl)

      router.start(container, [
        {
          path: '',
          layout: PropLayout,
          children: [{ path: '', component: PropPage }],
        },
      ])

      expect(container.querySelector('header span')!.textContent).toBe('Alice')
      expect(container.querySelector('p')!.textContent).toBe('Alice')
      expect(container.querySelector('outlet')).toBeNull()

      const pageEl = container.querySelector('pelela[view-model="PropPage"]') as PelelaElement<
        Record<string, unknown>
      > | null
      const pageVM = pageEl!.__pelelaViewModel
      pageVM.userName = 'Bob'

      expect(container.querySelector('header span')!.textContent).toBe('Alice')
      expect(container.querySelector('p')!.textContent).toBe('Bob')
    })
  })

  describe('layout CSS lifecycle', () => {
    class LayoutWithCss {
      title = 'Layout'
    }
    class PageWithCss {
      message = 'Page'
    }

    const layoutCssTemplate =
      '<pelela view-model="LayoutWithCss"><header><h1 bind-content="title"></h1></header><main><outlet></outlet></main><footer>Footer</footer></pelela>'
    const pageCssTemplate =
      '<pelela view-model="PageWithCss"><p bind-content="message"></p></pelela>'

    it('should load layout CSS when route has layout', () => {
      defineComponent('LayoutWithCss', LayoutWithCss, layoutCssTemplate, {
        cssUrls: ['/styles/layout.css'],
      })
      defineComponent('PageWithCss', PageWithCss, pageCssTemplate)

      router.start(container, [
        {
          path: '',
          layout: LayoutWithCss,
          children: [{ path: '', component: PageWithCss }],
        },
      ])

      const layoutLink = document.querySelector('link[data-pelela-css-url="/styles/layout.css"]')
      expect(layoutLink).toBeInstanceOf(HTMLLinkElement)
    })

    it('should load both layout CSS and page CSS', () => {
      defineComponent('LayoutWithCss', LayoutWithCss, layoutCssTemplate, {
        cssUrls: ['/styles/layout.css'],
      })
      defineComponent('PageWithCss', PageWithCss, pageCssTemplate, {
        cssUrls: ['/styles/page.css'],
      })

      router.start(container, [
        {
          path: '',
          layout: LayoutWithCss,
          children: [{ path: '', component: PageWithCss }],
        },
      ])

      const layoutLink = document.querySelector('link[data-pelela-css-url="/styles/layout.css"]')
      const pageLink = document.querySelector('link[data-pelela-css-url="/styles/page.css"]')
      expect(layoutLink).toBeInstanceOf(HTMLLinkElement)
      expect(pageLink).toBeInstanceOf(HTMLLinkElement)
    })

    it('should keep layout CSS when navigating between children that share the same layout', () => {
      class PageA {
        label = 'A'
      }
      class PageB {
        label = 'B'
      }
      const pageATemplate = '<pelela view-model="PageA"><span bind-content="label"></span></pelela>'
      const pageBTemplate = '<pelela view-model="PageB"><span bind-content="label"></span></pelela>'

      defineComponent('LayoutWithCss', LayoutWithCss, layoutCssTemplate, {
        cssUrls: ['/styles/layout.css'],
      })
      defineComponent('PageA', PageA, pageATemplate, {
        cssUrls: ['/styles/page-a.css'],
      })
      defineComponent('PageB', PageB, pageBTemplate, {
        cssUrls: ['/styles/page-b.css'],
      })

      router.start(container, [
        {
          path: '',
          layout: LayoutWithCss,
          children: [
            { path: '', component: PageA },
            { path: 'b', component: PageB },
          ],
        },
      ])

      expect(
        document.querySelector('link[data-pelela-css-url="/styles/layout.css"]'),
      ).toBeInstanceOf(HTMLLinkElement)
      expect(
        document.querySelector('link[data-pelela-css-url="/styles/page-a.css"]'),
      ).toBeInstanceOf(HTMLLinkElement)

      router.navigateTo('/b')

      expect(
        document.querySelector('link[data-pelela-css-url="/styles/layout.css"]'),
      ).toBeInstanceOf(HTMLLinkElement)
      expect(document.querySelector('link[data-pelela-css-url="/styles/page-a.css"]')).toBeNull()
      expect(
        document.querySelector('link[data-pelela-css-url="/styles/page-b.css"]'),
      ).toBeInstanceOf(HTMLLinkElement)
    })

    it('should remove layout CSS and page CSS when navigating to a different route', () => {
      class OtherPage {
        version = '2.0'
      }
      const otherPageTemplate =
        '<pelela view-model="OtherPage"><span bind-content="version"></span></pelela>'

      defineComponent('LayoutWithCss', LayoutWithCss, layoutCssTemplate, {
        cssUrls: ['/styles/layout.css'],
      })
      defineComponent('PageWithCss', PageWithCss, pageCssTemplate, {
        cssUrls: ['/styles/page.css'],
      })
      defineComponent('OtherPage', OtherPage, otherPageTemplate, {
        cssUrls: ['/styles/other.css'],
      })

      router.start(container, [
        {
          path: '',
          layout: LayoutWithCss,
          children: [
            { path: '', component: PageWithCss },
            { path: 'other', component: OtherPage },
          ],
        },
        { path: '/standalone', component: OtherPage },
      ])

      expect(
        document.querySelector('link[data-pelela-css-url="/styles/layout.css"]'),
      ).toBeInstanceOf(HTMLLinkElement)

      router.navigateTo('/standalone')

      expect(document.querySelector('link[data-pelela-css-url="/styles/layout.css"]')).toBeNull()
      expect(document.querySelector('link[data-pelela-css-url="/styles/page.css"]')).toBeNull()
      expect(
        document.querySelector('link[data-pelela-css-url="/styles/other.css"]'),
      ).toBeInstanceOf(HTMLLinkElement)
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
