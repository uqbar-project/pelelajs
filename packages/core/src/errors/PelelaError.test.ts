import { describe, it, expect } from "vitest";
import { PelelaError } from "./PelelaError";
import { PropertyValidationError } from "./PropertyValidationError";

// Concrete test class since PelelaError is abstract
class TestPelelaError extends PelelaError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

describe("PelelaError", () => {
  describe("basic error creation", () => {
    it("should create error without cause", () => {
      const error = new TestPelelaError("Test error message");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PelelaError);
      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("TestPelelaError");
      expect(error.cause).toBeUndefined();
    });

    it("should set correct name from constructor", () => {
      const error = new PropertyValidationError(
        "myProp",
        "bind-value",
        "TestVM",
        "<div>"
      );

      expect(error.name).toBe("PropertyValidationError");
    });

    it("should have a stack trace", () => {
      const error = new TestPelelaError("Test error");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("TestPelelaError");
    });
  });

  describe("error wrapping with cause", () => {
    it("should preserve original error as cause", () => {
      const originalError = new Error("Original error");
      const wrappedError = new TestPelelaError("Wrapped error", {
        cause: originalError,
      });

      expect(wrappedError.cause).toBe(originalError);
      expect(wrappedError.message).toBe("Wrapped error");
    });

    it("should work with PropertyValidationError and cause", () => {
      const originalError = new TypeError("Property access failed");
      const validationError = new PropertyValidationError(
        "myProp",
        "bind-value",
        "TestVM",
        "<div>",
        { cause: originalError }
      );

      expect(validationError.cause).toBe(originalError);
      expect(validationError.propertyName).toBe("myProp");
      expect(validationError.message).toContain("myProp");
    });

    it("should preserve cause through error chain", () => {
      const rootError = new Error("Root cause");
      const middleError = new TestPelelaError("Middle error", {
        cause: rootError,
      });
      const topError = new TestPelelaError("Top error", { cause: middleError });

      expect(topError.cause).toBe(middleError);
      expect((topError.cause as Error).cause).toBe(rootError);
    });

    it("should allow undefined cause explicitly", () => {
      const error = new TestPelelaError("Test error", { cause: undefined });

      expect(error.cause).toBeUndefined();
    });
  });

  describe("error wrapping use case example", () => {
    it("should demonstrate typical error wrapping scenario", () => {
      // Simula un escenario real donde envolvemos un error
      function riskyOperation() {
        throw new Error("Network timeout");
      }

      function processData() {
        try {
          riskyOperation();
        } catch (error) {
          throw new PropertyValidationError(
            "data",
            "bind-value",
            "DataViewModel",
            "<div>",
            { cause: error instanceof Error ? error : undefined }
          );
        }
      }

      expect(() => processData()).toThrow(PropertyValidationError);

      try {
        processData();
      } catch (error) {
        expect(error).toBeInstanceOf(PropertyValidationError);
        if (error instanceof PropertyValidationError) {
          expect(error.cause).toBeDefined();
          expect((error.cause as Error).message).toBe("Network timeout");
        }
      }
    });
  });

  describe("instanceof checks", () => {
    it("should pass instanceof checks for Error", () => {
      const error = new TestPelelaError("Test");
      expect(error instanceof Error).toBe(true);
    });

    it("should pass instanceof checks for PelelaError", () => {
      const error = new TestPelelaError("Test");
      expect(error instanceof PelelaError).toBe(true);
    });

    it("should pass instanceof checks for specific error type", () => {
      const error = new PropertyValidationError(
        "prop",
        "bind-value",
        "VM",
        "<div>"
      );
      expect(error instanceof Error).toBe(true);
      expect(error instanceof PelelaError).toBe(true);
      expect(error instanceof PropertyValidationError).toBe(true);
    });
  });
});
