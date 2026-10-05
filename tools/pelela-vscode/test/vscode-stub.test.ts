import * as assert from 'node:assert/strict'
import * as path from 'node:path'
import { afterEach, describe, it } from 'mocha'
import * as vscode from 'vscode'
import { setWorkspaceFolders } from './vscode-stub'

describe('vscode stub workspace', () => {
  afterEach(() => {
    setWorkspaceFolders(null)
  })

  it('matches folders on segment boundaries, not on shared prefixes', () => {
    const app = path.join('project', 'app')
    const application = path.join('project', 'application')
    setWorkspaceFolders([app, application])

    const inApplication = vscode.Uri.file(path.join(application, 'counter.pelela'))
    assert.equal(vscode.workspace.getWorkspaceFolder(inApplication)?.uri.fsPath, application)

    const inApp = vscode.Uri.file(path.join(app, 'counter.pelela'))
    assert.equal(vscode.workspace.getWorkspaceFolder(inApp)?.uri.fsPath, app)
  })

  it('returns undefined when no folder contains the uri', () => {
    setWorkspaceFolders([path.join('project', 'app')])

    const elsewhere = vscode.Uri.file(path.join('project', 'other', 'x.pelela'))
    assert.equal(vscode.workspace.getWorkspaceFolder(elsewhere), undefined)
  })
})
