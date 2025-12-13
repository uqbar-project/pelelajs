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
