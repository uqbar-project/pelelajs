const ARRAY_MUTATION_METHODS = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
] as const;

function wrapArrayMethods<T>(array: T[], onChange: () => void): T[] {
  const wrappedArray = array;

  for (const method of ARRAY_MUTATION_METHODS) {
    const original = Array.prototype[method] as any;
    Object.defineProperty(wrappedArray, method, {
      value: function (this: T[], ...args: any[]) {
        const result = original.apply(this, args);
        onChange();
        return result;
      },
      writable: true,
      configurable: true,
    });
  }

  return wrappedArray;
}

export function createReactiveViewModel<T extends object>(
  target: T,
  onChange: () => void,
): T {
  const handler: ProxyHandler<T> = {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);
      if (Array.isArray(value) && !value.hasOwnProperty("push")) {
        return wrapArrayMethods(value, onChange);
      }
      return value;
    },
    set(obj, prop, value) {
      if (Array.isArray(value)) {
        value = wrapArrayMethods(value, onChange);
      }
      const result = Reflect.set(obj, prop, value);
      onChange();
      return result;
    },
  };

  for (const key in target) {
    if (Array.isArray(target[key])) {
      (target[key] as any) = wrapArrayMethods(target[key] as any, onChange);
    }
  }

  return new Proxy(target, handler);
}

