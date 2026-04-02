import Module from 'node:module'
import { vscodeStub } from './vscode-stub'

const originalRequire = Module.prototype.require

Module.prototype.require = function (id: string) {
  if (id === 'vscode') {
    return vscodeStub
  }
  return originalRequire.apply(this, [id])
}
