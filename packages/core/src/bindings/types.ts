export type ViewModel<T extends object = object> = T & {
  initialize?: () => void | Promise<void>
  [key: string]: unknown
}

export type EventHandler<E extends Event = Event> = (viewModel: unknown, event?: E) => void

export type ClickHandler = EventHandler<MouseEvent>

export type ValueBinding = {
  element: HTMLElement
  propertyName: string
}

export type ContentBinding = {
  element: HTMLElement
  propertyName: string
}

export type SrcBinding = {
  element: HTMLImageElement
  propertyName: string
}

export type AltBinding = {
  element: HTMLImageElement
  propertyName: string
}

export type EnabledBinding = {
  element:
    | HTMLInputElement
    | HTMLButtonElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | HTMLOptGroupElement
    | HTMLOptionElement
    | HTMLFieldSetElement
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
  indexName: string | null
  template: HTMLElement
  placeholder: Comment
  renderedElements: {
    element: HTMLElement
    viewModel: ViewModel
    itemRef: { current: unknown }
    indexRef: { current: number }
    render: () => void
  }[]
  previousLength: number
  extraDependencies: string[]
}

export type ComponentBinding = {
  childViewModel: ViewModel
  mappings: Array<{ parentKey: string; childKey: string }>
  renderChild?: (changedPath?: string) => void
}

export type BindingsCollection = {
  valueBindings: ValueBinding[]
  contentBindings: ContentBinding[]
  srcBindings: SrcBinding[]
  altBindings: AltBinding[]
  enabledBindings: EnabledBinding[]
  ifBindings: IfBinding[]
  classBindings: ClassBinding[]
  styleBindings: StyleBinding[]
  forEachBindings: ForEachBinding[]
  componentBindings: ComponentBinding[]
}
