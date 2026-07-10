import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]

if (!version) {
  console.error('Usage: tsx scripts/publish-vite-plugin.ts <version>')
  process.exit(1)
}

const packageJsonPath = 'packages/vite-plugin-pelelajs/package.json'

const originalContent = readFileSync(packageJsonPath, 'utf-8')
const packageJson = JSON.parse(originalContent)
const originalDependency = packageJson.dependencies?.pelelajs
const isWorkspaceDependency = originalDependency === 'workspace:*'

if (isWorkspaceDependency) {
  packageJson.dependencies.pelelajs = version
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

try {
  execSync('npm publish packages/vite-plugin-pelelajs --access public', {
    stdio: 'inherit',
    encoding: 'utf-8',
  })
} finally {
  if (isWorkspaceDependency) {
    packageJson.dependencies.pelelajs = 'workspace:*'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
  }
}
