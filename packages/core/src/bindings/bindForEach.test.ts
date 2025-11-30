import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupForEachBindings, renderForEachBindings } from "./bindForEach";
import type { ViewModel } from "./types";

describe("bindForEach", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  describe("setupForEachBindings", () => {
    it("should parse for-each expression correctly", () => {
      container.innerHTML = `
        <div for-each="user of users">
          <span bind-value="user.name"></span>
        </div>
      `;

      const viewModel = { users: [] };
      const bindings = setupForEachBindings(container, viewModel);

      expect(bindings).toHaveLength(1);
      expect(bindings[0].itemName).toBe("user");
      expect(bindings[0].collectionName).toBe("users");
    });

    it("should remove template element from DOM", () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items">Item</li>
        </ul>
      `;

      const viewModel = { items: [] };
      setupForEachBindings(container, viewModel);

      const li = container.querySelector("li");
      expect(li).toBeNull();
    });

    it("should create placeholder comment", () => {
      container.innerHTML = `
        <div for-each="item of items"></div>
      `;

      const viewModel = { items: [] };
      setupForEachBindings(container, viewModel);

      const comment = Array.from(container.childNodes).find(
        (node) => node.nodeType === Node.COMMENT_NODE,
      );
      expect(comment).toBeDefined();
      expect(comment?.textContent).toContain("for-each: item of items");
    });

    it("should throw error if collection property does not exist", () => {
      container.innerHTML = '<div for-each="item of missing"></div>';
      const viewModel = {};

      expect(() => {
        setupForEachBindings(container, viewModel);
      }).toThrow("Unknown property");
    });

    it("should handle invalid for-each expression", () => {
      container.innerHTML = '<div for-each="invalid"></div>';
      const viewModel = { invalid: [] };

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const bindings = setupForEachBindings(container, viewModel);

      expect(bindings).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle non-array collection", () => {
      container.innerHTML = '<div for-each="item of notArray"></div>';
      const viewModel = { notArray: "string" };

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      setupForEachBindings(container, viewModel);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("renderForEachBindings", () => {
    it("should render elements for initial array", () => {
      container.innerHTML = `
        <div for-each="user of users">
          <span bind-value="user.name"></span>
        </div>
      `;

      const viewModel = {
        users: [{ name: "Alice" }, { name: "Bob" }],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const spans = container.querySelectorAll("span");
      expect(spans).toHaveLength(2);
      expect(spans[0].textContent).toBe("Alice");
      expect(spans[1].textContent).toBe("Bob");
    });

    it("should add new elements when array grows", () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-value="item.text"></span>
        </div>
      `;

      const viewModel = {
        items: [{ text: "First" }],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      expect(container.querySelectorAll("span")).toHaveLength(1);

      viewModel.items.push({ text: "Second" });
      renderForEachBindings(bindings, viewModel);

      const spans = container.querySelectorAll("span");
      expect(spans).toHaveLength(2);
      expect(spans[0].textContent).toBe("First");
      expect(spans[1].textContent).toBe("Second");
    });

    it("should remove elements when array shrinks", () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-value="item.text"></span>
        </div>
      `;

      const viewModel = {
        items: [{ text: "First" }, { text: "Second" }, { text: "Third" }],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      expect(container.querySelectorAll("span")).toHaveLength(3);

      viewModel.items.pop();
      renderForEachBindings(bindings, viewModel);

      const spans = container.querySelectorAll("span");
      expect(spans).toHaveLength(2);
      expect(spans[0].textContent).toBe("First");
      expect(spans[1].textContent).toBe("Second");
    });

    it("should handle empty arrays", () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-value="item.text"></span>
        </div>
      `;

      const viewModel = { items: [] as Array<{ text: string }> };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      expect(container.querySelectorAll("span")).toHaveLength(0);
    });

    it("should access nested item properties", () => {
      container.innerHTML = `
        <div for-each="user of users">
          <span bind-value="user.profile.email"></span>
        </div>
      `;

      const viewModel = {
        users: [
          { profile: { email: "alice@test.com" } },
          { profile: { email: "bob@test.com" } },
        ],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const spans = container.querySelectorAll("span");
      expect(spans[0].textContent).toBe("alice@test.com");
      expect(spans[1].textContent).toBe("bob@test.com");
    });

    it("should support nested bindings like bind-if", () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span if="item.visible" bind-value="item.text"></span>
        </div>
      `;

      const viewModel = {
        items: [
          { text: "Visible", visible: true },
          { text: "Hidden", visible: false },
        ],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const spans = container.querySelectorAll("span");
      expect(spans[0].style.display).not.toBe("none");
      expect(spans[1].style.display).toBe("none");
    });

    it("should update existing elements when items change", () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-value="item.text"></span>
        </div>
      `;

      const viewModel = {
        items: [{ text: "Initial" }],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      viewModel.items[0].text = "Updated";
      renderForEachBindings(bindings, viewModel);

      const span = container.querySelector("span");
      expect(span?.textContent).toBe("Updated");
    });

    it("should handle list items", () => {
      container.innerHTML = `
        <ul>
          <li for-each="tipo of tipos">
            <span bind-value="tipo.descripcion"></span>
          </li>
        </ul>
      `;

      const viewModel = {
        tipos: [
          { descripcion: "Tipo A", value: 1 },
          { descripcion: "Tipo B", value: 2 },
        ],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const listItems = container.querySelectorAll("li");
      expect(listItems).toHaveLength(2);
      expect(listItems[0].querySelector("span")?.textContent).toBe("Tipo A");
      expect(listItems[1].querySelector("span")?.textContent).toBe("Tipo B");
    });

    it("should handle table rows", () => {
      container.innerHTML = `
        <table>
          <tbody>
            <tr for-each="user of users">
              <td bind-value="user.id"></td>
              <td bind-value="user.name"></td>
            </tr>
          </tbody>
        </table>
      `;

      const viewModel = {
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const rows = container.querySelectorAll("tr");
      expect(rows).toHaveLength(2);

      const firstRowCells = rows[0].querySelectorAll("td");
      expect(firstRowCells[0].textContent).toBe("1");
      expect(firstRowCells[1].textContent).toBe("Alice");
    });

    it("should access parent viewModel properties", () => {
      container.innerHTML = `
        <div for-each="item of items">
          <span bind-value="prefix"></span>
          <span bind-value="item.text"></span>
        </div>
      `;

      const viewModel = {
        prefix: "Item:",
        items: [{ text: "First" }, { text: "Second" }],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const divs = container.querySelectorAll("div");
      expect(divs[0].querySelectorAll("span")[0].textContent).toBe("Item:");
      expect(divs[0].querySelectorAll("span")[1].textContent).toBe("First");
      expect(divs[1].querySelectorAll("span")[0].textContent).toBe("Item:");
      expect(divs[1].querySelectorAll("span")[1].textContent).toBe("Second");
    });

    it("should support if binding on same element as for-each", () => {
      container.innerHTML = `
        <ul>
          <li for-each="item of items" if="item.visible">
            <span bind-value="item.text"></span>
          </li>
        </ul>
      `;

      const viewModel = {
        items: [
          { text: "Visible", visible: true },
          { text: "Hidden", visible: false },
          { text: "Also Visible", visible: true },
        ],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const listItems = container.querySelectorAll("li");
      expect(listItems).toHaveLength(3);
      expect(listItems[0].style.display).not.toBe("none");
      expect(listItems[1].style.display).toBe("none");
      expect(listItems[2].style.display).not.toBe("none");
    });

    it("should support bind-value on same element as for-each", () => {
      container.innerHTML = `
        <select>
          <option for-each="tipo of tipos" bind-value="tipo.descripcion"></option>
        </select>
      `;

      const viewModel = {
        tipos: [
          { descripcion: "Tipo A", value: 1 },
          { descripcion: "Tipo B", value: 2 },
          { descripcion: "Tipo C", value: 3 },
        ],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const options = container.querySelectorAll("option");
      expect(options).toHaveLength(3);
      expect(options[0].textContent).toBe("Tipo A");
      expect(options[1].textContent).toBe("Tipo B");
      expect(options[2].textContent).toBe("Tipo C");
    });

    it("should support multiple bindings on same element as for-each", () => {
      container.innerHTML = `
        <div>
          <span for-each="item of items" if="item.visible" bind-value="item.text" bind-class="item.className"></span>
        </div>
      `;

      const viewModel = {
        items: [
          { text: "First", visible: true, className: "highlight" },
          { text: "Second", visible: false, className: "normal" },
          { text: "Third", visible: true, className: "highlight" },
        ],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const spans = container.querySelectorAll("span");
      expect(spans).toHaveLength(3);
      
      expect(spans[0].style.display).not.toBe("none");
      expect(spans[0].textContent).toBe("First");
      expect(spans[0].className).toBe("highlight");

      expect(spans[1].style.display).toBe("none");
      expect(spans[1].textContent).toBe("Second");

      expect(spans[2].style.display).not.toBe("none");
      expect(spans[2].textContent).toBe("Third");
      expect(spans[2].className).toBe("highlight");
    });

    it("should work with select and option elements", () => {
      container.innerHTML = `
        <select>
          <option for-each="tipo of tipos" bind-value="tipo.descripcion"></option>
        </select>
      `;

      const viewModel = {
        tipos: [
          { descripcion: "Opción 1" },
          { descripcion: "Opción 2" },
          { descripcion: "Opción 3" },
        ],
      };

      const bindings = setupForEachBindings(container, viewModel);
      renderForEachBindings(bindings, viewModel);

      const select = container.querySelector("select");
      const options = select?.querySelectorAll("option");
      
      expect(options).toBeDefined();
      expect(options?.length).toBe(3);
      expect(options?.[0].textContent).toBe("Opción 1");
      expect(options?.[1].textContent).toBe("Opción 2");
      expect(options?.[2].textContent).toBe("Opción 3");
    });
  });
});

