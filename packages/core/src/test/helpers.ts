export const testHelpers = {
  createTestContainer(): HTMLElement {
    const container = document.createElement("div");
    document.body.appendChild(container);
    return container;
  },

  cleanupTestContainer(container: HTMLElement): void {
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  },

  cleanupAllContainers(): void {
    document.body.innerHTML = "";
  },
};
