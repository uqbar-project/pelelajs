import { execFileSync } from 'node:child_process'

export function getLatestTag(tagPrefix: string): string | null {
  if (!/^[A-Za-z0-9._-]+$/.test(tagPrefix)) {
    return null
  }
  try {
    const tags = execFileSync('git', ['tag', '-l', `${tagPrefix}*`, '--sort=-v:refname'], {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
    return tags[0] || null
  } catch {
    return null
  }
}

export function getCommits(fromTag: string | null, pathSpecs?: string[]): string[] {
  const range = fromTag ? `${fromTag}..HEAD` : 'HEAD'
  const args = ['log', range, '--oneline']
  if (pathSpecs?.length) {
    args.push('--', ...pathSpecs)
  }
  try {
    return execFileSync('git', args, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean)
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
    {
      keywords: ['chore', 'deps', 'config', 'release', 'bump', 'setup', 'workflow', 'ci'],
      emoji: '⚙️',
    },
    { keywords: ['doc', 'readme', 'manual', 'guide'], emoji: '📚' },
    { keywords: ['task', 'todo', 'migrate'], emoji: '📋' },
    { keywords: ['merge'], emoji: '🔀' },
    { keywords: ['typo'], emoji: '✏️' },
  ]

  const messages = commits.map((commit) => commit.replace(/^[a-f0-9]+\s+/, '').trim())

  const uniqueChanges = messages
    .filter((message, index, self) => self.indexOf(message) === index)
    .map((message) => {
      const lowerMessage = message.toLowerCase()
      const matchingRule = rules.find((rule) =>
        rule.keywords.some((keyword) => lowerMessage.includes(keyword)),
      )
      const emoji = matchingRule ? matchingRule.emoji : '📝'
      return `- ${emoji} ${message}`
    })

  return uniqueChanges.length === 0
    ? '- Internal changes and performance improvements'
    : uniqueChanges.join('\n')
}

type ReleaseType = 'npm' | 'vscode'

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('generate-summary.ts')
) {
  const type = (process.argv[2] as ReleaseType) || 'npm'
  const isVsCode = type === 'vscode'
  const tagPrefix = isVsCode ? 'vscode-v' : 'v'

  const pathSpecs = isVsCode ? ['tools/pelela-vscode'] : ['.', ':^tools/pelela-vscode']

  const latestTag = getLatestTag(tagPrefix)
  const commits = getCommits(latestTag, pathSpecs)

  const filteredCommits = commits.filter((commit) => {
    if (isVsCode) return true
    const lowerCommit = commit.toLowerCase()
    const vscodeKeywords = ['vscode', 'marketplace', 'extension']
    return !vscodeKeywords.some((keyword) => lowerCommit.includes(keyword))
  })

  console.log(generateSummaryContent(filteredCommits))
}
