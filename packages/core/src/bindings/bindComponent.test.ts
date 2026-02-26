import { beforeEach, describe, expect, it } from 'vitest'
import { setupComponentBindings } from './bindComponent'
import { clearComponentRegistry, registerComponent } from '../registry/componentRegistry'
import { resetGlobalComponentTracker } from '../components/nestedComponents'
import type { ComponentConfig } from '../types'

describe('bindComponent - integration', () => {
  beforeEach(() => {
    clearComponentRegistry()
    resetGlobalComponentTracker()
  })

  describe('basic component mounting', () => {
    it('should mount a simple component', () => {
      class Counter {
        count = 0
      }

      const config: ComponentConfig = {
        viewModelName: 'Counter',
        viewModelConstructor: Counter,
        template: '<component view-model="Counter"><div bind-content="count"></div></component>',
      }

      registerComponent('Counter', config)

      const root = document.createElement('div')
      root.innerHTML = '<Counter></Counter>'

      const parentVM = {}

      const bindings = setupComponentBindings(root, parentVM as any)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].componentName).toBe('Counter')
    })

    it('should replace component tag with template content', () => {
      class HelloWorld {
        message = 'Hello World'
      }

      const config: ComponentConfig = {
        viewModelName: 'HelloWorld',
        viewModelConstructor: HelloWorld,
        template: '<component view-model="HelloWorld"><h1>Hello</h1></component>',
      }

      registerComponent('HelloWorld', config)

      const root = document.createElement('div')
      root.innerHTML = '<HelloWorld></HelloWorld>'

      setupComponentBindings(root, {} as any)

      expect(root.querySelector('HelloWorld')).toBeNull()
      expect(root.querySelector('h1')).not.toBeNull()
    })
  })

  describe('props - unidirectional', () => {
    it('should pass unidirectional props as literals', () => {
      class Greeting {
        name!: string
      }

      const config: ComponentConfig = {
        viewModelName: 'Greeting',
        viewModelConstructor: Greeting,
        template:
          '<component view-model="Greeting"><span bind-content="name"></span></component>',
      }

      registerComponent('Greeting', config)

      const root = document.createElement('div')
      root.innerHTML = '<Greeting name="John"></Greeting>'

      setupComponentBindings(root, {} as any)

      const span = root.querySelector('span')
      expect(span?.textContent).toBe('John')
    })

    it('should pass unidirectional props from parent viewmodel', () => {
      class DisplayName {
        userName!: string
      }

      const config: ComponentConfig = {
        viewModelName: 'DisplayName',
        viewModelConstructor: DisplayName,
        template:
          '<component view-model="DisplayName"><span bind-content="userName"></span></component>',
      }

      registerComponent('DisplayName', config)

      const root = document.createElement('div')
      root.innerHTML = '<DisplayName userName="currentUser"></DisplayName>'

      const parentVM = { currentUser: 'Alice' }

      setupComponentBindings(root, parentVM as any)

      const span = root.querySelector('span')
      expect(span?.textContent).toBe('Alice')
    })
  })

  describe('props - bidirectional', () => {
    it('should sync bidirectional props from parent to component', () => {
      class Counter {
        value!: number
      }

      const config: ComponentConfig = {
        viewModelName: 'Counter',
        viewModelConstructor: Counter,
        template:
          '<component view-model="Counter"><span bind-content="value"></span></component>',
      }

      registerComponent('Counter', config)

      const root = document.createElement('div')
      root.innerHTML = '<Counter link-value="count"></Counter>'

      const parentVM = { count: 42 }

      setupComponentBindings(root, parentVM as any)

      const span = root.querySelector('span')
      expect(span?.textContent).toBe('42')
    })

    it('should sync bidirectional props from component to parent', () => {
      class Counter {
        value!: number
      }

      const config: ComponentConfig = {
        viewModelName: 'Counter',
        viewModelConstructor: Counter,
        template:
          '<component view-model="Counter"><input bind-value="value" /></component>',
      }

      registerComponent('Counter', config)

      const root = document.createElement('div')
      root.innerHTML = '<Counter link-value="count"></Counter>'

      const parentVM = { count: 0 }

      const bindings = setupComponentBindings(root, parentVM as any)

      const reactiveInstance = bindings[0].reactiveInstance
      reactiveInstance.value = 100

      expect(parentVM.count).toBe(100)
    })
  })

  describe('nested components', () => {
    it('should mount nested components', () => {
      class Inner {
        text = 'Inner'
      }

      class Outer {
        title = 'Outer'
      }

      const innerConfig: ComponentConfig = {
        viewModelName: 'Inner',
        viewModelConstructor: Inner,
        template: '<component view-model="Inner"><span>Inner</span></component>',
      }

      const outerConfig: ComponentConfig = {
        viewModelName: 'Outer',
        viewModelConstructor: Outer,
        template: '<component view-model="Outer"><div><Inner></Inner></div></component>',
      }

      registerComponent('Inner', innerConfig)
      registerComponent('Outer', outerConfig)

      const root = document.createElement('div')
      root.innerHTML = '<Outer></Outer>'

      const bindings = setupComponentBindings(root, {} as any)

      expect(bindings).toHaveLength(1)
      expect(bindings[0].componentName).toBe('Outer')
      expect(root.querySelector('span')).not.toBeNull()
    })

    it('should pass props through nested components', () => {
      class Label {
        text!: string
      }

      class Card {
        title!: string
      }

      const labelConfig: ComponentConfig = {
        viewModelName: 'Label',
        viewModelConstructor: Label,
        template:
          '<component view-model="Label"><span bind-content="text"></span></component>',
      }

      const cardConfig: ComponentConfig = {
        viewModelName: 'Card',
        viewModelConstructor: Card,
        template:
          '<component view-model="Card"><div><Label text="title"></Label></div></component>',
      }

      registerComponent('Label', labelConfig)
      registerComponent('Card', cardConfig)

      const root = document.createElement('div')
      root.innerHTML = '<Card link-title="pageTitle"></Card>'

      const parentVM = { pageTitle: 'Welcome' }

      setupComponentBindings(root, parentVM as any)

      const span = root.querySelector('span')
      expect(span?.textContent).toBe('Welcome')
    })
  })

  describe('multiple instances', () => {
    it('should mount multiple instances of the same component', () => {
      class Badge {
        label!: string
      }

      const config: ComponentConfig = {
        viewModelName: 'Badge',
        viewModelConstructor: Badge,
        template:
          '<component view-model="Badge"><span bind-content="label"></span></component>',
      }

      registerComponent('Badge', config)

      const root = document.createElement('div')
      root.innerHTML = '<Badge label="New"></Badge><Badge label="Hot"></Badge>'

      const bindings = setupComponentBindings(root, {} as any)

      expect(bindings).toHaveLength(2)

      const spans = root.querySelectorAll('span')
      expect(spans).toHaveLength(2)
      expect(spans[0].textContent).toBe('New')
      expect(spans[1].textContent).toBe('Hot')
    })
  })
})

