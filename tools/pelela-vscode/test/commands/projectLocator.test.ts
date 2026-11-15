import * as assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'mocha'
import * as vscode from 'vscode'
import {
  findProjectRoot,
  listWorkspaceProjectRoots,
  resourceDirectory,
} from '../../src/commands/projectLocator'
import { setWorkspaceFolders } from '../vscode-stub'
import { CLI_PACKAGE_JSON, createTempRoot, PELELA_PACKAGE_JSON, writeProjectFile } from './helpers'

const APP_DIRECTORY = 'app'
const SRC_DIRECTORY = 'src'
const COMPONENTS_DIRECTORY = 'components'
const COMPONENT_FILE = 'nav-bar.pelela'
const PACKAGE_JSON = 'package.json'

function createNestedProject(root: string, packageJson: string = PELELA_PACKAGE_JSON): string {
  const projectPath = join(root, APP_DIRECTORY)
  writeProjectFile(projectPath, PACKAGE_JSON, packageJson)
  mkdirSync(join(projectPath, SRC_DIRECTORY, COMPONENTS_DIRECTORY), { recursive: true })
  return projectPath
}

function componentUri(projectPath: string): vscode.Uri {
  return vscode.Uri.file(join(projectPath, SRC_DIRECTORY, COMPONENTS_DIRECTORY, COMPONENT_FILE))
}

describe('resourceDirectory', () => {
  it('returns the folder itself for an existing directory', () => {
    const root = createTempRoot()
    const folder = join(root, SRC_DIRECTORY)
    mkdirSync(folder)

    assert.equal(resourceDirectory(vscode.Uri.file(folder)), folder)
  })

  it('returns the parent folder for a file', () => {
    const root = createTempRoot()
    const filePath = writeProjectFile(root, join(SRC_DIRECTORY, COMPONENT_FILE), '')

    assert.equal(resourceDirectory(vscode.Uri.file(filePath)), join(root, SRC_DIRECTORY))
  })

  it('returns the parent folder for a path that does not exist', () => {
    const root = createTempRoot()
    const missingPath = join(root, SRC_DIRECTORY, COMPONENT_FILE)

    assert.equal(resourceDirectory(vscode.Uri.file(missingPath)), join(root, SRC_DIRECTORY))
  })
})

describe('findProjectRoot', () => {
  it('finds a nested project inside the workspace folder', () => {
    const root = createTempRoot()
    const projectPath = createNestedProject(root)
    setWorkspaceFolders([root])

    assert.equal(findProjectRoot(componentUri(projectPath)), projectPath)
  })

  it('accepts the standalone CLI package as a Pelela dependency', () => {
    const root = createTempRoot()
    const projectPath = createNestedProject(root, CLI_PACKAGE_JSON)
    setWorkspaceFolders([root])

    assert.equal(findProjectRoot(componentUri(projectPath)), projectPath)
  })

  it('falls back to the workspace folder when no package declares Pelela', () => {
    const root = createTempRoot()
    mkdirSync(join(root, SRC_DIRECTORY, COMPONENTS_DIRECTORY), { recursive: true })
    setWorkspaceFolders([root])

    assert.equal(findProjectRoot(componentUri(root)), root)
  })

  it('returns undefined when neither the project nor the workspace folder has src', () => {
    const root = createTempRoot()
    writeProjectFile(root, PACKAGE_JSON, PELELA_PACKAGE_JSON)
    setWorkspaceFolders([root])

    assert.equal(findProjectRoot(vscode.Uri.file(join(root, COMPONENT_FILE))), undefined)
  })

  it('returns undefined when there is no workspace folder and no project marker', () => {
    const root = createTempRoot()
    const filePath = writeProjectFile(root, join(SRC_DIRECTORY, COMPONENT_FILE), '')

    assert.equal(findProjectRoot(vscode.Uri.file(filePath)), undefined)
  })

  it('finds the project when there is no workspace folder but the resource is the project root', () => {
    const root = createTempRoot()
    writeProjectFile(root, PACKAGE_JSON, PELELA_PACKAGE_JSON)
    mkdirSync(join(root, SRC_DIRECTORY))

    assert.equal(findProjectRoot(vscode.Uri.file(root)), root)
  })

  it('ignores a malformed package.json', () => {
    const root = createTempRoot()
    const projectPath = join(root, APP_DIRECTORY)
    writeProjectFile(projectPath, PACKAGE_JSON, '{ invalid json')
    mkdirSync(join(projectPath, SRC_DIRECTORY))
    setWorkspaceFolders([root])

    assert.equal(findProjectRoot(componentUri(projectPath)), root)
  })

  it('ignores a package.json that is not an object', () => {
    const root = createTempRoot()
    const projectPath = join(root, APP_DIRECTORY)
    writeProjectFile(projectPath, PACKAGE_JSON, JSON.stringify([SAMPLE_ARRAY_ENTRY]))
    mkdirSync(join(projectPath, SRC_DIRECTORY))
    setWorkspaceFolders([root])

    assert.equal(findProjectRoot(componentUri(projectPath)), root)
  })
})

describe('listWorkspaceProjectRoots', () => {
  it('returns only the workspace folders that contain src', () => {
    const root = createTempRoot()
    const withSrc = join(root, 'with-src')
    const withoutSrc = join(root, 'without-src')
    mkdirSync(join(withSrc, SRC_DIRECTORY), { recursive: true })
    mkdirSync(withoutSrc, { recursive: true })
    setWorkspaceFolders([withSrc, withoutSrc])

    assert.deepEqual(listWorkspaceProjectRoots(), [withSrc])
  })

  it('returns an empty list without workspace folders', () => {
    assert.deepEqual(listWorkspaceProjectRoots(), [])
  })
})

const SAMPLE_ARRAY_ENTRY = 'sample-project'
