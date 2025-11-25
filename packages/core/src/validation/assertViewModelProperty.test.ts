import { describe, it, expect } from "vitest";
import { assertViewModelProperty } from "./assertViewModelProperty";

class TestViewModel {
  existingProperty = "value";
}

describe("assertViewModelProperty", () => {
  it("should not throw error if property exists", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");
    element.setAttribute("bind-value", "existingProperty");

    expect(() => {
      assertViewModelProperty(viewModel, "existingProperty", "bind-value", element);
    }).not.toThrow();
  });

  it("should throw error if property does not exist", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");
    element.setAttribute("bind-value", "nonExistent");

    expect(() => {
      assertViewModelProperty(viewModel, "nonExistent", "bind-value", element);
    }).toThrow('[pelela] Unknown property "nonExistent" used in bind-value');
  });

  it("should include view model name in error", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");

    expect(() => {
      assertViewModelProperty(viewModel, "missing", "bind-visible", element);
    }).toThrow("TestViewModel");
  });

  it("should include binding type in error", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");

    expect(() => {
      assertViewModelProperty(viewModel, "missing", "bind-class", element);
    }).toThrow("bind-class");
  });

  it("should include element snippet in error", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");
    element.className = "test-class";
    element.id = "test-id";

    expect(() => {
      assertViewModelProperty(viewModel, "missing", "bind-style", element);
    }).toThrow('<div class="test-class" id="test-id"></div>');
  });

  it("should truncate snippet if too long", () => {
    const viewModel = new TestViewModel();
    const element = document.createElement("div");
    element.innerHTML = "a".repeat(200);

    expect(() => {
      assertViewModelProperty(viewModel, "missing", "bind-value", element);
    }).toThrow();

    try {
      assertViewModelProperty(viewModel, "missing", "bind-value", element);
    } catch (error: any) {
      expect(error.message.length).toBeLessThan(300);
    }
  });

  it("should allow inherited properties", () => {
    class Parent {
      parentProp = "parent";
    }
    class Child extends Parent {
      childProp = "child";
    }

    const viewModel = new Child();
    const element = document.createElement("div");

    expect(() => {
      assertViewModelProperty(viewModel, "parentProp", "bind-value", element);
    }).not.toThrow();

    expect(() => {
      assertViewModelProperty(viewModel, "childProp", "bind-value", element);
    }).not.toThrow();
  });
});