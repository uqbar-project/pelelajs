import { describe, it, expect, beforeEach } from "vitest";
import { mountTemplate } from "./mountTemplate";
import { registerViewModel, clearRegistry } from "../registry/viewModelRegistry";

class TestViewModel {
  message = "Hello from template";
  count = 0;
}

describe("mountTemplate", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    clearRegistry();
  });

  it("should insert template HTML into container", () => {
    const template = `
      <pelela view-model="TestVM">
        <span bind-value="message"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    mountTemplate(container, template);

    expect(container.querySelector("pelela")).toBeDefined();
    expect(container.querySelector("span")).toBeDefined();
  });

  it("should initialize view models in template", () => {
    const template = `
      <pelela view-model="TestVM">
        <span bind-value="message"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    mountTemplate(container, template);

    const span = container.querySelector("span")!;
    expect(span.textContent).toBe("Hello from template");
  });

  it("should create reactive view models", () => {
    const template = `
      <pelela view-model="TestVM">
        <span bind-value="count"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    mountTemplate(container, template);

    const pelela = container.querySelector("pelela")! as any;
    const viewModel = pelela.__pelelaViewModel;
    const span = container.querySelector("span")!;

    viewModel.count = 99;

    expect(span.textContent).toBe("99");
  });

  it("should replace existing container content", () => {
    container.innerHTML = "<div>Old content</div>";

    const template = `
      <pelela view-model="TestVM">
        <span bind-value="message"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    mountTemplate(container, template);

    expect(container.textContent).not.toContain("Old content");
    expect(container.querySelector("pelela")).toBeDefined();
  });

  it("should handle templates with multiple pelela elements", () => {
    const template = `
      <div>
        <pelela view-model="TestVM">
          <span bind-value="message"></span>
        </pelela>
        <pelela view-model="TestVM">
          <span bind-value="count"></span>
        </pelela>
      </div>
    `;

    registerViewModel("TestVM", TestViewModel);
    mountTemplate(container, template);

    const spans = container.querySelectorAll("span");
    expect(spans).toHaveLength(2);
    expect(spans[0].textContent).toBe("Hello from template");
    expect(spans[1].textContent).toBe("0");
  });

  it("should handle empty templates", () => {
    const template = "";

    expect(() => {
      mountTemplate(container, template);
    }).not.toThrow();

    expect(container.innerHTML).toBe("");
  });

  it("should handle templates without pelela elements", () => {
    const template = "<div>Just regular HTML</div>";

    expect(() => {
      mountTemplate(container, template);
    }).not.toThrow();

    expect(container.innerHTML).toContain("Just regular HTML");
  });

  it("should allow accessing view model after mounting", () => {
    const template = `
      <pelela view-model="TestVM">
        <span bind-value="message"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    mountTemplate(container, template);

    const pelela = container.querySelector("pelela")! as any;
    const viewModel = pelela.__pelelaViewModel;

    expect(viewModel).toBeDefined();
    expect(viewModel.message).toBe("Hello from template");
  });

  it("should setup complete bindings", () => {
    const template = `
      <pelela view-model="TestVM">
        <input bind-value="count" />
        <span bind-value="count"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    mountTemplate(container, template);

    const input = container.querySelector("input")!;
    const span = container.querySelector("span")!;

    input.value = "42";
    input.dispatchEvent(new Event("input"));

    expect(span.textContent).toBe("42");
  });
});