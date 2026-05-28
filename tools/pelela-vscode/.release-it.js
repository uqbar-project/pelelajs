const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { fileURLToPath } = require('node:url')

// Get the CHANGELOG path - one level up from tools/pelela-vscode
const __filename = fileURLToPath(new URL(import.meta.url))
const changelogPath = resolve(__filename, '../../..', 'CHANGELOG.md')

module.exports = {
  git: {
    changelog: 'pnpm tsx ../../scripts/generate-summary.ts vscode',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
    commitMessage: 'chore: release vscode-v${version}',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
    tagName: 'vscode-v${version}',
    requireCleanWorkingDir: false,
  },
  github: {
    release: true,
    // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
    releaseName: 'vscode-v${version}',
    releaseNotes(context) {
      // Read the root CHANGELOG.md that the user edited
      const changelog = readFileSync(changelogPath, 'utf-8')

      // Extract the section for the current version
      const version = context.version
      const regex = new RegExp(
        `## (?:npm-v|vscode-v)?${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?\\n([\\s\\S]*?)(?=\\n## |$)`
      )
      const match = changelog.match(regex)

      return match ? match[1].trim() : ''
    },
  },
  npm: {
    publish: false,
  },
  hooks: {
    'after:bump': [
      'pnpm tsx ../../scripts/open-changelog-editor.ts vscode',
      'pnpm run build',
      'pnpm run package',
    ],
    'after:release': [
      'pnpm run publish:marketplace',
      'pnpm run publish:openvsx',
      // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
      'echo "✅ Successfully published vscode-v${version} to Marketplace and OpenVSX!"',
    ],
  },
}
