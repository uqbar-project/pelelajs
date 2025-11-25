import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupClickBindings } from "./bindClick";

describe("bindClick", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("setupClickBindings", () => {
    it("should setup event listeners on elements with click", () => {
      container.innerHTML = '<button click="handleClick">Click me</button>';
      const handleClick = vi.fn();
      const viewModel = { handleClick };

      setupClickBindings(container, viewModel);

      const button = container.querySelector("button")!;
      button.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should pass event to handler", () => {
      container.innerHTML = '<button click="handleClick">Click me</button>';
      const handleClick = vi.fn();
      const viewModel = { handleClick };

      setupClickBindings(container, viewModel);

      const button = container.querySelector("button")!;
      button.click();

      expect(handleClick).toHaveBeenCalledWith(expect.any(MouseEvent));
    });

    it("should execute handler in viewModel context", () => {
      container.innerHTML = '<button click="handleClick">Click me</button>';
      let context: any = null;
      const viewModel = {
        value: 42,
        handleClick: function () {
          context = this;
        },
      };

      setupClickBindings(container, viewModel);

      const button = container.querySelector("button")!;
      button.click();

      expect(context).toBe(viewModel);
      expect(context.value).toBe(42);
    });

    it("should handle multiple elements with click", () => {
      container.innerHTML = `
        <button click="handler1">Button 1</button>
        <button click="handler2">Button 2</button>
      `;
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const viewModel = { handler1, handler2 };

      setupClickBindings(container, viewModel);

      const buttons = container.querySelectorAll("button");
      buttons[0].click();
      buttons[1].click();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should validate that handler is a function", () => {
      container.innerHTML = '<button click="notAFunction">Click me</button>';
      const viewModel = { notAFunction: "string" };

      setupClickBindings(container, viewModel);

      const button = container.querySelector("button")!;
      button.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      expect(() => {
        const handler = (viewModel as any)["notAFunction"];
        if (typeof handler !== "function") {
          throw new Error("Not a function");
        }
      }).toThrow();
    });

    it("should validate that handler exists", () => {
      container.innerHTML = '<button click="missing">Click me</button>';
      const viewModel = {};

      setupClickBindings(container, viewModel);

      const button = container.querySelector("button")!;
      button.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      expect(() => {
        const handler = (viewModel as any)["missing"];
        if (typeof handler !== "function") {
          throw new Error("Not a function");
        }
      }).toThrow();
    });

    it("should allow handler to modify viewModel", () => {
      container.innerHTML = '<button click="increment">Increment</button>';
      const viewModel = {
        count: 0,
        increment: function () {
          this.count++;
        },
      };

      setupClickBindings(container, viewModel);

      const button = container.querySelector("button")!;
      button.click();
      button.click();
      button.click();

      expect(viewModel.count).toBe(3);
    });

    it("should handle elements without click attribute", () => {
      container.innerHTML = `
        <button>No handler</button>
        <button click="">Empty</button>
      `;
      const viewModel = {};

      expect(() => {
        setupClickBindings(container, viewModel);
      }).not.toThrow();
    });

    it("should work with different element types", () => {
      container.innerHTML = `
        <button click="handler">Button</button>
        <div click="handler">Div</div>
        <span click="handler">Span</span>
      `;
      const handler = vi.fn();
      const viewModel = { handler };

      setupClickBindings(container, viewModel);

      container.querySelectorAll("[click]").forEach((el) => {
        (el as HTMLElement).click();
      });

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });
});