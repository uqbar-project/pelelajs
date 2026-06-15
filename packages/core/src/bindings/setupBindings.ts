import { findAllElements } from '../commons/helpers'
import { assertValidBindingAttribute } from '../validation/assertValidBindingAttribute'
import { renderClassBindings, setupClassBindings } from './bindClass'
import { setupClickBindings } from './bindClick'
import { renderComponentBindings, setupComponentBindings } from './bindComponent'
import { renderContentBindings, setupContentBindings } from './bindContent'
import { renderForEachBindings, setupForEachBindings } from './bindForEach'
import { renderIfBindings, setupIfBindings } from './bindIf'
import { renderSrcBindings, setupSrcBindings } from './bindSrc'
import { renderStyleBindings, setupStyleBindings } from './bindStyle'
import { renderValueBindings, setupValueBindings } from './bindValue'
import { DependencyTracker } from './dependencyTracker'
import type {
  BindingsCollection,
  ClassBinding,
  ComponentBinding,
  ContentBinding,
  ForEachBinding,
  IfBinding,
  SrcBinding,
  StyleBinding,
  ValueBinding,
  ViewModel,
} from './types'

type AnyBinding =
  | ForEachBinding
  | ValueBinding
  | ContentBinding
  | SrcBinding
  | IfBinding
  | ClassBinding
  | StyleBinding
  | ComponentBinding

function registerAllBindingDependencies(
  bindings: BindingsCollection,
  tracker: DependencyTracker,
  viewModel: ViewModel<object>,
): void {
  const bindingConfigurations: Array<{
    list: AnyBinding[]
    getPath: (binding: AnyBinding) => string | string[]
  }> = [
    {
      list: bindings.forEachBindings,
      getPath: (binding) => [
        (binding as ForEachBinding).collectionName,
        ...(binding as ForEachBinding).extraDependencies,
      ],
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
      list: bindings.srcBindings,
      getPath: (binding) => (binding as SrcBinding).propertyName,
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
    {
      list: bindings.componentBindings,
      getPath: (binding) =>
        (binding as ComponentBinding).mappings.map((mapping) => mapping.parentKey),
    },
  ]

  bindingConfigurations.forEach((config) => {
    config.list.forEach((binding) => {
      const paths = config.getPath(binding)
      const pathArray = Array.isArray(paths) ? paths : [paths]
      pathArray.forEach((path) => {
        tracker.registerDependency(binding, path, viewModel)
      })
    })
  })
}

function executeRenderPipeline<T extends object>(
  targetBindings: BindingsCollection,
  viewModel: ViewModel<T>,
  changedPath?: string,
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
      condition: () => targetBindings.srcBindings.length > 0,
      render: () => renderSrcBindings(targetBindings.srcBindings, viewModel),
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
    {
      condition: () => targetBindings.componentBindings.length > 0,
      render: () =>
        renderComponentBindings(targetBindings.componentBindings, viewModel, changedPath),
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
  { skipRootIf = false }: { skipRootIf?: boolean } = {},
): (changedPath?: string) => void {
  const allElements = findAllElements(root, '*', true)
  for (const element of allElements) {
    for (const attr of element.attributes) {
      assertValidBindingAttribute(attr.name, element)
    }
  }

  const bindings: BindingsCollection = {
    forEachBindings: setupForEachBindings(root, viewModel),
    componentBindings: setupComponentBindings(root, viewModel),
    valueBindings: setupValueBindings(root, viewModel),
    contentBindings: setupContentBindings(root, viewModel),
    srcBindings: setupSrcBindings(root, viewModel),
    ifBindings: setupIfBindings(root, viewModel, skipRootIf),
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

    executeRenderPipeline(targetBindings, viewModel, changedPath)
  }

  render()
  return render
}
