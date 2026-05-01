export const testHelpers = {
  catchError<T = unknown>(fn: () => void): T {
    try {
      fn()
    } catch (error) {
      return error as T
    }
    throw new Error('Expected function to throw an error')
  },

  createTestContainer(): HTMLElement {
    const container = document.createElement('div')
    document.body.appendChild(container)
    return container
  },

  cleanupTestContainer(container: HTMLElement): void {
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  },

  cleanupAllContainers(): void {
    document.body.innerHTML = ''
  },
}
