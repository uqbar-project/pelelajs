import { describe, it, expect, beforeEach } from "vitest";
import { setupIfBindings, renderIfBindings } from "./bindIf";
import type { ViewModel } from "./types";

describe("bindIf", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("setupIfBindings", () => {
    it("should collect elements with if", () => {
      container.innerHTML = `
        <div if="show1"></div>
        <div if="show2"></div>
      `;

      const viewModel = { show1: true, show2: false };
      const bindings = setupIfBindings(container, viewModel);

      expect(bindings).toHaveLength(2);
    });

    it("should save original display of element", () => {
      container.innerHTML = '<div if="show" style="display: flex;"></div>';

      const viewModel = { show: true };
      const bindings = setupIfBindings(container, viewModel);

      expect(bindings[0].originalDisplay).toBe("flex");
    });

    it("should use empty string as original display if no style", () => {
      container.innerHTML = '<div if="show"></div>';

      const viewModel = { show: true };
      const bindings = setupIfBindings(container, viewModel);

      expect(bindings[0].originalDisplay).toBe("");
    });

    it("should throw error if property does not exist", () => {
      container.innerHTML = '<div if="missing"></div>';
      const viewModel = {};

      expect(() => {
        setupIfBindings(container, viewModel);
      }).toThrow("Unknown property");
    });
  });

  describe("renderIfBindings", () => {
    it("should show elements when value is true", () => {
      container.innerHTML = '<div if="show"></div>';
      const viewModel = { show: false };
      const bindings = setupIfBindings(container, viewModel);

      viewModel.show = true;
      renderIfBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.display).toBe("");
    });

    it("should hide elements when value is false", () => {
      container.innerHTML = '<div if="show"></div>';
      const viewModel = { show: true };
      const bindings = setupIfBindings(container, viewModel);

      viewModel.show = false;
      renderIfBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.display).toBe("none");
    });

    it("should restore original display when showing", () => {
      container.innerHTML = '<div if="show" style="display: flex;"></div>';
      const viewModel = { show: false };
      const bindings = setupIfBindings(container, viewModel);

      viewModel.show = true;
      renderIfBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.style.display).toBe("flex");
    });

    it("should treat falsy values as false", () => {
      container.innerHTML = '<div if="value"></div>';
      const viewModel: ViewModel<{ value: unknown }> = { value: 0 };
      const bindings = setupIfBindings(container, viewModel);

      renderIfBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).toBe("none");

      viewModel.value = "";
      renderIfBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).toBe("none");

      viewModel.value = null;
      renderIfBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).toBe("none");
    });

    it("should treat truthy values as true", () => {
      container.innerHTML = '<div if="value"></div>';
      const viewModel: ViewModel<{ value: unknown }> = { value: 1 };
      const bindings = setupIfBindings(container, viewModel);

      renderIfBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).not.toBe("none");

      viewModel.value = "text";
      renderIfBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).not.toBe("none");

      viewModel.value = {};
      renderIfBindings(bindings, viewModel);
      expect(container.querySelector("div")!.style.display).not.toBe("none");
    });
  });
});


