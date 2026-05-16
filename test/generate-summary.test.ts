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

  it('should include chores and other types with emojis instead of filtering', () => {
    const commits = [
      'a1b2c3d chore: update dependencies',
      'e5f6g7h feat: new feature',
      'i9j0k1l typo in readme',
    ]
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('🚀 new feature')
    expect(summary).toContain('⚙️ chore: update dependencies')
    expect(summary).toContain('✏️ typo in readme')
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
      '777 chore: config',
      '888 doc: add guide',
    ]
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('🚀')
    expect(summary).toContain('🐛')
    expect(summary).toContain('🛠')
    expect(summary).toContain('🌍')
    expect(summary).toContain('🔒')
    expect(summary).toContain('🎨')
    expect(summary).toContain('⚙️')
    expect(summary).toContain('📚')
  })

  it('should use a fallback emoji for commits without recognized keywords', () => {
    const commits = ['a1b2c3d just playing around']
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('📝 just playing around')
  })

  it('should match keywords case-insensitively', () => {
    const commits = ['a1b2c3d FEAT: uppercase feature', 'e5f6g7h FiX: mixed case']
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('🚀 FEAT: uppercase feature')
    expect(summary).toContain('🐛 FiX: mixed case')
  })

  it('should prioritize the first matching rule when multiple keywords exist', () => {
    // "fix" comes before "typo" in the rules array
    const commits = ['a1b2c3d fix: typo in readme']
    const summary = generateSummaryContent(commits)
    expect(summary).toContain('🐛 fix: typo in readme')
  })
})
