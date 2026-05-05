export const testHelpers = {
  catchError<T = unknown>(fn: () => unknown): T {
    let result: unknown
    try {
      result = fn()
    } catch (error) {
      return error as T
    }

    if (result instanceof Promise) {
      void (result as Promise<unknown>).catch(() => {})
      throw new TypeError('catchError does not support async functions. Use an async helper.')
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
