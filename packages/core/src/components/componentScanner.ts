import { ComponentNotFoundError } from '../errors/index'
import { getComponent, hasComponent } from '../registry/componentRegistry'
import type { ComponentConfig } from '../types'

export type ComponentInstance = {
  element: HTMLElement
  componentName: string
  config: ComponentConfig
  props: ComponentPropsData
}

export type ComponentPropsData = {
  unidirectional: Record<string, string>
  bidirectional: Record<string, string>
}

function isPascalCase(str: string): boolean {
  if (!str || str.length === 0) return false
  return /^[A-Z][a-zA-Z0-9]*$/.test(str)
}

function isRegisteredComponent(tagName: string): boolean {
  return isPascalCase(tagName) && hasComponent(tagName)
}

function extractPropsFromElement(element: HTMLElement): ComponentPropsData {
  const unidirectional: Record<string, string> = {}
  const bidirectional: Record<string, string> = {}

  for (const attr of Array.from(element.attributes)) {
    const attrName = attr.name
    const attrValue = attr.value

    if (attrName.startsWith('link-')) {
      const propName = attrName.substring(5)
      bidirectional[propName] = attrValue
    } else if (!attrName.startsWith('data-') && attrName !== 'class' && attrName !== 'style') {
      unidirectional[attrName] = attrValue
    }
  }

  return { unidirectional, bidirectional }
}

export function scanComponents(root: HTMLElement): ComponentInstance[] {
  const components: ComponentInstance[] = []
  const allElements = Array.from(root.querySelectorAll('*'))

  for (const element of allElements) {
    const tagName = element.tagName

    if (isRegisteredComponent(tagName)) {
      const config = getComponent(tagName)

      if (!config) {
        throw new ComponentNotFoundError(tagName, element.outerHTML.substring(0, 150))
      }

      const props = extractPropsFromElement(element as HTMLElement)

      components.push({
        element: element as HTMLElement,
        componentName: tagName,
        config,
        props,
      })
    }
  }

  return components
}

export function hasComponentElements(root: HTMLElement): boolean {
  const allElements = Array.from(root.querySelectorAll('*'))

  for (const element of allElements) {
    if (isRegisteredComponent(element.tagName)) {
      return true
    }
  }

  return false
}

