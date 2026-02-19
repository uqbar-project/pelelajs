export type ViewModelConstructor<T = unknown> = {
  new (): T
}

export type PelelaOptions = {
  document?: Document
  root?: ParentNode
}

export interface PelelaElement<T = object> extends HTMLElement {
  __pelelaViewModel: T
}

export type ComponentConfig = {
  viewModelName: string
  viewModelConstructor: ViewModelConstructor
  template: string
}

export type ComponentProps = {
  unidirectional: Record<string, any>
  bidirectional: Record<string, string>
}
