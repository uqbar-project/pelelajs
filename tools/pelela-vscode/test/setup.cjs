const Module = require('node:module')
const originalRequire = Module.prototype.require

const vscodeStub = require('./vscode-stub.cjs')

Module.prototype.require = function (id, ...args) {
  if (id === 'vscode') {
    return vscodeStub
  }
  return originalRequire.apply(this, [id, ...args])
}
