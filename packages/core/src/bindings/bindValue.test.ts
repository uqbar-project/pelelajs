import { describe, it, expect, beforeEach } from "vitest";
import { setupValueBindings, renderValueBindings } from "./bindValue";

describe("bindValue", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("setupValueBindings", () => {
    it("should collect elements with bind-value", () => {
      container.innerHTML = `
        <span bind-value="message"></span>
        <input bind-value="name" />
      `;

      const viewModel = { message: "", name: "" };
      const bindings = setupValueBindings(container, viewModel);

      expect(bindings).toHaveLength(2);
    });

    it("should identify inputs correctly", () => {
      container.innerHTML = `
        <span bind-value="text"></span>
        <input bind-value="input" />
        <textarea bind-value="area"></textarea>
      `;

      const viewModel = { text: "", input: "", area: "" };
      const bindings = setupValueBindings(container, viewModel);

      expect(bindings[0].isInput).toBe(false);
      expect(bindings[1].isInput).toBe(true);
      expect(bindings[2].isInput).toBe(true);
    });

    it("should setup event listeners on inputs", () => {
      container.innerHTML = '<input bind-value="name" />';
      const viewModel = { name: "initial" };

      setupValueBindings(container, viewModel);

      const input = container.querySelector("input")!;
      input.value = "updated";
      input.dispatchEvent(new Event("input"));

      expect(viewModel.name).toBe("updated");
    });

    it("should convert numeric values in inputs", () => {
      container.innerHTML = '<input bind-value="count" />';
      const viewModel = { count: 0 };

      setupValueBindings(container, viewModel);

      const input = container.querySelector("input")!;
      input.value = "42";
      input.dispatchEvent(new Event("input"));

      expect(viewModel.count).toBe(42);
    });

    it("should handle invalid numeric values", () => {
      container.innerHTML = '<input bind-value="count" />';
      const viewModel = { count: 0 };

      setupValueBindings(container, viewModel);

      const input = container.querySelector("input")!;
      input.value = "invalid";
      input.dispatchEvent(new Event("input"));

      expect(viewModel.count).toBe(0);
    });

    it("should accept commas as decimal separator", () => {
      container.innerHTML = '<input bind-value="price" />';
      const viewModel = { price: 0 };

      setupValueBindings(container, viewModel);

      const input = container.querySelector("input")!;
      input.value = "10,5";
      input.dispatchEvent(new Event("input"));

      expect(viewModel.price).toBe(10.5);
    });

    it("should throw error if property does not exist", () => {
      container.innerHTML = '<span bind-value="missing"></span>';
      const viewModel = {};

      expect(() => {
        setupValueBindings(container, viewModel);
      }).toThrow("Unknown property");
    });
  });

  describe("renderValueBindings", () => {
    it("should update textContent of non-input elements", () => {
      container.innerHTML = '<span bind-value="message"></span>';
      const viewModel = { message: "Hello" };
      const bindings = setupValueBindings(container, viewModel);

      viewModel.message = "World";
      renderValueBindings(bindings, viewModel);

      const span = container.querySelector("span")!;
      expect(span.textContent).toBe("World");
    });

    it("should update value of inputs", () => {
      container.innerHTML = '<input bind-value="name" />';
      const viewModel = { name: "John" };
      const bindings = setupValueBindings(container, viewModel);

      viewModel.name = "Jane";
      renderValueBindings(bindings, viewModel);

      const input = container.querySelector("input")!;
      expect(input.value).toBe("Jane");
    });

    it("should handle null and undefined values", () => {
      container.innerHTML = '<span bind-value="text"></span>';
      const viewModel: any = { text: "initial" };
      const bindings = setupValueBindings(container, viewModel);

      viewModel.text = null;
      renderValueBindings(bindings, viewModel);
      expect(container.querySelector("span")!.textContent).toBe("");

      viewModel.text = undefined;
      renderValueBindings(bindings, viewModel);
      expect(container.querySelector("span")!.textContent).toBe("");
    });

    it("should convert numbers to strings", () => {
      container.innerHTML = '<span bind-value="count"></span>';
      const viewModel = { count: 42 };
      const bindings = setupValueBindings(container, viewModel);

      renderValueBindings(bindings, viewModel);

      expect(container.querySelector("span")!.textContent).toBe("42");
    });

    it("should not update input if value has not changed", () => {
      container.innerHTML = '<input bind-value="name" />';
      const viewModel = { name: "John" };
      const bindings = setupValueBindings(container, viewModel);

      const input = container.querySelector("input")!;
      input.value = "John";

      renderValueBindings(bindings, viewModel);

      expect(input.value).toBe("John");
    });
  });
});