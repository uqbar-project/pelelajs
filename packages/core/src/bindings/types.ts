export type ViewModel<T extends object = object> = T & {
  [key: string]: unknown
}

export type ValueBinding = {
  element: HTMLElement
  propertyName: string
}

export type ContentBinding = {
  element: HTMLElement
  propertyName: string
}

export type IfBinding = {
  element: HTMLElement
  propertyName: string
  originalDisplay: string
}

export type ClassBinding = {
  element: HTMLElement
  propertyName: string
  staticClassName: string
}

export type StyleBinding = {
  element: HTMLElement
  propertyName: string
}

export type ForEachBinding = {
  collectionName: string
  itemName: string
  template: HTMLElement
  placeholder: Comment
  renderedElements: {
    element: HTMLElement
    viewModel: ViewModel
    itemRef: { current: unknown }
    render: () => void
  }[]
  previousLength: number
  extraDependencies: string[]
}

export type ComponentBinding = {
  childViewModel: ViewModel
  mappings: Array<{ parentKey: string; childKey: string }>
}

export type BindingsCollection = {
  valueBindings: ValueBinding[]
  contentBindings: ContentBinding[]
  ifBindings: IfBinding[]
  classBindings: ClassBinding[]
  styleBindings: StyleBinding[]
  forEachBindings: ForEachBinding[]
  componentBindings: ComponentBinding[]
}
