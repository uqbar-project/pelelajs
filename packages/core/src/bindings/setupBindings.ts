import { isDebugEnabled } from '../commons/debugState'
import { t } from '../commons/i18n'

const style = {
  brand: 'color: #a78bfa; font-weight: 700',
  state: 'color: #27aa76; font-weight: 700',
  muted: 'color: #8893a4',
  reset: 'color: inherit; font-weight: normal',
}

import { describeElement, findAllElements } from '../commons/helpers'
import { assertValidBindingAttribute } from '../validation/assertValidBindingAttribute'
import { renderAltBindings, setupAltBindings } from './bindAlt'
import { renderClassBindings, setupClassBindings } from './bindClass'
import { setupClickBindings } from './bindClick'
import { renderComponentBindings, setupComponentBindings } from './bindComponent'
import { renderContentBindings, setupContentBindings } from './bindContent'
import { renderEnabledBindings, setupEnabledBindings } from './bindEnabled'
import { setupEnterBindings } from './bindEnter'
import { renderForEachBindings, setupForEachBindings } from './bindForEach'
import { renderIfBindings, setupIfBindings } from './bindIf'
import { renderSrcBindings, setupSrcBindings } from './bindSrc'
import { renderStyleBindings, setupStyleBindings } from './bindStyle'
import { renderValueBindings, setupValueBindings } from './bindValue'
import { DependencyTracker } from './dependencyTracker'
import type {
  AltBinding,
  BindingsCollection,
  ClassBinding,
  ComponentBinding,
  ContentBinding,
  EnabledBinding,
  ForEachBinding,
  IfBinding,
  NotifyParent,
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
  | AltBinding
  | EnabledBinding
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
      list: bindings.altBindings,
      getPath: (binding) => (binding as AltBinding).propertyName,
    },
    {
      list: bindings.enabledBindings,
      getPath: (binding) => (binding as EnabledBinding).propertyName,
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

  bindings.forEachBindings.forEach((binding) => {
    if (binding.hasMethodBindings) tracker.markAsGetterBinding(binding)
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
      render: () => renderForEachBindings(targetBindings.forEachBindings, viewModel, changedPath),
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
      condition: () => targetBindings.altBindings.length > 0,
      render: () => renderAltBindings(targetBindings.altBindings, viewModel),
    },
    {
      condition: () => targetBindings.enabledBindings.length > 0,
      render: () => renderEnabledBindings(targetBindings.enabledBindings, viewModel),
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

type BindingEntry = { element: HTMLElement | null; kind: string; property: string }

function getValueByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, part) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

function collectBindingEntries(bindings: BindingsCollection): BindingEntry[] {
  const entries: BindingEntry[] = []
  bindings.valueBindings.forEach((binding) => {
    entries.push({ element: binding.element, kind: 'value', property: binding.propertyName })
  })
  bindings.contentBindings.forEach((binding) => {
    entries.push({ element: binding.element, kind: 'content', property: binding.propertyName })
  })
  bindings.srcBindings.forEach((binding) => {
    entries.push({ element: binding.element, kind: 'src', property: binding.propertyName })
  })
  bindings.altBindings.forEach((binding) => {
    entries.push({ element: binding.element, kind: 'alt', property: binding.propertyName })
  })
  bindings.enabledBindings.forEach((binding) => {
    entries.push({ element: binding.element, kind: 'enabled', property: binding.propertyName })
  })
  bindings.ifBindings.forEach((binding) => {
    entries.push({ element: binding.element, kind: 'if', property: binding.propertyName })
  })
  bindings.classBindings.forEach((binding) => {
    entries.push({ element: binding.element, kind: 'class', property: binding.propertyName })
  })
  bindings.styleBindings.forEach((binding) => {
    entries.push({ element: binding.element, kind: 'style', property: binding.propertyName })
  })
  bindings.forEachBindings.forEach((binding) => {
    entries.push({ element: binding.template, kind: 'forEach', property: binding.collectionName })
  })
  bindings.componentBindings.forEach((binding) => {
    entries.push({
      element: null,
      kind: 'component',
      property: binding.mappings.map((mapping) => mapping.parentKey).join(', '),
    })
  })
  return entries
}

export function setupBindings<T extends object>(
  root: HTMLElement,
  viewModel: ViewModel<T>,
  {
    skipRootIf = false,
    notifyParent,
    debug,
  }: { skipRootIf?: boolean; notifyParent?: NotifyParent; debug?: boolean } = {},
): (changedPath?: string) => void {
  const allElements = findAllElements(root, '*', true)
  for (const element of allElements) {
    for (const attr of element.attributes) {
      assertValidBindingAttribute(attr.name, element)
    }
  }

  const renderRef: { current?: (changedPath?: string) => void } = {}
  const forwardToRender = notifyParent ?? ((path: string) => renderRef.current?.(path))

  const bindings: BindingsCollection = {
    forEachBindings: setupForEachBindings(root, viewModel, forwardToRender),
    componentBindings: setupComponentBindings(root, viewModel, forwardToRender),
    valueBindings: setupValueBindings(root, viewModel),
    contentBindings: setupContentBindings(root, viewModel),
    srcBindings: setupSrcBindings(root, viewModel),
    altBindings: setupAltBindings(root, viewModel),
    enabledBindings: setupEnabledBindings(root, viewModel),
    ifBindings: setupIfBindings(root, viewModel, skipRootIf),
    classBindings: setupClassBindings(root, viewModel),
    styleBindings: setupStyleBindings(root, viewModel),
  }

  setupClickBindings(root, viewModel, { debug })
  setupEnterBindings(root, viewModel, { debug })

  const tracker = new DependencyTracker()
  registerAllBindingDependencies(bindings, tracker, viewModel)

  const isDebug = debug || isDebugEnabled()
  const bindingEntries = collectBindingEntries(bindings)

  if (isDebug) {
    console.groupCollapsed(
      `%c[pelela]%c  ⚙  ${t('debug.bindingsRegistered', { count: bindingEntries.length })}`,
      style.brand,
      style.reset,
    )
  }
  if (isDebug) {
    bindingEntries.forEach((entry) => {
      console.log(
        '%c  ↳%c %s  ·  %s → %s',
        style.muted,
        style.reset,
        describeElement(entry.element),
        entry.kind,
        entry.property,
      )
    })
  }
  if (isDebug) {
    console.groupEnd()
  }

  if (isDebug) {
    try {
      console.log('%c[pelela]%c  Estado inicial:', style.brand, style.reset, viewModel)
    } catch {
      // viewModel may contain non-loggable values in jsdom; ignore
    }
  }

  const previousValues = new Map<string, unknown>()
  Object.keys(viewModel as Record<string, unknown>).forEach((key) => {
    previousValues.set(key, (viewModel as Record<string, unknown>)[key])
  })

  const debugLogStateChange = (options: {
    changedPath: string
    changedValue: unknown
    previousValue: unknown
    affectedEntries: BindingEntry[]
    elements: string[]
    properties: string[]
  }) => {
    const { changedPath, changedValue, previousValue, affectedEntries, elements, properties } =
      options
    if (!(isDebug || isDebugEnabled())) return
    const hasChanged = !Object.is(previousValue, changedValue)
    try {
      if (hasChanged) {
        console.groupCollapsed(
          '%c  ◆ STATE%c %s %c(%d bindings)',
          style.state,
          style.reset,
          changedPath,
          style.muted,
          affectedEntries.length,
        )
        if (previousValue === undefined) {
          console.log('%c    ↳ initialized to', style.muted, changedValue)
        } else {
          console.log('%c    ↳ previous', style.muted, previousValue)
          console.log('%c    ↳ changed ', style.muted, changedValue)
        }
        console.log('%c    ↳%c notified to %s', style.muted, style.reset, elements.join(', '))
        console.log('%c    ↳%c bindings: %s', style.muted, style.reset, properties.join(', '))
        console.groupEnd()
      } else {
        console.log(
          '%c  ◆ STATE%c %s %c(unchanged, reconciled · %d bindings)',
          style.state,
          style.reset,
          changedPath,
          style.muted,
          affectedEntries.length,
        )
      }
    } catch {
      // Debug logging must not interrupt binding updates.
    }
  }

  const handleChangedPath = (changedPath: string, targetBindings: BindingsCollection) => {
    if (!(debug || isDebugEnabled())) return

    const changedValue = getValueByPath(viewModel, changedPath)
    const affectedEntries = collectBindingEntries(targetBindings)
    if (affectedEntries.length > 0) {
      const elements = [...new Set(affectedEntries.map((entry) => describeElement(entry.element)))]
      const properties = [
        ...new Set(affectedEntries.map((entry) => `${entry.kind}:${entry.property}`)),
      ]
      const previousValue = previousValues.get(changedPath)
      debugLogStateChange({
        changedPath,
        changedValue,
        previousValue,
        affectedEntries,
        elements,
        properties,
      })
    }
    previousValues.set(changedPath, changedValue)
  }

  const render = (changedPath?: string) => {
    const targetBindings = changedPath
      ? tracker.getDependentBindingsWithGetterSupport(changedPath, bindings)
      : bindings

    if (changedPath) {
      handleChangedPath(changedPath, targetBindings)
    }

    executeRenderPipeline(targetBindings, viewModel, changedPath)
  }

  renderRef.current = render

  render()
  return render
}
