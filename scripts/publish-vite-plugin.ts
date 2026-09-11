import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function publishVitePlugin(
  version: string,
  packageJsonPath = 'packages/vite-plugin-pelelajs/package.json',
): void {
  const packageDir = dirname(packageJsonPath)
  const originalContent = readFileSync(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(originalContent)
  const workspaceDependencyNames = Object.entries(packageJson.dependencies ?? {})
    .filter(([, dependencySpec]) => dependencySpec === 'workspace:*')
    .map(([dependencyName]) => dependencyName)
  const hasWorkspaceDependencies = workspaceDependencyNames.length > 0

  if (hasWorkspaceDependencies) {
    for (const dependencyName of workspaceDependencyNames) {
      packageJson.dependencies[dependencyName] = version
    }
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
  }

  try {
    execSync(`npm publish ./${packageDir} --access public`, {
      stdio: 'inherit',
      encoding: 'utf-8',
    })
  } finally {
    if (hasWorkspaceDependencies) {
      for (const dependencyName of workspaceDependencyNames) {
        packageJson.dependencies[dependencyName] = 'workspace:*'
      }
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
