import { initializeI18n, ViewModelExportError } from 'pelelajs'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ResolvedRouteImport } from './validateRouteImports'
import { validateRouteImports } from './validateRouteImports'

const ROUTES_FILE_PATH = '/project/src/routes.ts'
const BASE_TS_PATH = '/project/src/base.ts'
const BASE_VIEW_MODEL = 'Base'
const BASE_ALIAS = 'BaseAlias'
const NAMESPACE_ALIAS = 'baseModule'
const MISSING_VIEW_MODEL = 'Base2'
const SUGGESTED_VIEW_MODEL = 'Base'

const OBJECT_MODULE_SOURCE = `export const ${BASE_VIEW_MODEL} = {}`
const FUNCTION_MODULE_SOURCE = `export const ${BASE_VIEW_MODEL} = () => {}`
const NON_EXPORTED_CLASS_SOURCE = `class ${BASE_VIEW_MODEL} {}`
const VALID_CLASS_SOURCE = `export class ${BASE_VIEW_MODEL} {}`

function routesImporting(viewModelReference: string): string {
  return `import { ${viewModelReference} } from './base'`
}

function resolveToModule(
  tsSource: string,
): (importSpecifier: string, fromFilePath: string) => ResolvedRouteImport | null {
  return () => ({ tsPath: BASE_TS_PATH, tsSource })
}

function collectRouteImportErrors(sourceCode: string, tsSource: string): ViewModelExportError[] {
  const reportedErrors: ViewModelExportError[] = []

  validateRouteImports({
    sourceCode,
    filePath: ROUTES_FILE_PATH,
    resolveFile: resolveToModule(tsSource),
    errorFn: (error) => {
      reportedErrors.push(error)
    },
  })

  return reportedErrors
}

describe('validateRouteImports', () => {
  beforeEach(() => {
    initializeI18n('en')
  })

  it('emits no error when the imported view model is declared as an object', () => {
    // Objects import fine and reach the router, whose runtime guard reports
    // them on Pelela's error page instead of the Vite overlay.
    const reportedErrors = collectRouteImportErrors(
      routesImporting(BASE_VIEW_MODEL),
      OBJECT_MODULE_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('emits no error when the imported view model is declared as a function', () => {
    // Same split as above: the router guard owns the notAClass report.
    const reportedErrors = collectRouteImportErrors(
      routesImporting(BASE_VIEW_MODEL),
      FUNCTION_MODULE_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('reports a missingExport error when the view model class is not exported', () => {
    const expectedError = new ViewModelExportError({
      kind: 'missingExport',
      viewModelName: BASE_VIEW_MODEL,
      tsFilePath: BASE_TS_PATH,
    })

    const reportedErrors = collectRouteImportErrors(
      routesImporting(BASE_VIEW_MODEL),
      NON_EXPORTED_CLASS_SOURCE,
    )

    expect(reportedErrors.map((error) => error.message)).toEqual([expectedError.message])
    expect(reportedErrors.map((error) => error.params)).toEqual([expectedError.params])
  })

  it('reports a notFound error when the imported view model does not exist in the module', () => {
    const expectedError = new ViewModelExportError({
      kind: 'notFound',
      viewModelName: MISSING_VIEW_MODEL,
      tsFilePath: BASE_TS_PATH,
      suggestedName: SUGGESTED_VIEW_MODEL,
    })

    const reportedErrors = collectRouteImportErrors(
      routesImporting(MISSING_VIEW_MODEL),
      VALID_CLASS_SOURCE,
    )

    expect(reportedErrors.map((error) => error.message)).toEqual([expectedError.message])
    expect(reportedErrors.map((error) => error.params)).toEqual([expectedError.params])
  })

  it('emits no error when the imported view model is a valid exported class', () => {
    const reportedErrors = collectRouteImportErrors(
      routesImporting(BASE_VIEW_MODEL),
      VALID_CLASS_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('emits no error when a valid view model is imported under an alias', () => {
    const reportedErrors = collectRouteImportErrors(
      routesImporting(`${BASE_VIEW_MODEL} as ${BASE_ALIAS}`),
      VALID_CLASS_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('emits no error when an aliased import points to a non-class declaration', () => {
    // Same split as above: the value imports fine and the router guard reports it.
    const reportedErrors = collectRouteImportErrors(
      routesImporting(`${BASE_VIEW_MODEL} as ${BASE_ALIAS}`),
      OBJECT_MODULE_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('ignores statements that are not import declarations', () => {
    const reportedErrors = collectRouteImportErrors(
      `const viewModelName = '${BASE_VIEW_MODEL}'\n${routesImporting(BASE_VIEW_MODEL)}`,
      VALID_CLASS_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('ignores side-effect-only imports', () => {
    const reportedErrors = collectRouteImportErrors("import './base'", VALID_CLASS_SOURCE)

    expect(reportedErrors).toEqual([])
  })

  it('ignores type-only imports', () => {
    const reportedErrors = collectRouteImportErrors(
      `import type { ${BASE_VIEW_MODEL} } from './base'`,
      VALID_CLASS_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('ignores inline type-only specifiers', () => {
    const reportedErrors = collectRouteImportErrors(
      `import { type ${BASE_VIEW_MODEL} } from './base'`,
      VALID_CLASS_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('ignores default imports', () => {
    const reportedErrors = collectRouteImportErrors(
      `import ${BASE_VIEW_MODEL} from './base'`,
      VALID_CLASS_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('ignores namespace imports', () => {
    const reportedErrors = collectRouteImportErrors(
      `import * as ${NAMESPACE_ALIAS} from './base'`,
      VALID_CLASS_SOURCE,
    )

    expect(reportedErrors).toEqual([])
  })

  it('emits no error when the import cannot be resolved to a component file', () => {
    const reportedErrors: ViewModelExportError[] = []

    validateRouteImports({
      sourceCode: `import { ${BASE_VIEW_MODEL} } from 'pelelajs'`,
      filePath: ROUTES_FILE_PATH,
      resolveFile: () => null,
      errorFn: (error) => {
        reportedErrors.push(error)
      },
    })

    expect(reportedErrors).toEqual([])
  })
})
