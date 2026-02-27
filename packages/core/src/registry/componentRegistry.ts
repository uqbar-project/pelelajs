import type { ComponentConfig } from '../types'

const componentRegistry = new Map<string, ComponentConfig>()

function normalizeKey(name: string): string {
  return name.toLowerCase()
}

export function registerComponent(name: string, config: ComponentConfig): void {
  const key = normalizeKey(name)
  if (componentRegistry.has(key)) {
    console.warn(`[pelela] Component "${name}" is already registered. Overwriting...`)
  }
  componentRegistry.set(key, config)
}

export function getComponent(name: string): ComponentConfig | undefined {
  return componentRegistry.get(normalizeKey(name))
}

export function hasComponent(name: string): boolean {
  return componentRegistry.has(normalizeKey(name))
}

export function clearComponentRegistry(): void {
  componentRegistry.clear()
}

export function getAllComponents(): Map<string, ComponentConfig> {
  return new Map(componentRegistry)
}
