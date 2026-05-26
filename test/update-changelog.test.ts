import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { updateChangelogContent } from '../scripts/update-changelog'

describe('updateChangelogContent', () => {
  it('should correctly prepend the new entry after header with date for npm', () => {
    const existingContent = '# Changelog\n\n## npm-v0.1.0 - 2024-01-01\n- Old feature\n'
    const newSummary = '- 🚀 New exciting feature\n- 🐛 Bug fixed'
    const result = updateChangelogContent('0.2.0', existingContent, newSummary, 'npm')

    expect(result).toMatch(
      /^# Changelog\n\n## npm-v0\.2\.0 - \d{4}-\d{2}-\d{2}\n- 🚀 New exciting feature\n- 🐛 Bug fixed\n\n## npm-v0\.1\.0 - 2024-01-01\n- Old feature\n$/,
    )
  })

  it('should correctly prepend the new entry after header with date for vscode', () => {
    const existingContent = '# Changelog\n\n## vscode-v0.1.0 - 2024-01-01\n- Old feature\n'
    const newSummary = '- 🚀 New exciting feature\n- 🐛 Bug fixed'
    const result = updateChangelogContent('0.2.0', existingContent, newSummary, 'vscode')

    expect(result).toMatch(
      /^# Changelog\n\n## vscode-v0\.2\.0 - \d{4}-\d{2}-\d{2}\n- 🚀 New exciting feature\n- 🐛 Bug fixed\n\n## vscode-v0\.1\.0 - 2024-01-01\n- Old feature\n$/,
    )
  })

  it('should handle empty existing content with date for npm', () => {
    const existingContent = ''
    const newSummary = '- 🚀 Initial release'
    const result = updateChangelogContent('0.1.0', existingContent, newSummary)

    expect(result).toMatch(/^## npm-v0\.1\.0 - \d{4}-\d{2}-\d{2}\n- 🚀 Initial release\n\n$/)
  })

  it('should preserve header when adding new entry', () => {
    const existingContent =
      '# Changelog\n\nThis is the changelog.\n\n## npm-v0.1.0 - 2024-01-01\n- Old feature\n'
    const newSummary = '- 🚀 New feature'
    const result = updateChangelogContent('0.2.0', existingContent, newSummary)

    expect(result).toMatch(
      /^# Changelog\n\nThis is the changelog\.\n\n## npm-v0\.2\.0 - \d{4}-\d{2}-\d{2}\n- 🚀 New feature\n\n## npm-v0\.1\.0 - 2024-01-01\n- Old feature\n$/,
    )
  })
})

describe('update-changelog CLI', () => {
  it('should reject invalid release types when run as a CLI to prevent command injection', () => {
    try {
      execSync('pnpm tsx scripts/update-changelog.ts 1.0.0 invalid-type', {
        stdio: 'pipe',
      })
      expect.fail('Should have failed for invalid release type')
    } catch (error) {
      const err = error as { status: number; stderr: Buffer }
      expect(err.status).toBe(1)
      expect(err.stderr.toString()).toContain('Invalid release type')
    }
  })
})
