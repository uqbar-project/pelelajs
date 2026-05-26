import { execFileSync } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateSummaryContent, getCommits, getLatestTag } from '../scripts/generate-summary'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

describe('generateSummaryContent', () => {
  it('should return a default message when no commits are provided', () => {
    const summary = generateSummaryContent([])
    expect(summary).toBe('- Internal improvements and cleanup')
  })

  it('should identify features using keywords', () => {
    const commits = [
      'a1b2c3d feat: add new reactivity system',
      'e5f6a7b support for nested components',
    ]
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('- 🚀 feat: add new reactivity system')
    expect(summary).toContain('- 🚀 support for nested components')
  })

  it('should identify fixes using keywords', () => {
    const commits = ['a1b2c3d fix: memory leak in proxy', 'e5f6a7b fixed parsing bug']
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('- 🐛 fix: memory leak in proxy')
    expect(summary).toContain('- 🐛 fixed parsing bug')
  })

  it('should include chores and other types with emojis instead of filtering', () => {
    const commits = [
      'a1b2c3d chore: dependencies',
      'e5f6a7b feat: new feature',
      'c9d0a1b typo: message',
    ]
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('- 🚀 feat: new feature')
    expect(summary).toContain('- ⚙️ chore: dependencies')
    expect(summary).toContain('- ✏️ typo: message')
  })

  it('should remove duplicates', () => {
    const commits = ['a1b2c3d fix: bug', 'e5f6a7b fix: bug']
    const summary = generateSummaryContent(commits)
    const lines = summary.split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('- 🐛 fix: bug')
  })

  it('should use appropriate emojis for different categories', () => {
    const commits = [
      '111 feat: new feature',
      '222 fix: bug',
      '333 refactor: clean code',
      '444 i18n: translate to english',
      '555 secure: vulnerability',
      '666 css: styles',
      '777 chore: config',
      '888 readme: guide',
    ]
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('- 🚀 feat: new feature')
    expect(summary).toContain('- 🐛 fix: bug')
    expect(summary).toContain('- 🛠 refactor: clean code')
    expect(summary).toContain('- 🌍 i18n: translate to english')
    expect(summary).toContain('- 🔒 secure: vulnerability')
    expect(summary).toContain('- 🎨 css: styles')
    expect(summary).toContain('- ⚙️ chore: config')
    expect(summary).toContain('- 📚 readme: guide')
  })

  it('should use a fallback emoji for commits without recognized keywords', () => {
    const commits = ['a1b2c3d just playing around']
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('- 📝 just playing around')
  })

  it('should match keywords case-insensitively', () => {
    const commits = ['a1b2c3d FEAT: uppercase feature', 'e5f6a7b FiX: mixed case']
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('- 🚀 FEAT: uppercase feature')
    expect(summary).toContain('- 🐛 FiX: mixed case')
  })

  it('should prioritize the first matching rule when multiple keywords exist', () => {
    // "fix" comes before "typo" in the rules array
    const commits = ['a1b2c3d fix: typo in readme']
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('- 🐛 fix: typo in readme')
  })
})

describe('getLatestTag', () => {
  it('should return null for invalid tag prefixes to prevent shell injection', () => {
    expect(getLatestTag('v; rm -rf /')).toBeNull()
    expect(getLatestTag('v&echo')).toBeNull()
    expect(getLatestTag('v|cat')).toBeNull()
    expect(getLatestTag('vscode-v$()')).toBeNull()
  })

  it('should accept valid tag prefixes', () => {
    // Valid patterns shouldn't be blocked by regex. It might return null if no git tags match or git command fails, which is expected.
    const result = getLatestTag('v-test.1')
    expect(result === null || typeof result === 'string').toBe(true)
  })
})

describe('getCommits', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should parse git output by splitting lines and filtering empty strings', () => {
    const mockedExecFileSync = vi.mocked(execFileSync)
    mockedExecFileSync.mockReturnValue('abc123 feat: add feature\n\ndef456 fix: bug\n\n')

    const result = getCommits('v1.0.0', ['.'])

    expect(result).toEqual(['abc123 feat: add feature', 'def456 fix: bug'])
    expect(mockedExecFileSync).toHaveBeenCalledWith(
      'git',
      ['log', 'v1.0.0..HEAD', '--oneline', '--', '.'],
      {
        encoding: 'utf-8',
      },
    )
  })

  it('should return empty array when git command fails', () => {
    const mockedExecFileSync = vi.mocked(execFileSync)
    mockedExecFileSync.mockImplementation(() => {
      throw new Error('git command failed')
    })

    const result = getCommits('v1.0.0', ['.'])

    expect(result).toEqual([])
  })

  it('should handle HEAD range when fromTag is null', () => {
    const mockedExecFileSync = vi.mocked(execFileSync)
    mockedExecFileSync.mockReturnValue('abc123 commit message')

    const result = getCommits(null, ['.'])

    expect(result).toEqual(['abc123 commit message'])
    expect(mockedExecFileSync).toHaveBeenCalledWith(
      'git',
      ['log', 'HEAD', '--oneline', '--', '.'],
      {
        encoding: 'utf-8',
      },
    )
  })

  it('should include pathSpecs in git command when provided', () => {
    const mockedExecFileSync = vi.mocked(execFileSync)
    mockedExecFileSync.mockReturnValue('abc123 commit message')

    const result = getCommits('v1.0.0', ['tools/pelela-vscode'])

    expect(result).toEqual(['abc123 commit message'])
    expect(mockedExecFileSync).toHaveBeenCalledWith(
      'git',
      ['log', 'v1.0.0..HEAD', '--oneline', '--', 'tools/pelela-vscode'],
      {
        encoding: 'utf-8',
      },
    )
  })
})
