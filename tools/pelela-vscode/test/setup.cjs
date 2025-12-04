const Module = require('module');
const originalRequire = Module.prototype.require;

const vscodeStub = require('./vscode-stub.cjs');

Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return vscodeStub;
  }
  return originalRequire.apply(this, arguments);
};

