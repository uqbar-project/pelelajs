import { describe, it, expect, beforeEach } from "vitest";
import { setupClassBindings, renderClassBindings } from "./bindClass";
import type { ViewModel } from "./types";

describe("bindClass", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("setupClassBindings", () => {
    it("should collect elements with bind-class", () => {
      container.innerHTML = `
        <div bind-class="classes1"></div>
        <div bind-class="classes2"></div>
      `;

      const viewModel = { classes1: "", classes2: "" };
      const bindings = setupClassBindings(container, viewModel);

      expect(bindings).toHaveLength(2);
    });

    it("should save static classes of element", () => {
      container.innerHTML = '<div class="static-class another" bind-class="dynamic"></div>';

      const viewModel = { dynamic: "" };
      const bindings = setupClassBindings(container, viewModel);

      expect(bindings[0].staticClassName).toBe("static-class another");
    });

    it("should throw error if property does not exist", () => {
      container.innerHTML = '<div bind-class="missing"></div>';
      const viewModel = {};

      expect(() => {
        setupClassBindings(container, viewModel);
      }).toThrow("Unknown property");
    });
  });

  describe("renderClassBindings", () => {
    it("should apply classes from string", () => {
      container.innerHTML = '<div bind-class="classes"></div>';
      const viewModel = { classes: "active highlighted" };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.className).toBe("active highlighted");
    });

    it("should combine static and dynamic classes", () => {
      container.innerHTML = '<div class="static" bind-class="classes"></div>';
      const viewModel = { classes: "dynamic" };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.className).toBe("static dynamic");
    });

    it("should apply classes from array", () => {
      container.innerHTML = '<div bind-class="classes"></div>';
      const viewModel = { classes: ["one", "two", "three"] };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.className).toBe("one two three");
    });

    it("should filter falsy values from array", () => {
      container.innerHTML = '<div bind-class="classes"></div>';
      const viewModel = { classes: ["one", "", null, "two", false, undefined, "three"] };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.className).toBe("one two three");
    });

    it("should apply classes from object", () => {
      container.innerHTML = '<div bind-class="classes"></div>';
      const viewModel = {
        classes: {
          active: true,
          disabled: false,
          highlighted: true,
        },
      };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.className).toBe("active highlighted");
    });

    it("should update classes when object changes", () => {
      container.innerHTML = '<div bind-class="classes"></div>';
      const viewModel = {
        classes: {
          active: true,
          disabled: false,
        },
      };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);
      let div = container.querySelector("div")!;
      expect(div.className).toBe("active");

      viewModel.classes = {
        active: false,
        disabled: true,
      };
      renderClassBindings(bindings, viewModel);
      expect(div.className).toBe("disabled");
    });

    it("should handle empty string", () => {
      container.innerHTML = '<div class="static" bind-class="classes"></div>';
      const viewModel = { classes: "" };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.className).toBe("static");
    });

    it("should handle empty array", () => {
      container.innerHTML = '<div class="static" bind-class="classes"></div>';
      const viewModel = { classes: [] };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.className).toBe("static");
    });

    it("should handle empty object", () => {
      container.innerHTML = '<div class="static" bind-class="classes"></div>';
      const viewModel = { classes: {} };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.className).toBe("static");
    });

    it("should handle invalid values", () => {
      container.innerHTML = '<div class="static" bind-class="classes"></div>';
      const viewModel: ViewModel<{ classes: unknown }> = { classes: null };
      const bindings = setupClassBindings(container, viewModel);

      renderClassBindings(bindings, viewModel);

      const div = container.querySelector("div")!;
      expect(div.className).toBe("static");

      viewModel.classes = undefined;
      renderClassBindings(bindings, viewModel);
      expect(div.className).toBe("static");

      viewModel.classes = 123;
      renderClassBindings(bindings, viewModel);
      expect(div.className).toBe("static");
    });
  });
});