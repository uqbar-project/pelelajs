import { describe, expect, it } from 'vitest'
import { updateChangelogContent } from '../scripts/update-changelog'

describe('updateChangelogContent', () => {
  it('should correctly prepend the new entry to the existing content', () => {
    const existingContent = '## v0.1.0\n- Old feature\n'
    const newSummary = '- 🚀 New exciting feature\n- 🐛 Bug fixed'
    const result = updateChangelogContent('0.2.0', existingContent, newSummary)

    expect(result).toBe(
      '## v0.2.0\n- 🚀 New exciting feature\n- 🐛 Bug fixed\n\n## v0.1.0\n- Old feature\n',
    )
  })

  it('should handle empty existing content', () => {
    const existingContent = ''
    const newSummary = '- 🚀 Initial release'
    const result = updateChangelogContent('0.1.0', existingContent, newSummary)

    expect(result).toBe('## v0.1.0\n- 🚀 Initial release\n\n')
  })
})
