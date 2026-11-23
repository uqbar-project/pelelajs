import { setupBindings } from '../../../packages/core/src/bindings/setupBindings'
import { createReactiveViewModel } from '../../../packages/core/src/reactivity/reactiveProxy'
import { COMPARISON_ROW_COUNT, createRows, type Row } from './rows'

type GridState = {
  rows: Row[]
}

const root = document.getElementById('app')
if (!root) throw new Error('Performance fixture root is missing')

root.innerHTML = `
  <div class="grid">
    <div class="row" for-each="row of rows">
      <input bind-value="row.value" />
      <span class="value" bind-content="row.value"></span>
      <span class="offset" bind-content="row.offset"></span>
      <span class="color" bind-class="row.colorClass"></span>
    </div>
  </div>
`

const state: GridState = { rows: createRows(COMPARISON_ROW_COUNT) }
let render: (changedPath?: string) => void = () => {}
const reactiveState = createReactiveViewModel(state, (changedPath) => render(changedPath))
performance.mark('pelela-setup-start')
render = setupBindings(root, reactiveState)
performance.mark('pelela-ready')
