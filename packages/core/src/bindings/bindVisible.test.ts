import { describe, it, expect, beforeEach } from "vitest";
import { setupVisibleBindings, renderVisibleBindings } from "./bindVisible";

describe("bindVisible", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("setupVisibleBindings", () => {
    it("should collect elements with bind-visible", () => {
      container.innerHTML = `
        <div bind-visible="show1"></div>
        <div bind-visible="show2"></div>
      `;

      const viewModel = { show1: true, show2: false };
      const bindings = setupVisibleBindings(container, viewModel);

      expect(bindings).toHaveLength(2);
    });

    it("should save original display of element", () => {
      container.innerHTML = '<div bind-visible="show" style="display: flex;"></div>';

      const viewModel = { show: true };
      const bindings = setupVisibleBindings(container, viewModel);

      expect(bindings[0].originalDisplay).toBe("flex");
    });

    it("should use empty string as original display if no style", () => {
      container.innerHTML = '<div bind-visible="show"></div>';

      const viewModel = { show: true };
      const bindings = setupVisibleBindings(container, viewModel);

      expect(bindings[0].originalDisplay).toBe("");
    });

    it("should throw error if property does not exist", () => {
      container.innerHTML = '<div bind-visible="missing"></div>';
      const viewModel = {};

      expect(() => {
        setupVisibleBindings(container, viewModel);
      }).toThrow("Unknown property");
    });
  });

  describe("renderVisibleBindings", () => {
    it("should show elements when value is true", () => {
      container.innerHTML = '<div bind-visible="show"></div>';
      const viewModel = { show: false };
      const bindings = setupVisibleBindings(container, viewModel);

      viewModel.show = true;
      renderVisibleBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.display).toBe("");
    });

    it("should hide elements when value is false", () => {
      container.innerHTML = '<div bind-visible="show"></div>';
      const viewModel = { show: true };
      const bindings = setupVisibleBindings(container, viewModel);

      viewModel.show = false;
      renderVisibleBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.display).toBe("none");
    });

    it("should restore original display when showing", () => {
      container.innerHTML = '<div bind-visible="show" style="display: flex;"></div>';
      const viewModel = { show: false };
      const bindings = setupVisibleBindings(container, viewModel);

      viewModel.show = true;
      renderVisibleBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.display).toBe("flex");
    });

    it("should treat falsy values as false", () => {
      container.innerHTML = '<div bind-visible="value"></div>';
      const viewModel: any = { value: 0 };
      const bindings = setupVisibleBindings(container, viewModel);

      renderVisibleBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).toBe("none");

      viewModel.value = "";
      renderVisibleBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).toBe("none");

      viewModel.value = null;
      renderVisibleBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).toBe("none");
    });

    it("should treat truthy values as true", () => {
      container.innerHTML = '<div bind-visible="value"></div>';
      const viewModel: any = { value: 1 };
      const bindings = setupVisibleBindings(container, viewModel);

      renderVisibleBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).not.toBe("none");

      viewModel.value = "text";
      renderVisibleBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).not.toBe("none");

      viewModel.value = {};
      renderVisibleBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).not.toBe("none");
    });
  });
});