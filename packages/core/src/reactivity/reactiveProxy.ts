export function createReactiveViewModel<T extends object>(
  target: T,
  onChange: () => void,
): T {
  const handler: ProxyHandler<T> = {
    set(obj, prop, value) {
      const result = Reflect.set(obj, prop, value);
      onChange();
      return result;
    },
  };

  return new Proxy(target, handler);
}

