import { ViewModelRegistrationError } from '../errors/index'
import type { ViewModelConstructor } from '../types'

const viewModelRegistry = new Map<string, ViewModelConstructor>()

export function registerViewModel(name: string, creator: ViewModelConstructor): void {
  if (viewModelRegistry.has(name)) {
    throw new ViewModelRegistrationError(name, 'duplicate')
  }
  viewModelRegistry.set(name, creator)
}

export function replaceViewModel(name: string, creator: ViewModelConstructor): void {
  viewModelRegistry.set(name, creator)
}

export function getViewModel(name: string): ViewModelConstructor | undefined {
  return viewModelRegistry.get(name)
}

export function hasViewModel(name: string): boolean {
  return viewModelRegistry.has(name)
}

export function clearRegistry(): void {
  viewModelRegistry.clear()
}
