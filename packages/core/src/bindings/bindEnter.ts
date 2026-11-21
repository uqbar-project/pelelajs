import { WrongElementForBindingError } from '../errors'
import { createEventBindingSetup } from './setupEventBindings'

export const setupEnterBindings = createEventBindingSetup<KeyboardEvent>({
  bindingName: 'enter',
  domEventName: 'keydown',
  debugLabel: 'ENTER',
  validateElement: (element) => {
    if (element.tagName !== 'INPUT') {
      throw new WrongElementForBindingError('enter', element, 'errors.compiler.enterOnlyForInput')
    }
  },
  shouldHandleEvent: (event) => event.key === 'Enter',
})
