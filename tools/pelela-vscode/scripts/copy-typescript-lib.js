const fs = require('node:fs')
const path = require('node:path')

const LIB_FILE_PATTERN = /^lib\..*\.d\.ts$/

/**
 * The default library a program asks for depends on the target of the tsconfig
 * it resolved, so the two most common ones are checked explicitly instead of
 * trusting the glob to have copied everything.
 */
const REQUIRED_LIB_FILES = ['lib.esnext.full.d.ts', 'lib.es2022.full.d.ts']

function fail(message) {
  console.error(`[pelela-vscode] ${message}`)
  process.exit(1)
}

/**
 * The bundled TypeScript resolves its default library relative to the bundle
 * file, so `getDefaultLibFilePath` looks for the lib declarations inside dist.
 * Without them the program loads no lib, every global type degrades to `any`
 * and the view model analysis silently reports nothing.
 */
function copyTypeScriptLibFiles() {
  const libDirectory = path.dirname(require.resolve('typescript'))
  const distDirectory = path.join(__dirname, '..', 'dist')

  if (!fs.existsSync(distDirectory)) {
    fail(`build output not found at ${distDirectory}`)
  }

  const libFiles = fs.readdirSync(libDirectory).filter((entry) => LIB_FILE_PATTERN.test(entry))
  if (libFiles.length === 0) {
    fail(`no lib declaration files found in ${libDirectory}`)
  }

  for (const libFile of libFiles) {
    fs.copyFileSync(path.join(libDirectory, libFile), path.join(distDirectory, libFile))
  }

  for (const requiredLibFile of REQUIRED_LIB_FILES) {
    if (!fs.existsSync(path.join(distDirectory, requiredLibFile))) {
      fail(`${requiredLibFile} was not copied into ${distDirectory}`)
    }
  }

  console.log(`[pelela-vscode] copied ${libFiles.length} TypeScript lib files into dist`)
}

copyTypeScriptLibFiles()
