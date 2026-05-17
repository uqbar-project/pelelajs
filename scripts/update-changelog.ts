import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export function updateChangelogContent(
  version: string,
  currentContent: string,
  summary: string,
): string {
  const newEntry = `## v${version}\n${summary}\n\n`
  return newEntry + currentContent
}

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('update-changelog.ts')
) {
  const version = process.argv[2]
  const type = process.argv[3] || 'npm'
  const changelogFile = process.argv[4] || 'CHANGELOG.md'

  if (!version) {
    console.error('Usage: tsx update-changelog.ts <version> <type> [file]')
    process.exit(1)
  }

  const allowedTypes = ['npm', 'vscode']
  if (!allowedTypes.includes(type)) {
    console.error(`Invalid release type: "${type}". Allowed values are: ${allowedTypes.join(', ')}`)
    process.exit(1)
  }

  try {
    let summary = (process.env.RELEASE_IT_NOTES || '').trim()

    if (!summary) {
      summary = execFileSync('pnpm', ['tsx', 'scripts/generate-summary.ts', type], {
        encoding: 'utf-8',
      }).trim()
    }

    let currentContent = ''
    if (existsSync(changelogFile)) {
      currentContent = readFileSync(changelogFile, 'utf-8')
    }
    const newContent = updateChangelogContent(version, currentContent, summary)

    writeFileSync(changelogFile, newContent)
  } catch (error) {
    console.error('Failed to update changelog:', error)
    process.exit(1)
  }
}
