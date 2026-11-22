import type { BindingLists, BindingsCollection, RenderFunction } from './types'

export const bindingListKeys: Array<keyof BindingLists> = [
  'valueBindings',
  'contentBindings',
  'srcBindings',
  'altBindings',
  'enabledBindings',
  'ifBindings',
  'classBindings',
  'styleBindings',
  'forEachBindings',
  'componentBindings',
]

/**
 * Listener teardown lives on the collection so callers do not need to know
 * which binding kinds hold listeners.
 */
export function createBindingsCollection(
  lists: BindingLists,
  removeEventListeners: Array<() => void>,
): BindingsCollection {
  return {
    ...lists,
    removeListeners: () => {
      removeEventListeners.forEach((removeListener) => {
        removeListener()
      })
      lists.valueBindings.forEach(({ removeListener }) => {
        removeListener?.()
      })
      lists.componentBindings.forEach(({ renderChild }) => {
        const childRender = renderChild as RenderFunction | undefined
        childRender?.destroy()
      })
      lists.forEachBindings.forEach((binding) => {
        binding.renderedElements.forEach(({ destroy }) => {
          destroy()
        })
      })
    },
  }
}
