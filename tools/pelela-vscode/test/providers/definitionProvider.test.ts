import * as assert from 'node:assert'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { after, before, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { provideDefinition } from '../../src/providers/definitionProvider'

describe('definitionProvider - Component Tag Navigation', () => {
  const fixturesDir = path.join(__dirname, '../fixtures')
  const parentPath = path.join(fixturesDir, 'parent.pelela')
  const childPath = path.join(fixturesDir, 'child-comp.pelela')

  const fileLines = [
    '<pelela view-model="Parent">',
    '  <div>',
    '    <child-comp prop-value="some"></child-comp>',
    '    </child-comp>',
    '    <div class="test"></div>',
    '</pelela>',
    '    <workspace-comp></workspace-comp>',
  ]

  const mockDocument = {
    uri: vscode.Uri.file(parentPath),
    lineAt: (line: number) => ({
      text: fileLines[line],
    }),
  } as unknown as vscode.TextDocument

  before(() => {
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true })
    }
    fs.writeFileSync(parentPath, fileLines.join('\n'))
    fs.writeFileSync(childPath, '<pelela></pelela>')
  })

  after(() => {
    if (fs.existsSync(parentPath)) {
      fs.unlinkSync(parentPath)
    }
    if (fs.existsSync(childPath)) {
      fs.unlinkSync(childPath)
    }
  })

  it('should ignore standard HTML and Pelela tags', () => {
    // Cursor on "<pelela" (line 0, character 3)
    const posPelela = new vscode.Position(0, 3)
    const resultPelela = provideDefinition(mockDocument, posPelela, {} as vscode.CancellationToken)
    assert.strictEqual(resultPelela, null)

    // Cursor on "div" in "  <div>" (line 1, character 5)
    const posDiv = new vscode.Position(1, 5)
    const resultDiv = provideDefinition(mockDocument, posDiv, {} as vscode.CancellationToken)
    assert.strictEqual(resultDiv, null)
  })

  it('should resolve navigation to local component file in the same directory (opening tag)', () => {
    // Cursor on "child-comp" in "<child-comp" (line 2, character 10)
    const posChild = new vscode.Position(2, 10)
    const location = provideDefinition(
      mockDocument,
      posChild,
      {} as vscode.CancellationToken
    ) as vscode.Location

    assert.ok(location instanceof vscode.Location)
    assert.strictEqual(location.uri.fsPath, childPath)
    assert.strictEqual(location.range.start.line, 0)
    assert.strictEqual(location.range.start.character, 0)
  })

  it('should resolve navigation to local component file in the same directory (closing tag)', () => {
    // Cursor on "child-comp" in "</child-comp>" (line 3, character 10)
    const posChildClose = new vscode.Position(3, 10)
    const location = provideDefinition(
      mockDocument,
      posChildClose,
      {} as vscode.CancellationToken
    ) as vscode.Location

    assert.ok(location instanceof vscode.Location)
    assert.strictEqual(location.uri.fsPath, childPath)
    assert.strictEqual(location.range.start.line, 0)
    assert.strictEqual(location.range.start.character, 0)
  })

  it('should fallback to workspace search when local file does not exist', async () => {
    const mockUri = vscode.Uri.file('/some/other/workspace-comp.pelela')
    const EXPECTED_GLOB = '**/workspace-comp.pelela'

    // Save original findFiles
    const originalFindFiles = vscode.workspace.findFiles

    try {
      // Mock workspace.findFiles
      vscode.workspace.findFiles = (include: vscode.GlobPattern) => {
        const globStr = typeof include === 'string' ? include : include.pattern
        assert.strictEqual(globStr, EXPECTED_GLOB)
        return Promise.resolve([mockUri])
      }

      // Cursor on "workspace-comp" in "<workspace-comp>" (line 6, character 10)
      const posWorkspace = new vscode.Position(6, 10)
      const result = provideDefinition(mockDocument, posWorkspace, {} as vscode.CancellationToken)

      const location = (await Promise.resolve(result)) as vscode.Location

      assert.ok(location instanceof vscode.Location)
      assert.strictEqual(location.uri.fsPath, mockUri.fsPath)
    } finally {
      // Restore original findFiles
      vscode.workspace.findFiles = originalFindFiles
    }
  })
})
