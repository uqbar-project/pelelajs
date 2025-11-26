import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupBindings } from "./setupBindings";

describe("setupBindings", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("should setup all binding types", () => {
    container.innerHTML = `
      <span bind-value="message"></span>
      <div if="show"></div>
      <div bind-class="classes"></div>
      <div bind-style="styles"></div>
      <button click="handleClick">Click</button>
    `;

    const viewModel = {
      message: "Hello",
      show: true,
      classes: "test",
      styles: { color: "red" },
      handleClick: vi.fn(),
    };

    const render = setupBindings(container, viewModel);

    expect(typeof render).toBe("function");
  });

  it("should perform initial render automatically", () => {
    container.innerHTML = '<span bind-value="message"></span>';
    const viewModel = { message: "Initial" };

    setupBindings(container, viewModel);

    const span = container.querySelector("span")!;
    expect(span.textContent).toBe("Initial");
  });

  it("should return render function that updates all bindings", () => {
    container.innerHTML = `
      <span bind-value="count"></span>
      <div if="show"></div>
    `;

    const viewModel = {
      count: 0,
      show: false,
    };

    const render = setupBindings(container, viewModel);

    viewModel.count = 42;
    viewModel.show = true;
    render();

    expect(container.querySelector("span")!.textContent).toBe("42");
    expect(container.querySelector("div")!.style.display).not.toBe("none");
  });

  it("should handle multiple elements of same binding type", () => {
    container.innerHTML = `
      <span bind-value="value1"></span>
      <span bind-value="value2"></span>
      <span bind-value="value3"></span>
    `;

    const viewModel = {
      value1: "one",
      value2: "two",
      value3: "three",
    };

    setupBindings(container, viewModel);

    const spans = container.querySelectorAll("span");
    expect(spans[0].textContent).toBe("one");
    expect(spans[1].textContent).toBe("two");
    expect(spans[2].textContent).toBe("three");
  });

  it("should setup event listeners for click", () => {
    container.innerHTML = '<button click="handleClick">Click</button>';
    const handleClick = vi.fn();
    const viewModel = { handleClick };

    setupBindings(container, viewModel);

    container.querySelector("button")!.click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should only update necessary elements on each render", () => {
    container.innerHTML = `
      <span bind-value="changing"></span>
      <span bind-value="static"></span>
    `;

    const viewModel = {
      changing: "initial",
      static: "never changes",
    };

    const render = setupBindings(container, viewModel);

    viewModel.changing = "updated";
    render();

    const spans = container.querySelectorAll("span");
    expect(spans[0].textContent).toBe("updated");
    expect(spans[1].textContent).toBe("never changes");
  });

  it("should handle empty element without error", () => {
    container.innerHTML = "";
    const viewModel = {};

    expect(() => {
      setupBindings(container, viewModel);
    }).not.toThrow();
  });

  it("should integrate all binding types correctly", () => {
    container.innerHTML = `
      <div>
        <input bind-value="name" />
        <div if="showMessage">
          <span bind-value="message" bind-class="messageClass" bind-style="messageStyle"></span>
        </div>
        <button click="submit">Submit</button>
      </div>
    `;

    const submit = vi.fn();
    const viewModel = {
      name: "John",
      showMessage: true,
      message: "Hello",
      messageClass: "highlight",
      messageStyle: { color: "blue" },
      submit,
    };

    const render = setupBindings(container, viewModel);

    expect(container.querySelector("input")!.value).toBe("John");
    expect(container.querySelector("span")!.textContent).toBe("Hello");
    expect(container.querySelector("span")!.className).toContain("highlight");
    expect(container.querySelector("span")!.style.color).toBe("blue");

    viewModel.showMessage = false;
    render();
    expect(container.querySelectorAll("div")[1].style.display).toBe("none");

    container.querySelector("button")!.click();
    expect(submit).toHaveBeenCalled();
  });
});