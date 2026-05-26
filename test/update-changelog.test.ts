import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateSummary } from '../scripts/generate-summary'
import { updateChangelog, updateChangelogContent } from '../scripts/update-changelog'

vi.mock('../scripts/generate-summary')

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

describe('updateChangelog', () => {
  const tempFile = 'test-temp-CHANGELOG.md'
  const mockedGenerateSummary = vi.mocked(generateSummary)
  const mockedExit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('process.exit called')
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (existsSync(tempFile)) {
      unlinkSync(tempFile)
    }
    mockedExit.mockClear()
  })

  it('should reject invalid release types', () => {
    expect(() => updateChangelog('1.0.0', 'invalid' as 'npm' | 'vscode', tempFile)).toThrow(
      'process.exit called',
    )
  })

  it('should create new changelog file when it does not exist', () => {
    if (existsSync(tempFile)) {
      unlinkSync(tempFile)
    }

    mockedGenerateSummary.mockReturnValue('- Test release notes')
    process.env.RELEASE_IT_NOTES = ''

    updateChangelog('1.0.0', 'npm', tempFile)

    expect(existsSync(tempFile)).toBe(true)
    const content = readFileSync(tempFile, 'utf-8')
    expect(content).toContain('## npm-v1.0.0')
    expect(content).toContain('- Test release notes')
  })

  it('should use RELEASE_IT_NOTES when provided', () => {
    if (existsSync(tempFile)) {
      unlinkSync(tempFile)
    }

    process.env.RELEASE_IT_NOTES = '- Custom release notes'

    updateChangelog('1.0.0', 'npm', tempFile)

    const content = readFileSync(tempFile, 'utf-8')
    expect(content).toContain('## npm-v1.0.0')
    expect(content).toContain('- Custom release notes')
  })

  it('should update existing changelog file preserving header', () => {
    const initialContent = '# Changelog\n\nThis is the changelog.\n\n## npm-v0.1.0\n- Old feature\n'
    writeFileSync(tempFile, initialContent)

    mockedGenerateSummary.mockReturnValue('- New feature')
    process.env.RELEASE_IT_NOTES = ''

    updateChangelog('0.2.0', 'npm', tempFile)

    const content = readFileSync(tempFile, 'utf-8')
    expect(content).toContain('# Changelog\n\nThis is the changelog.')
    expect(content).toContain('## npm-v0.2.0')
    expect(content).toContain('- New feature')
    expect(content).toContain('## npm-v0.1.0')
  })

  it('should handle vscode release type correctly', () => {
    if (existsSync(tempFile)) {
      unlinkSync(tempFile)
    }

    mockedGenerateSummary.mockReturnValue('- VSCode release')
    process.env.RELEASE_IT_NOTES = ''

    updateChangelog('1.0.0', 'vscode', tempFile)

    const content = readFileSync(tempFile, 'utf-8')
    expect(content).toContain('## vscode-v1.0.0')
    expect(content).toContain('- VSCode release')
  })
})
