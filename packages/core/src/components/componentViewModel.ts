import type { ComponentProps, ViewModel } from '../types'

export function createComponentViewModel<T extends object>(
  componentInstance: T,
  parentViewModel: ViewModel,
  props: ComponentProps,
): ViewModel<T> {
  const resolvedUnidirectionalProps: Record<string, any> = {}
  for (const [propName, propExpression] of Object.entries(props.unidirectional)) {
    resolvedUnidirectionalProps[propName.toLowerCase()] = resolvePropertyValue(propExpression, parentViewModel)
  }

  const bidirectionalPropsMap: Record<string, string> = {}
  for (const [propName, propExpression] of Object.entries(props.bidirectional)) {
    bidirectionalPropsMap[propName.toLowerCase()] = propExpression
  }

  const proxy = new Proxy(componentInstance as Record<string, unknown>, {
    has(_target, prop) {
      if (typeof prop === 'string') {
        const lower = prop.toLowerCase()
        if (lower in resolvedUnidirectionalProps) return true
        if (lower in bidirectionalPropsMap) return true
        if (prop in componentInstance) return true
        if (prop in parentViewModel) return true
      }
      return false
    },

    get(_target, prop) {
      if (typeof prop === 'string') {
        const lower = prop.toLowerCase()

        if (lower in resolvedUnidirectionalProps) {
          return resolvedUnidirectionalProps[lower]
        }

        if (lower in bidirectionalPropsMap) {
          const parentProp = bidirectionalPropsMap[lower]
          return getNestedProperty(parentViewModel, parentProp)
        }

        if (prop in componentInstance) {
          const descriptor = getPropertyDescriptor(componentInstance, prop)
          if (descriptor?.get) {
            return descriptor.get.call(proxy)
          }
          const value = (componentInstance as any)[prop]
          if (typeof value === 'function') {
            return value.bind(proxy)
          }
          return value
        }

        if (prop in parentViewModel) {
          return parentViewModel[prop as string]
        }
      }

      return undefined
    },

    set(_target, prop, value) {
      if (typeof prop === 'string') {
        const lower = prop.toLowerCase()

        if (lower in bidirectionalPropsMap) {
          const parentProp = bidirectionalPropsMap[lower]
          setNestedProperty(parentViewModel, parentProp, value)
          return true
        }

        if (prop in componentInstance || !(prop in parentViewModel)) {
          ;(componentInstance as any)[prop] = value
          return true
        }

        parentViewModel[prop as string] = value
        return true
      }

      return false
    },
  })

  return proxy as ViewModel<T>
}

function resolvePropertyValue(expression: string, parentViewModel: ViewModel): any {
  if (expression.startsWith('"') && expression.endsWith('"')) {
    return expression.slice(1, -1)
  }

  if (expression.startsWith("'") && expression.endsWith("'")) {
    return expression.slice(1, -1)
  }

  if (!isNaN(Number(expression))) {
    return Number(expression)
  }

  if (expression === 'true') return true
  if (expression === 'false') return false
  if (expression === 'null') return null
  if (expression === 'undefined') return undefined
  if (expression === 'this') return parentViewModel

  const nestedValue = getNestedProperty(parentViewModel, expression)
  if (nestedValue !== undefined) {
    return nestedValue
  }

  return expression
}

function getPropertyDescriptor(obj: any, prop: string): PropertyDescriptor | undefined {
  let current = Object.getPrototypeOf(obj)
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, prop)
    if (descriptor) return descriptor
    current = Object.getPrototypeOf(current)
  }
  return undefined
}

function getNestedProperty(obj: any, path: string): any {
  if (!path) return obj

  const parts = path.split('.')
  let current = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    current = current[part]
  }

  return current
}

function setNestedProperty(obj: any, path: string, value: any): void {
  if (!path) return

  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!(part in current)) {
      current[part] = {}
    }
    current = current[part]
  }

  const lastPart = parts[parts.length - 1]
  current[lastPart] = value
}

