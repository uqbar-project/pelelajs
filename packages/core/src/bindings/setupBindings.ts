import { renderClassBindings, setupClassBindings } from './bindClass'
import { setupClickBindings } from './bindClick'
import { renderContentBindings, setupContentBindings } from './bindContent'
import { renderForEachBindings, setupForEachBindings } from './bindForEach'
import { renderIfBindings, setupIfBindings } from './bindIf'
import { renderStyleBindings, setupStyleBindings } from './bindStyle'
import { renderValueBindings, setupValueBindings } from './bindValue'
import { DependencyTracker } from './dependencyTracker'
import type {
  BindingsCollection,
  ClassBinding,
  ContentBinding,
  ForEachBinding,
  IfBinding,
  StyleBinding,
  ValueBinding,
  ViewModel,
} from './types'

type AnyBinding =
  | ForEachBinding
  | ValueBinding
  | ContentBinding
  | IfBinding
  | ClassBinding
  | StyleBinding

function registerAllBindingDependencies(
  bindings: BindingsCollection,
  tracker: DependencyTracker,
  viewModel: ViewModel<object>,
): void {
  const bindingConfigurations: Array<{
    list: AnyBinding[]
    getPath: (binding: AnyBinding) => string
  }> = [
    {
      list: bindings.forEachBindings,
      getPath: (binding) => (binding as ForEachBinding).collectionName,
    },
    {
      list: bindings.valueBindings,
      getPath: (binding) => (binding as ValueBinding).propertyName,
    },
    {
      list: bindings.contentBindings,
      getPath: (binding) => (binding as ContentBinding).propertyName,
    },
    {
      list: bindings.ifBindings,
      getPath: (binding) => (binding as IfBinding).propertyName,
    },
    {
      list: bindings.classBindings,
      getPath: (binding) => (binding as ClassBinding).propertyName,
    },
    {
      list: bindings.styleBindings,
      getPath: (binding) => (binding as StyleBinding).propertyName,
    },
  ]

  bindingConfigurations.forEach((config) => {
    config.list.forEach((binding) => {
      tracker.registerDependency(binding, config.getPath(binding), viewModel)
    })
  })
}

function executeRenderPipeline<T extends object>(
  targetBindings: BindingsCollection,
  viewModel: ViewModel<T>,
): void {
  const renderActions: Array<{
    condition: () => boolean
    render: () => void
  }> = [
    {
      condition: () => targetBindings.forEachBindings.length > 0,
      render: () => renderForEachBindings(targetBindings.forEachBindings, viewModel),
    },
    {
      condition: () => targetBindings.valueBindings.length > 0,
      render: () => renderValueBindings(targetBindings.valueBindings, viewModel),
    },
    {
      condition: () => targetBindings.contentBindings.length > 0,
      render: () => renderContentBindings(targetBindings.contentBindings, viewModel),
    },
    {
      condition: () => targetBindings.ifBindings.length > 0,
      render: () => renderIfBindings(targetBindings.ifBindings, viewModel),
    },
    {
      condition: () => targetBindings.classBindings.length > 0,
      render: () => renderClassBindings(targetBindings.classBindings, viewModel),
    },
    {
      condition: () => targetBindings.styleBindings.length > 0,
      render: () => renderStyleBindings(targetBindings.styleBindings, viewModel),
    },
  ]

  renderActions
    .filter((action) => action.condition())
    .forEach((action) => {
      action.render()
    })
}

export function setupBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
): (changedPath?: string) => void {
  const bindings: BindingsCollection = {
    forEachBindings: setupForEachBindings(root, viewModel),
    valueBindings: setupValueBindings(root, viewModel),
    contentBindings: setupContentBindings(root, viewModel),
    ifBindings: setupIfBindings(root, viewModel),
    classBindings: setupClassBindings(root, viewModel),
    styleBindings: setupStyleBindings(root, viewModel),
  }

  setupClickBindings(root, viewModel)

  const tracker = new DependencyTracker()
  registerAllBindingDependencies(bindings, tracker, viewModel)

  const render = (changedPath?: string) => {
    const targetBindings = changedPath
      ? tracker.getDependentBindingsWithGetterSupport(changedPath, bindings)
      : bindings

    executeRenderPipeline(targetBindings, viewModel)
  }

  render()
  return render
}
