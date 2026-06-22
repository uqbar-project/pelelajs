import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { provideTypeScriptDefinition } from '../../src/providers/tsDefinitionProvider'

describe('tsDefinitionProvider', () => {
  const testFilesDir = path.join(__dirname, '../fixtures')
  const testTsPath = path.join(testFilesDir, 'MyViewModel.ts')
  const testPelelaPath = path.join(testFilesDir, 'MyViewModel.pelela')

  const tsLines = [
    'export class MyViewModel {',
    '  userName = "John"',
    '  count = 0',
    '  get isVisible() {',
    '    return true',
    '  }',
    '  handleSubmit() {',
    '    console.log("submit")',
    '  }',
    '}',
  ]

  const pelelaContent = `<pelela view-model="MyViewModel">
  <span bind-content="userName"></span>
  <span bind-content="count"></span>
  <p if="isVisible">text</p>
  <button click="handleSubmit">Save</button>
  <input bind-value="userName" />
</pelela>`

  before(() => {
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true })
    }
    fs.writeFileSync(testTsPath, tsLines.join('\n'))
    fs.writeFileSync(testPelelaPath, pelelaContent)
  })

  after(() => {
    if (fs.existsSync(testPelelaPath)) {
      fs.unlinkSync(testPelelaPath)
    }
    if (fs.existsSync(testTsPath)) {
      fs.unlinkSync(testTsPath)
    }
  })

  function makeDocument(lines: string[], filePath: string): vscode.TextDocument {
    return {
      uri: vscode.Uri.file(filePath),
      lineAt: (line: number) => ({ text: lines[line] }),
      getWordRangeAtPosition: (pos: vscode.Position) => {
        const line = lines[pos.line]
        if (!line) return undefined
        let start = pos.character
        while (start > 0 && /\w/.test(line[start - 1])) start--
        let end = pos.character
        while (end < line.length && /\w/.test(line[end])) end++
        if (start === end) return undefined
        return new vscode.Range(
          new vscode.Position(pos.line, start),
          new vscode.Position(pos.line, end)
        )
      },
      getText: (range: vscode.Range) => {
        return lines[range.start.line].slice(range.start.character, range.end.character)
      },
    } as unknown as vscode.TextDocument
  }

  it('should navigate from class declaration to view-model tag in .pelela', () => {
    const doc = makeDocument(tsLines, testTsPath)
    // Cursor on "MyViewModel" in "export class MyViewModel" (line 0, char 17)
    const pos = new vscode.Position(0, 17)
    const location = provideTypeScriptDefinition(
      doc,
      pos,
      {} as vscode.CancellationToken
    ) as vscode.Location

    assert.ok(location instanceof vscode.Location)
    assert.strictEqual(location.uri.fsPath, testPelelaPath)
    assert.strictEqual(location.range.start.line, 0)
  })

  it('should navigate from property to first usage in bind-content', () => {
    const doc = makeDocument(tsLines, testTsPath)
    // Cursor on "userName" in "userName = ..." (line 1, char 2)
    const pos = new vscode.Position(1, 2)
    const location = provideTypeScriptDefinition(
      doc,
      pos,
      {} as vscode.CancellationToken
    ) as vscode.Location

    assert.ok(location instanceof vscode.Location)
    assert.strictEqual(location.uri.fsPath, testPelelaPath)
  })

  it('should navigate from getter to first usage in if attribute', () => {
    const doc = makeDocument(tsLines, testTsPath)
    // Cursor on "isVisible" in "get isVisible()" (line 3, char 6)
    const pos = new vscode.Position(3, 6)
    const location = provideTypeScriptDefinition(
      doc,
      pos,
      {} as vscode.CancellationToken
    ) as vscode.Location

    assert.ok(location instanceof vscode.Location)
    assert.strictEqual(location.uri.fsPath, testPelelaPath)
  })

  it('should navigate from method to first usage in click', () => {
    const doc = makeDocument(tsLines, testTsPath)
    // Cursor on "handleSubmit" in "handleSubmit() {" (line 6, char 2)
    const pos = new vscode.Position(6, 2)
    const location = provideTypeScriptDefinition(
      doc,
      pos,
      {} as vscode.CancellationToken
    ) as vscode.Location

    assert.ok(location instanceof vscode.Location)
    assert.strictEqual(location.uri.fsPath, testPelelaPath)
  })

  it('should return null when no companion .pelela file exists', () => {
    const nonExistentTsPath = path.join(testFilesDir, 'NoPelelaFile.ts')
    const doc = makeDocument(tsLines, nonExistentTsPath)
    const pos = new vscode.Position(0, 17)

    const result = provideTypeScriptDefinition(doc, pos, {} as vscode.CancellationToken)
    assert.strictEqual(result, null)
  })

  it('should return null when word is not a class/member declaration', () => {
    const linesWithoutDeclaration = ['const x = 42', 'function foo() {}']
    const doc = makeDocument(linesWithoutDeclaration, testTsPath)
    // Cursor on "x" in "const x = 42" (line 0, char 6)
    const pos = new vscode.Position(0, 6)

    const result = provideTypeScriptDefinition(doc, pos, {} as vscode.CancellationToken)
    assert.strictEqual(result, null)
  })

  it('should return null when getWordRangeAtPosition returns undefined', () => {
    const doc = makeDocument(tsLines, testTsPath)
    // Override getWordRangeAtPosition to return undefined
    doc.getWordRangeAtPosition = () => undefined

    const pos = new vscode.Position(0, 17)
    const result = provideTypeScriptDefinition(doc, pos, {} as vscode.CancellationToken)
    assert.strictEqual(result, null)
  })
})
