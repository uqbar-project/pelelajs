const ARRAY_MUTATION_METHODS = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
] as const;

const proxyCache = new WeakMap<object, any>();
const rawObjectCache = new WeakMap<object, any>();

function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

function makeReactive(
  target: any,
  onChange: () => void,
  visited = new WeakSet<object>(),
): any {
  if (!isObject(target)) {
    return target;
  }

  if (proxyCache.has(target)) {
    return proxyCache.get(target);
  }

  if (visited.has(target)) {
    return target;
  }

  visited.add(target);

  const isArray = Array.isArray(target);

  const handler: ProxyHandler<any> = {
    get(obj, prop) {
      if (prop === "$raw") {
        return obj;
      }

      if (prop === "$set") {
        return (target: any, key: PropertyKey, value: any) => {
          const reactive = makeReactive(value, onChange, new WeakSet());
          target[key] = reactive;
          onChange();
        };
      }

      if (prop === "$delete") {
        return (target: any, key: PropertyKey) => {
          delete target[key];
          onChange();
        };
      }

      const value = Reflect.get(obj, prop);

      if (isArray && ARRAY_MUTATION_METHODS.includes(prop as any)) {
        return function (this: any, ...args: any[]) {
          const reactiveArgs = args.map((arg) => 
            isObject(arg) ? makeReactive(arg, onChange, new WeakSet()) : arg
          );
          const result = Array.prototype[prop as any].apply(this, reactiveArgs);
          onChange();
          return result;
        };
      }

      if (isObject(value)) {
        const newVisited = new WeakSet<object>();
        newVisited.add(target);
        return makeReactive(value, onChange, newVisited);
      }

      return value;
    },

    set(obj, prop, value) {
      const oldValue = obj[prop];

      if (oldValue === value) {
        return true;
      }

      const reactiveValue = isObject(value)
        ? makeReactive(value, onChange, new WeakSet())
        : value;

      const result = Reflect.set(obj, prop, reactiveValue);

      if (result) {
        onChange();
      }

      return result;
    },

    deleteProperty(obj, prop) {
      const hadProperty = prop in obj;
      const result = Reflect.deleteProperty(obj, prop);

      if (result && hadProperty) {
        onChange();
      }

      return result;
    },
  };

  const proxy = new Proxy(target, handler);
  proxyCache.set(target, proxy);
  rawObjectCache.set(proxy, target);

  return proxy;
}

export function createReactiveViewModel<T extends object>(
  target: T,
  onChange: () => void,
): T {
  return makeReactive(target, onChange);
}
