import { describe, it, expect, beforeEach } from "vitest";
import { registerViewModel, getViewModel, hasViewModel } from "./viewModelRegistry";

class TestViewModel {
  value = 0;
}

class AnotherViewModel {
  text = "";
}

describe("viewModelRegistry", () => {
  describe("registerViewModel", () => {
    it("should register a new view model", () => {
      registerViewModel("Test", TestViewModel);

      expect(hasViewModel("Test")).toBe(true);
    });

    it("should throw error if trying to register a duplicate name", () => {
      registerViewModel("Duplicate", TestViewModel);

      expect(() => {
        registerViewModel("Duplicate", AnotherViewModel);
      }).toThrow('[pelela] View model "Duplicate" is already registered');
    });

    it("should allow registering multiple view models with different names", () => {
      registerViewModel("First", TestViewModel);
      registerViewModel("Second", AnotherViewModel);

      expect(hasViewModel("First")).toBe(true);
      expect(hasViewModel("Second")).toBe(true);
    });
  });

  describe("getViewModel", () => {
    it("should return the registered constructor", () => {
      registerViewModel("GetTest", TestViewModel);

      const ctor = getViewModel("GetTest");

      expect(ctor).toBe(TestViewModel);
    });

    it("should return undefined for unregistered names", () => {
      const ctor = getViewModel("NonExistent");

      expect(ctor).toBeUndefined();
    });

    it("should allow instantiating the returned constructor", () => {
      registerViewModel("Instantiable", TestViewModel);

      const ctor = getViewModel("Instantiable");
      const instance = ctor ? new ctor() : null;

      expect(instance).toBeInstanceOf(TestViewModel);
      expect(instance).toHaveProperty("value", 0);
    });
  });

  describe("hasViewModel", () => {
    it("should return true for registered view models", () => {
      registerViewModel("Exists", TestViewModel);

      expect(hasViewModel("Exists")).toBe(true);
    });

    it("should return false for unregistered view models", () => {
      expect(hasViewModel("DoesNotExist")).toBe(false);
    });
  });
});