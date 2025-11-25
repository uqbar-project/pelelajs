import { describe, it, expect, vi } from "vitest";
import { createReactiveViewModel } from "./reactiveProxy";

describe("reactiveProxy", () => {
  describe("createReactiveViewModel", () => {
    it("should create a reactive proxy of the object", () => {
      const target = { count: 0 };
      const onChange = vi.fn();
      const proxy = createReactiveViewModel(target, onChange);

      expect(proxy.count).toBe(0);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("should call onChange when a property is modified", () => {
      const target = { count: 0 };
      const onChange = vi.fn();
      const proxy = createReactiveViewModel(target, onChange);

      proxy.count = 5;

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(proxy.count).toBe(5);
    });

    it("should call onChange multiple times for multiple changes", () => {
      const target = { count: 0, name: "" };
      const onChange = vi.fn();
      const proxy = createReactiveViewModel(target, onChange);

      proxy.count = 1;
      proxy.count = 2;
      proxy.name = "test";

      expect(onChange).toHaveBeenCalledTimes(3);
    });

    it("should allow adding new properties", () => {
      const target: any = { count: 0 };
      const onChange = vi.fn();
      const proxy = createReactiveViewModel(target, onChange);

      proxy.newProp = "new";

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(proxy.newProp).toBe("new");
    });

    it("should handle nested objects", () => {
      const target = { user: { name: "John", age: 30 } };
      const onChange = vi.fn();
      const proxy = createReactiveViewModel(target, onChange);

      proxy.user = { name: "Jane", age: 25 };

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(proxy.user.name).toBe("Jane");
    });

    it("should preserve the type of assigned value", () => {
      const target = { count: 0, flag: false, text: "" };
      const onChange = vi.fn();
      const proxy = createReactiveViewModel(target, onChange);

      proxy.count = 42;
      proxy.flag = true;
      proxy.text = "hello";

      expect(typeof proxy.count).toBe("number");
      expect(typeof proxy.flag).toBe("boolean");
      expect(typeof proxy.text).toBe("string");
    });
  });
});