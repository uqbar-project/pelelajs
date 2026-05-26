import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { generateSummary } from './generate-summary'

export function updateChangelogContent(
  version: string,
  currentContent: string,
  summary: string,
): string {
  const date = new Date().toISOString().split('T')[0]
  const newEntry = `## v${version} - ${date}\n${summary}\n\n`

  // Split content into header (before first ## v...) and releases
  const firstVersionHeaderIndex = currentContent.search(/^## v/m)
  if (firstVersionHeaderIndex === -1) {
    // No existing version headers, prepend new entry
    return newEntry + currentContent
  }

  const header = currentContent.slice(0, firstVersionHeaderIndex)
  const releases = currentContent.slice(firstVersionHeaderIndex)

  return header + newEntry + releases
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
      summary = generateSummary(type as 'npm' | 'vscode')
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
