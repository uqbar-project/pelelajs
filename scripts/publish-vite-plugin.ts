import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

export function publishVitePlugin(
  version: string,
  packageJsonPath = 'packages/vite-plugin-pelelajs/package.json',
): void {
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
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('publish-vite-plugin.ts')
) {
  const version = process.argv[2]

  if (!version) {
    console.error('Usage: tsx scripts/publish-vite-plugin.ts <version>')
    process.exit(1)
  }

  publishVitePlugin(version)
}
