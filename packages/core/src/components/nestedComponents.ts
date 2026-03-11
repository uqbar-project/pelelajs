import { CircularComponentError } from '../errors/index'

export class ComponentHierarchyTracker {
  private componentStack: string[] = []

  enterComponent(componentName: string): void {
    if (this.componentStack.includes(componentName)) {
      const chain = [...this.componentStack, componentName]
      throw new CircularComponentError(chain)
    }
    this.componentStack.push(componentName)
  }

  exitComponent(): void {
    this.componentStack.pop()
  }

  getCurrentDepth(): number {
    return this.componentStack.length
  }

  getComponentChain(): string[] {
    return [...this.componentStack]
  }

  isInHierarchy(componentName: string): boolean {
    return this.componentStack.includes(componentName)
  }
}

const globalTracker = new ComponentHierarchyTracker()

export function getGlobalComponentTracker(): ComponentHierarchyTracker {
  return globalTracker
}

export function resetGlobalComponentTracker(): void {
  while (globalTracker.getCurrentDepth() > 0) {
    globalTracker.exitComponent()
  }
}
