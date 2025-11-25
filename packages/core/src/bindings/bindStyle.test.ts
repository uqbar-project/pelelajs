import { describe, it, expect, beforeEach } from "vitest";
import { setupStyleBindings, renderStyleBindings } from "./bindStyle";

describe("bindStyle", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("setupStyleBindings", () => {
    it("should collect elements with bind-style", () => {
      container.innerHTML = `
        <div bind-style="styles1"></div>
        <div bind-style="styles2"></div>
      `;

      const viewModel = { styles1: {}, styles2: {} };
      const bindings = setupStyleBindings(container, viewModel);

      expect(bindings).toHaveLength(2);
    });

    it("should throw error if property does not exist", () => {
      container.innerHTML = '<div bind-style="missing"></div>';
      const viewModel = {};

      expect(() => {
        setupStyleBindings(container, viewModel);
      }).toThrow("Unknown property");
    });
  });

  describe("renderStyleBindings", () => {
    it("should apply styles from object", () => {
      container.innerHTML = '<div bind-style="styles"></div>';
      const viewModel = {
        styles: {
          color: "red",
          fontSize: "16px",
        },
      };
      const bindings = setupStyleBindings(container, viewModel);

      renderStyleBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.color).toBe("red");
      expect(div.style.fontSize).toBe("16px");
    });

    it("should handle camelCase properties", () => {
      container.innerHTML = '<div bind-style="styles"></div>';
      const viewModel = {
        styles: {
          backgroundColor: "blue",
          fontWeight: "bold",
        },
      };
      const bindings = setupStyleBindings(container, viewModel);

      renderStyleBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.backgroundColor).toBe("blue");
      expect(div.style.fontWeight).toBe("bold");
    });

    it("should convert numeric values to strings", () => {
      container.innerHTML = '<div bind-style="styles"></div>';
      const viewModel = {
        styles: {
          opacity: 0.5,
          zIndex: 100,
        },
      };
      const bindings = setupStyleBindings(container, viewModel);

      renderStyleBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.opacity).toBe("0.5");
      expect(div.style.zIndex).toBe("100");
    });

    it("should ignore null and undefined values", () => {
      container.innerHTML = '<div bind-style="styles"></div>';
      const viewModel = {
        styles: {
          color: "red",
          fontSize: null,
          fontWeight: undefined,
        },
      };
      const bindings = setupStyleBindings(container, viewModel);

      renderStyleBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.color).toBe("red");
      expect(div.style.fontSize).toBe("");
      expect(div.style.fontWeight).toBe("");
    });

    it("should clear styles when value is not an object", () => {
      container.innerHTML = '<div bind-style="styles" style="color: red;"></div>';
      const viewModel: any = { styles: null };
      const bindings = setupStyleBindings(container, viewModel);

      renderStyleBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.cssText).toBe("");
    });

    it("should update styles when object changes", () => {
      container.innerHTML = '<div bind-style="styles"></div>';
      const viewModel: any = {
        styles: {
          color: "red",
        },
      };
      const bindings = setupStyleBindings(container, viewModel);

      renderStyleBindings(bindings, viewModel);
      let div = container.querySelector("div")!;
      expect(div.style.color).toBe("red");

      viewModel.styles = {
        color: "blue",
        fontSize: "20px",
      };
      renderStyleBindings(bindings, viewModel);
      expect(div.style.color).toBe("blue");
      expect(div.style.fontSize).toBe("20px");
    });

    it("should replace all styles on each render", () => {
      container.innerHTML = '<div bind-style="styles"></div>';
      const viewModel: any = {
        styles: {
          color: "red",
          fontSize: "16px",
        },
      };
      const bindings = setupStyleBindings(container, viewModel);

      renderStyleBindings(bindings, viewModel);
      let div = container.querySelector("div")!;
      expect(div.style.color).toBe("red");
      expect(div.style.fontSize).toBe("16px");

      viewModel.styles = {
        color: "blue",
      };
      renderStyleBindings(bindings, viewModel);
      expect(div.style.color).toBe("blue");
      expect(div.style.fontSize).toBe("");
    });

    it("should handle empty object", () => {
      container.innerHTML = '<div bind-style="styles" style="color: red;"></div>';
      const viewModel = { styles: {} };
      const bindings = setupStyleBindings(container, viewModel);

      renderStyleBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.cssText).toBe("");
    });
  });
});