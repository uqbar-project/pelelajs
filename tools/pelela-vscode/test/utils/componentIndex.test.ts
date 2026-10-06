import * as assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { findChildTemplate, invalidateComponentIndex } from '../../src/utils/componentIndex'
import { setWorkspaceFolders } from '../vscode-stub'

function createDocument(filePath: string): vscode.TextDocument {
  return {
    lineCount: 1,
    lineAt: () => ({ text: '' }),
    uri: vscode.Uri.file(filePath),
    languageId: 'pelela',
  } as unknown as vscode.TextDocument
}

function writeTemplate(relativePath: string, viewModelName: string): string {
  const fullPath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, `<pelela view-model="${viewModelName}"></pelela>`)
  return fullPath
}

function writeTemplateWithoutAttribute(relativePath: string): string {
  const fullPath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, '<pelela></pelela>')
  return fullPath
}

let root: string

describe('findChildTemplate', () => {
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
    const child = writeTemplate('pages/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, child)
  })

  it('resolves a template in a subfolder of the document directory', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('pages/widgets/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, child)
  })

  it('resolves a template in a sibling subfolder, the way the runtime does', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('components/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, child)
  })

  it('resolves a template several levels above the document directory', () => {
    const parent = path.join(root, 'pages', 'admin', 'deep', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('components/nested/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, child)
  })

  it('prefers a sibling template over a distant one with the same tag', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('components/counter.pelela', 'Counter')
    const sibling = writeTemplate('pages/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, sibling)
  })

  it('prefers a shallower template over a deeper one with the same tag', () => {
    const parent = path.join(root, 'parent.pelela')
    const shallow = writeTemplate('counter.pelela', 'Counter')
    writeTemplate('widgets/nested/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, shallow)
  })

  it('picks the same template when several subfolders declare the same tag', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('components/b/counter.pelela', 'Counter')
    const first = writeTemplate('components/a/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, first)
    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, first)
  })

  it('ignores templates inside node_modules', () => {
    const parent = path.join(root, 'parent.pelela')
    writeTemplate('node_modules/some-package/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent)), null)
  })

  it('returns null for a template that does not exist', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('components/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('missing', createDocument(parent)), null)
  })

  it('stays in the document directory when no workspace folder is open', () => {
    setWorkspaceFolders(null)
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('components/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent)), null)
    assert.equal(findChildTemplate('counter', createDocument(parent)), null)
  })

  it('stops escalating upwards at the source directory', () => {
    const parent = path.join(root, 'src', 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('outside/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent)), null)
  })

  it('resolves a template inside the source directory from a nested page', () => {
    const parent = path.join(root, 'src', 'pages', 'admin', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('src/components/counter.pelela', 'Counter')

    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, child)
  })

  it('resolves by the kebab-cased view model attribute, not the file name', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    const child = writeTemplate('pages/counter.pelela', 'CounterViewModel')

    const resolved = findChildTemplate('counter-view-model', createDocument(parent))
    assert.ok(resolved)
    assert.equal(resolved.templatePath, child)
    assert.equal(resolved.viewModelName, 'CounterViewModel')
    assert.equal(resolved.tagName, 'counter-view-model')
  })

  it('does not resolve the tag derived from the file name when the view model differs', () => {
    const parent = path.join(root, 'pages', 'parent.pelela')
    fs.mkdirSync(path.dirname(parent), { recursive: true })
    writeTemplate('pages/counter.pelela', 'CounterViewModel')

    assert.equal(findChildTemplate('counter', createDocument(parent)), null)
  })

  it('falls back to the file name when the template has no view-model attribute', () => {
    const parent = path.join(root, 'parent.pelela')
    const child = writeTemplateWithoutAttribute('stats.pelela')

    const resolved = findChildTemplate('stats', createDocument(parent))
    assert.ok(resolved)
    assert.equal(resolved.templatePath, child)
    assert.equal(resolved.viewModelName, 'stats')
  })

  it('sees a template created after the index was built once invalidated', () => {
    const parent = path.join(root, 'parent.pelela')
    assert.equal(findChildTemplate('counter', createDocument(parent)), null)

    const child = writeTemplate('components/counter.pelela', 'Counter')
    invalidateComponentIndex()

    assert.equal(findChildTemplate('counter', createDocument(parent))?.templatePath, child)
  })
})
