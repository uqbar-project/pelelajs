export type ViewModel<T extends object = object> = T & {
  [key: string]: unknown;
};

export type ValueBinding = {
  element: HTMLElement;
  propertyName: string;
  isInput: boolean;
};

export type IfBinding = {
  element: HTMLElement;
  propertyName: string;
  originalDisplay: string;
};

export type ClassBinding = {
  element: HTMLElement;
  propertyName: string;
  staticClassName: string;
};

export type StyleBinding = {
  element: HTMLElement;
  propertyName: string;
};

export type BindingsCollection = {
  valueBindings: ValueBinding[];
  ifBindings: IfBinding[];
  classBindings: ClassBinding[];
  styleBindings: StyleBinding[];
};

