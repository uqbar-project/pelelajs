import { execSync } from 'node:child_process'

export function getLatestTag(tagPrefix: string): string | null {
  try {
    const tags = execSync(`git tag -l "${tagPrefix}*" --sort=-v:refname`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
    return tags[0] || null
  } catch {
    return null
  }
}

export function getCommits(fromTag: string | null): string[] {
  const range = fromTag ? `${fromTag}..HEAD` : 'HEAD'
  try {
    return execSync(`git log ${range} --oneline`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}

export function generateSummaryContent(commits: string[]): string {
  if (commits.length === 0) {
    return '- Internal improvements and cleanup'
  }

  const rules = [
    { keywords: ['feat', 'add', 'support', 'new'], emoji: '🚀' },
    { keywords: ['fix', 'bug', 'error', 'failing'], emoji: '🐛' },
    { keywords: ['refactor', 'improve', 'update', 'clean'], emoji: '🛠' },
    { keywords: ['i18n', 'translate', 'lang', 't('], emoji: '🌍' },
    { keywords: ['test', '🧪'], emoji: '🧪' },
    { keywords: ['security', 'secure', '🔒', 'lock'], emoji: '🔒' },
    { keywords: ['css', 'style', '🎨'], emoji: '🎨' },
  ]

  const noiseKeywords = ['chore', 'deps', 'typo', 'merge', 'release', 'bump']

  const messages = commits.map((commit) => commit.replace(/^[a-f0-9]+\s+/, '').trim())

  const uniqueImportantChanges = messages
    .filter((message) => {
      const lowerMessage = message.toLowerCase()
      return !noiseKeywords.some((noise) => lowerMessage.includes(noise))
    })
    .filter((message, index, self) => self.indexOf(message) === index)
    .map((message) => {
      const lowerMessage = message.toLowerCase()
      const matchingRule = rules.find((rule) =>
        rule.keywords.some((keyword) => lowerMessage.includes(keyword)),
      )
      const emoji = matchingRule ? matchingRule.emoji : '📝'
      return `- ${emoji} ${message}`
    })

  return uniqueImportantChanges.length === 0
    ? '- Internal changes and performance improvements'
    : uniqueImportantChanges.join('\n')
}

// Only execute if run directly
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('generate-summary.ts')
) {
  const type = process.argv[2] || 'npm'
  const tagPrefix = type === 'vscode' ? 'vscode-v' : 'v'
  const latestTag = getLatestTag(tagPrefix)
  const commits = getCommits(latestTag)
  console.log(generateSummaryContent(commits))
}
