import { describe, expect, it } from 'vitest'
import { generateSummaryContent } from '../scripts/generate-summary'

describe('generateSummaryContent', () => {
  it('should return a default message when no commits are provided', () => {
    const summary = generateSummaryContent([])
    expect(summary).toBe('- Internal improvements and cleanup')
  })

  it('should identify features using keywords', () => {
    const commits = [
      'a1b2c3d feat: add new reactivity system',
      'e5f6g7h support for nested components',
    ]
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('🚀 add new reactivity system')
    expect(summary).toContain('🚀 support for nested components')
  })

  it('should identify fixes using keywords', () => {
    const commits = ['a1b2c3d fix: memory leak in proxy', 'e5f6g7h fixed parsing bug']
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('🐛 fix: memory leak in proxy')
    expect(summary).toContain('🐛 fixed parsing bug')
  })

  it('should filter out noise', () => {
    const commits = [
      'a1b2c3d chore: update dependencies',
      'e5f6g7h feat: new feature',
      'i9j0k1l typo in readme',
    ]
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('🚀 new feature')
    expect(summary).not.toContain('chore')
    expect(summary).not.toContain('typo')
  })

  it('should remove duplicates', () => {
    const commits = ['a1b2c3d fix: bug', 'e5f6g7h fix: bug']
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
      '555 security: fix vulnerability',
      '666 css: add styles',
    ]
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('🚀')
    expect(summary).toContain('🐛')
    expect(summary).toContain('🛠')
    expect(summary).toContain('🌍')
    expect(summary).toContain('🔒')
    expect(summary).toContain('🎨')
  })

  it('should return a specific message when all commits are filtered as noise', () => {
    const commits = ['a1b2c3d chore: update', 'e5f6g7h bump version']
    const summary = generateSummaryContent(commits)
    expect(summary).toBe('- Internal changes and performance improvements')
  })
})
