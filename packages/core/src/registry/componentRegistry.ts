import type { ComponentConfig } from '../types'

const componentRegistry = new Map<string, ComponentConfig>()

export function registerComponent(name: string, config: ComponentConfig): void {
  if (componentRegistry.has(name)) {
    console.warn(`[pelela] Component "${name}" is already registered. Overwriting...`)
  }
  componentRegistry.set(name, config)
}

export function getComponent(name: string): ComponentConfig | undefined {
  return componentRegistry.get(name)
}

export function hasComponent(name: string): boolean {
  return componentRegistry.has(name)
}

export function clearComponentRegistry(): void {
  componentRegistry.clear()
}

export function getAllComponents(): Map<string, ComponentConfig> {
  return new Map(componentRegistry)
}

