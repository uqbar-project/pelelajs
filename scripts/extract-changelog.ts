import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Extracts the changelog section for a given version from CHANGELOG.md
 * Usage: pnpm tsx scripts/extract-changelog.ts <version> [changelog-path]
 *
 * Examples:
 *   pnpm tsx scripts/extract-changelog.ts 1.0.0
 *   pnpm tsx scripts/extract-changelog.ts 0.2.3 /path/to/CHANGELOG.md
 */

const version = process.argv[2]
const changelogPath = process.argv[3]
  ? resolve(process.argv[3])
  : resolve(process.cwd(), 'CHANGELOG.md')

if (!version) {
  console.error('❌ Usage: extract-changelog.ts <version> [changelog-path]')
  console.error('Example: extract-changelog.ts 1.0.0')
  process.exit(1)
}

try {
  const changelog = readFileSync(changelogPath, 'utf-8')

  // Extract the section for the current version
  // Matches: ## npm-v1.0.0 - 2024-01-01 or ## vscode-v1.0.0 - 2024-01-01
  const regex = new RegExp(
    `## (?:npm-v|vscode-v)?${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?\\n([\\s\\S]*?)(?=\\n## |$)`,
  )
  const match = changelog.match(regex)

  if (match?.[1]) {
    process.stdout.write(match[1].trim())
  } else {
    console.error(`⚠️  No changelog entry found for version ${version}`)
    process.exit(1)
  }
} catch (err: unknown) {
  const error = err as NodeJS.ErrnoException
  console.error(`❌ Error reading ${changelogPath}:`, error.message)
  process.exit(1)
}
