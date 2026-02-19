import type { ComponentProps, ViewModel } from '../types'

export function createComponentViewModel<T extends object>(
  componentInstance: T,
  parentViewModel: ViewModel,
  props: ComponentProps,
): ViewModel<T> {
  const resolvedUnidirectionalProps: Record<string, any> = {}
  for (const [propName, propExpression] of Object.entries(props.unidirectional)) {
    resolvedUnidirectionalProps[propName] = resolvePropertyValue(propExpression, parentViewModel)
  }

  const bidirectionalPropsMap: Record<string, string> = { ...props.bidirectional }

  const proxy = new Proxy(componentInstance as Record<string, unknown>, {
    has(_target, prop) {
      if (typeof prop === 'string') {
        if (prop in resolvedUnidirectionalProps) return true
        if (prop in bidirectionalPropsMap) return true
        if (prop in componentInstance) return true
        if (prop in parentViewModel) return true
      }
      return false
    },

    get(_target, prop) {
      if (typeof prop === 'string') {
        if (prop in resolvedUnidirectionalProps) {
          return resolvedUnidirectionalProps[prop]
        }

        if (prop in bidirectionalPropsMap) {
          const parentProp = bidirectionalPropsMap[prop]
          return getNestedProperty(parentViewModel, parentProp)
        }

        if (prop in componentInstance) {
          return (componentInstance as any)[prop]
        }

        if (prop in parentViewModel) {
          return parentViewModel[prop as string]
        }
      }

      return undefined
    },

    set(_target, prop, value) {
      if (typeof prop === 'string') {
        if (prop in bidirectionalPropsMap) {
          const parentProp = bidirectionalPropsMap[prop]
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

  return getNestedProperty(parentViewModel, expression)
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

