export type ValueBinding = {
  element: HTMLElement;
  propertyName: string;
  isInput: boolean;
};

export type VisibleBinding = {
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
  visibleBindings: VisibleBinding[];
  classBindings: ClassBinding[];
  styleBindings: StyleBinding[];
};

