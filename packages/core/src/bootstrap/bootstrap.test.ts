import { describe, it, expect, beforeEach, vi } from "vitest";
import { bootstrap } from "./bootstrap";
import { registerViewModel, clearRegistry } from "../registry/viewModelRegistry";

class TestViewModel {
  message = "Hello";
  count = 0;

  increment() {
    this.count++;
  }
}

describe("bootstrap", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    clearRegistry();
  });

  it("should initialize pelela elements with view-model", () => {
    document.body.innerHTML = `
      <pelela view-model="TestVM">
        <span bind-value="message"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    bootstrap();

    const span = document.querySelector("span")!;
    expect(span.textContent).toBe("Hello");
  });

  it("should create reactive instances of view models", () => {
    document.body.innerHTML = `
      <pelela view-model="TestVM">
        <span bind-value="count"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    bootstrap();

    const pelela = document.querySelector("pelela")! as any;
    const viewModel = pelela.__pelelaViewModel;

    expect(viewModel).toBeDefined();
    expect(viewModel.count).toBe(0);
  });

  it("should update DOM when view model changes", () => {
    document.body.innerHTML = `
      <pelela view-model="TestVM">
        <span bind-value="count"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    bootstrap();

    const pelela = document.querySelector("pelela")! as any;
    const viewModel = pelela.__pelelaViewModel;
    const span = document.querySelector("span")!;

    viewModel.count = 42;

    expect(span.textContent).toBe("42");
  });

  it("should handle multiple pelela elements", () => {
    document.body.innerHTML = `
      <pelela view-model="TestVM">
        <span bind-value="message"></span>
      </pelela>
      <pelela view-model="TestVM">
        <span bind-value="count"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    bootstrap();

    const spans = document.querySelectorAll("span");
    expect(spans[0].textContent).toBe("Hello");
    expect(spans[1].textContent).toBe("0");
  });

  it("should throw error if view model is not registered", () => {
    document.body.innerHTML = `
      <pelela view-model="UnregisteredVM">
        <span bind-value="message"></span>
      </pelela>
    `;

    expect(() => {
      bootstrap();
    }).toThrow('View model "UnregisteredVM" is not registered');
  });

  it("should show warning if no pelela elements found", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML = "<div>No pelela elements</div>";

    bootstrap();

    expect(warnSpy).toHaveBeenCalledWith(
      "[pelela] No <pelela view-model=\"...\"> elements found"
    );

    warnSpy.mockRestore();
  });

  it("should use custom document if provided", () => {
    const customDoc = document.implementation.createHTMLDocument();
    customDoc.body.innerHTML = `
      <pelela view-model="TestVM">
        <span bind-value="message"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    bootstrap({ document: customDoc });

    const span = customDoc.querySelector("span")!;
    expect(span.textContent).toBe("Hello");
  });

  it("should search only in specified root", () => {
    document.body.innerHTML = `
      <div id="app1">
        <pelela view-model="TestVM">
          <span bind-value="message"></span>
        </pelela>
      </div>
      <div id="app2">
        <pelela view-model="TestVM">
          <span bind-value="count"></span>
        </pelela>
      </div>
    `;

    registerViewModel("TestVM", TestViewModel);
    const root = document.getElementById("app1")!;
    bootstrap({ root });

    const app1Span = root.querySelector("span")!;
    const app2Span = document.getElementById("app2")!.querySelector("span")!;

    expect(app1Span.textContent).toBe("Hello");
    expect(app2Span.textContent).toBe("");
  });

  it("should ignore pelela elements without view-model attribute", () => {
    document.body.innerHTML = `
      <pelela>
        <span>No view model</span>
      </pelela>
    `;

    expect(() => {
      bootstrap();
    }).not.toThrow();
  });

  it("should setup event handlers correctly", () => {
    document.body.innerHTML = `
      <pelela view-model="TestVM">
        <span bind-value="count"></span>
        <button click="increment">+</button>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    bootstrap();

    const button = document.querySelector("button")!;
    const span = document.querySelector("span")!;

    button.click();
    button.click();

    expect(span.textContent).toBe("2");
  });

  it("should log initialization information", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    document.body.innerHTML = `
      <pelela view-model="TestVM">
        <span bind-value="message"></span>
      </pelela>
    `;

    registerViewModel("TestVM", TestViewModel);
    bootstrap();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[pelela] View model "TestVM" instantiated and bound'),
      expect.any(Object)
    );

    logSpy.mockRestore();
  });
});