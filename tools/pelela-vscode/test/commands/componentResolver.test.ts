import * as assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import {
  computeComponentFilePath,
  resolveComponent,
  resolveComponentOrReport,
  selectProjectRoot,
} from '../../src/commands/componentResolver'
import { t } from '../../src/i18n'
import { PELELA_EXTENSION, TYPESCRIPT_EXTENSION } from '../../src/utils/componentPaths'
import { getMessages, setQuickPickLabel, setWorkspaceFolders } from '../vscode-stub'
import {
  COMPONENTS_DIRECTORY,
  createPelelaProject,
  createTempRoot,
  NAV_BAR_PELELA_PATH,
  pelelaTemplate,
  SRC_DIRECTORY,
  writeProjectFile,
} from './helpers'

const COMPONENTS_PATH = 'components'
const NAV_BAR_DIRECTORY_NAME = 'NavBar'
const NAV_BAR_COMPONENT_PATH = `${COMPONENTS_PATH}/${NAV_BAR_DIRECTORY_NAME}`
const STANDALONE_TS_PATH = join(SRC_DIRECTORY, COMPONENTS_DIRECTORY, 'standalone.ts')
const STANDALONE_PELELA_PATH = join(SRC_DIRECTORY, COMPONENTS_DIRECTORY, 'standalone.pelela')
const DOCUMENTATION_PATH = join('docs', 'navigation.md')
const OUTSIDE_SRC_TEMPLATE_PATH = join('docs', 'navigation.pelela')
const BROKEN_COMPONENT_PATH = join(SRC_DIRECTORY, COMPONENTS_DIRECTORY, 'broken.pelela')

function createProjectWithWorkspace(viewModelName?: string) {
  const project = createPelelaProject(viewModelName)
  setWorkspaceFolders([project.root])
  return project
}

describe('resolveComponent', () => {
  it('resolves a component from its pelela template', () => {
    const project = createProjectWithWorkspace()

    assert.deepEqual(resolveComponent(vscode.Uri.file(project.pelelaPath)), {
      kind: 'component',
      component: {
        projectRoot: project.root,
        componentPath: NAV_BAR_COMPONENT_PATH,
        folderPath: COMPONENTS_DIRECTORY,
        pelelaPath: project.pelelaPath,
        displayName: project.viewModelName,
      },
    })
  })

  it('resolves a component from its TypeScript view model', () => {
    const project = createProjectWithWorkspace()

    const resolution = resolveComponent(vscode.Uri.file(project.tsPath))

    assert.equal(
      resolution.kind === 'component' ? resolution.component.pelelaPath : undefined,
      project.pelelaPath
    )
  })

  it('uses the view model class name as the component path', () => {
    const project = createProjectWithWorkspace('NavigationBar')

    const resolution = resolveComponent(vscode.Uri.file(project.pelelaPath))

    assert.equal(
      resolution.kind === 'component' ? resolution.component.componentPath : undefined,
      `components/${project.viewModelName}`
    )
  })

  it('falls back to the file name when the template has no view model', () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const pelelaPath = writeProjectFile(
      project.root,
      join(SRC_DIRECTORY, 'nav-bar.pelela'),
      '<pelela>\n</pelela>\n'
    )

    assert.deepEqual(resolveComponent(vscode.Uri.file(pelelaPath)), {
      kind: 'component',
      component: {
        projectRoot: project.root,
        componentPath: 'NavBar',
        folderPath: '',
        pelelaPath,
        displayName: 'NavBar',
      },
    })
  })

  it('falls back to the file name when the template cannot be read', () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const unreadablePath = join(project.root, BROKEN_COMPONENT_PATH)
    mkdirSync(unreadablePath)

    const resolution = resolveComponent(vscode.Uri.file(unreadablePath))

    assert.equal(
      resolution.kind === 'component' ? resolution.component.displayName : undefined,
      'Broken'
    )
  })

  it('reports a TypeScript file without a sibling template as not a component', () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const tsPath = writeProjectFile(
      project.root,
      STANDALONE_TS_PATH,
      'export class Standalone {}\n'
    )

    assert.deepEqual(resolveComponent(vscode.Uri.file(tsPath)), {
      kind: 'notAComponent',
      filePath: tsPath,
      pelelaPath: join(project.root, STANDALONE_PELELA_PATH),
    })
  })

  it('reports a file without a component extension as not a component', () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const docPath = writeProjectFile(project.root, DOCUMENTATION_PATH, '# Navigation\n')

    assert.deepEqual(resolveComponent(vscode.Uri.file(docPath)), {
      kind: 'notAComponent',
      filePath: docPath,
      pelelaPath: docPath,
    })
  })

  it('reports a missing template as not a component', () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const missingPath = join(project.root, SRC_DIRECTORY, COMPONENTS_DIRECTORY, 'ghost.pelela')

    assert.deepEqual(resolveComponent(vscode.Uri.file(missingPath)), {
      kind: 'notAComponent',
      filePath: missingPath,
      pelelaPath: missingPath,
    })
  })

  it('reports a template outside src', () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const outsidePath = writeProjectFile(
      project.root,
      OUTSIDE_SRC_TEMPLATE_PATH,
      pelelaTemplate('Docs')
    )

    assert.deepEqual(resolveComponent(vscode.Uri.file(outsidePath)), {
      kind: 'outsideSrc',
      filePath: outsidePath,
    })
  })

  it('reports a missing project', () => {
    const project = createPelelaProject()
    const pelelaPath = writeProjectFile(project.root, NAV_BAR_PELELA_PATH, pelelaTemplate('NavBar'))
    setWorkspaceFolders(null)

    assert.deepEqual(resolveComponent(vscode.Uri.file(pelelaPath)), { kind: 'projectNotFound' })
  })
})

describe('computeComponentFilePath', () => {
  it('lowercases the component path and appends the template extension', () => {
    const root = createTempRoot()

    assert.equal(
      computeComponentFilePath(root, 'components/Reports/ReportCard', PELELA_EXTENSION),
      join(root, SRC_DIRECTORY, 'components', 'reports', `report-card${PELELA_EXTENSION}`)
    )
  })

  it('supports the TypeScript extension', () => {
    const root = createTempRoot()

    assert.equal(
      computeComponentFilePath(root, 'App', TYPESCRIPT_EXTENSION),
      join(root, SRC_DIRECTORY, `app${TYPESCRIPT_EXTENSION}`)
    )
  })
})

describe('resolveComponentOrReport', () => {
  it('returns the resolved component', async () => {
    const project = createProjectWithWorkspace()

    const component = await resolveComponentOrReport(vscode.Uri.file(project.pelelaPath))

    assert.equal(component?.componentPath, NAV_BAR_COMPONENT_PATH)
    assert.deepEqual(getMessages(), [])
  })

  it('reports a TypeScript file without a sibling template', async () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const tsPath = writeProjectFile(
      project.root,
      STANDALONE_TS_PATH,
      'export class Standalone {}\n'
    )

    const component = await resolveComponentOrReport(vscode.Uri.file(tsPath))

    assert.equal(component, undefined)
    assert.deepEqual(getMessages(), [
      {
        kind: 'error',
        message: t('commands.error.notAComponent', {
          file: basename(tsPath),
          pelelaFile: basename(join(project.root, STANDALONE_PELELA_PATH)),
        }),
      },
    ])
  })

  it('reports a template outside src', async () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])
    const outsidePath = writeProjectFile(
      project.root,
      OUTSIDE_SRC_TEMPLATE_PATH,
      pelelaTemplate('Docs')
    )

    const component = await resolveComponentOrReport(vscode.Uri.file(outsidePath))

    assert.equal(component, undefined)
    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.outsideSrc', { file: outsidePath }) },
    ])
  })

  it('reports a missing project', async () => {
    const project = createPelelaProject()
    const pelelaPath = writeProjectFile(project.root, NAV_BAR_PELELA_PATH, pelelaTemplate('NavBar'))
    setWorkspaceFolders(null)

    const component = await resolveComponentOrReport(vscode.Uri.file(pelelaPath))

    assert.equal(component, undefined)
    assert.deepEqual(getMessages(), [
      { kind: 'error', message: t('commands.error.projectNotFound') },
    ])
  })
})

describe('selectProjectRoot', () => {
  it('reports no project when there are no workspace folders', async () => {
    assert.deepEqual(await selectProjectRoot(), { kind: 'notFound' })
  })

  it('selects the only workspace folder with src', async () => {
    const project = createPelelaProject()
    setWorkspaceFolders([project.root])

    assert.deepEqual(await selectProjectRoot(), {
      kind: 'selected',
      projectRoot: project.root,
    })
  })

  it('ignores workspace folders without src', async () => {
    const project = createPelelaProject()
    const emptyFolder = createTempRoot()
    setWorkspaceFolders([emptyFolder, project.root])

    assert.deepEqual(await selectProjectRoot(), {
      kind: 'selected',
      projectRoot: project.root,
    })
  })

  it('returns the folder picked from the quick pick', async () => {
    const firstProject = createPelelaProject()
    const secondProject = createPelelaProject()
    setWorkspaceFolders([firstProject.root, secondProject.root])
    setQuickPickLabel(basename(secondProject.root))

    assert.deepEqual(await selectProjectRoot(), {
      kind: 'selected',
      projectRoot: secondProject.root,
    })
  })

  it('reports a cancelled quick pick', async () => {
    const firstProject = createPelelaProject()
    const secondProject = createPelelaProject()
    setWorkspaceFolders([firstProject.root, secondProject.root])
    setQuickPickLabel(undefined)

    assert.deepEqual(await selectProjectRoot(), { kind: 'cancelled' })
  })
})
