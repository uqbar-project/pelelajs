import { setupBindings } from '../../../packages/core/src/bindings/setupBindings'
import { createReactiveViewModel } from '../../../packages/core/src/reactivity/reactiveProxy'
import { defineComponent } from '../../../packages/core/src/registry/componentRegistry'
import { COMPARISON_ROW_COUNT, createRows, type Row } from './rows'

class RowViewModel {
  row!: Row
}

defineComponent(
  'RowComponent',
  RowViewModel,
  `<component view-model="RowViewModel">
    <input bind-value="row.value" />
    <span class="value" bind-content="row.value"></span>
    <span class="offset" bind-content="row.offset"></span>
    <span class="color" bind-class="row.colorClass"></span>
  </component>`,
)

type GridState = {
  rows: Row[]
}

const root = document.getElementById('app')
if (!root) throw new Error('Performance fixture root is missing')

const componentMarkup = Array.from(
  { length: COMPARISON_ROW_COUNT },
  (_, index) =>
    `<div data-testid="row-${index}"><row-component prop-row="rows.${index}"></row-component></div>`,
).join('')

root.innerHTML = `<div class="grid">${componentMarkup}</div>`

const state: GridState = { rows: createRows(COMPARISON_ROW_COUNT) }
let render: (changedPath?: string) => void = () => {}
const reactiveState = createReactiveViewModel(state, (changedPath) => render(changedPath))
performance.mark('pelela-setup-start')
render = setupBindings(root, reactiveState)
performance.mark('pelela-ready')
