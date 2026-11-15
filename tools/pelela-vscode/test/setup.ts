import Module from 'node:module'
import { cleanupTempDirectories } from './commands/helpers'
import { resetVscodeStub, vscodeStub } from './vscode-stub'

const originalRequire = Module.prototype.require

Module.prototype.require = function (id: string) {
  if (id === 'vscode') {
    return vscodeStub
  }
  return originalRequire.apply(this, [id])
}

export const mochaHooks = {
  afterEach() {
    resetVscodeStub()
    cleanupTempDirectories()
  },
}
