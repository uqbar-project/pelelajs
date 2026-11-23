import { createEventBindingSetup } from './setupEventBindings'

export const setupClickBindings = createEventBindingSetup<MouseEvent>({
  bindingName: 'click',
  domEventName: 'click',
  debugLabel: 'CLICK',
})
