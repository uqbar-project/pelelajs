export type ViewModelConstructor<T = unknown> = {
  new (): T;
};

export type PelelaOptions = {
  document?: Document;
  root?: ParentNode;
};

