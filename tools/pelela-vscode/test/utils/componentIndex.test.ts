import * as assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { findChildTemplatePath, invalidateComponentIndex } from '../../src/utils/componentIndex'
import { setWorkspaceFolders } from '../vscode-stub'

function createDocument(filePath: string): vscode.TextDocument {
  return {
    lineCount: 1,
    lineAt: () => ({ text: '' }),
    uri: vscode.Uri.file(filePath),
    languageId: 'pelela',
  } as unknown as vscode.TextDocument
}

function writeTemplate(relativePath: string): string {
  const fullPath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, '<pelela view-model="Child"></pelela>')
  return fullPath
}

let root: string

describe('findChildTemplatePath', () => {
  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-index-')))
    setWorkspaceFolders([root])
    invalidateComponentIndex()
  })

  afterEach(() => {
    setWorkspaceFolders(null)
    invalidateComponentIndex()
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('resolves a template that is a sibling of the document', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('pages/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), child)
  })

  it('resolves a template in a subfolder of the document directory', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('pages/widgets/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), child)
  })

  it('resolves a template in a sibling subfolder, the way the runtime does', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('components/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), child)
  })

  it('resolves a template several levels above the document directory', () => {
    const parent = path.join(root, 'pages', 'admin', 'deep', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('components/nested/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), child)
  })

  it('prefers a sibling template over a distant one with the same name', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('components/counter.pelela')
    const sibling = writeTemplate('pages/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), sibling)
  })

  it('prefers a shallower template over a deeper one with the same name', () => {
    const parent = path.join(root, 'parent.pelela')
    const shallow = writeTemplate('counter.pelela')
    writeTemplate('widgets/nested/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), shallow)
  })

  it('picks the same template when several subfolders declare the same name', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('components/b/counter.pelela')
    const first = writeTemplate('components/a/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), first)
    assert.equal(findChildTemplatePath('counter', createDocument(parent)), first)
  })

  it('ignores templates inside node_modules', () => {
    const parent = path.join(root, 'parent.pelela')
    writeTemplate('node_modules/some-package/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), null)
  })

  it('returns null for a template that does not exist', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('components/counter.pelela')

    assert.equal(findChildTemplatePath('missing', createDocument(parent)), null)
  })

  it('stays in the document directory when no workspace folder is open', () => {
    setWorkspaceFolders(null)
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('components/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), null)
    assert.equal(findChildTemplatePath('counter', createDocument(parent)), null)
  })

  it('stops escalating upwards at the source directory', () => {
    const parent = path.join(root, 'src', 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('outside/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), null)
  })

  it('resolves a template inside the source directory from a nested page', () => {
    const parent = path.join(root, 'src', 'pages', 'admin', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('src/components/counter.pelela')

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), child)
  })

  it('sees a template created after the index was built once invalidated', () => {
    const parent = path.join(root, 'parent.pelela')
    assert.equal(findChildTemplatePath('counter', createDocument(parent)), null)

    const child = writeTemplate('components/counter.pelela')
    invalidateComponentIndex()

    assert.equal(findChildTemplatePath('counter', createDocument(parent)), child)
  })
})
