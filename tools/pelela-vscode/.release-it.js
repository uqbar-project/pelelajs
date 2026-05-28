import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Get the CHANGELOG path - one level up from tools/pelela-vscode
const changelogPath = resolve(new URL(import.meta.url).pathname, '../../..', 'CHANGELOG.md')

export default {
    git: {
        changelog: 'pnpm tsx ../../scripts/generate-summary.ts vscode',
        commitMessage: 'chore: release vscode-v${version}',
        tagName: 'vscode-v${version}',
        requireCleanWorkingDir: false,
    },
    github: {
        release: true,
        releaseName: 'vscode-v${version}',
        releaseNotes(context) {
            // Read the root CHANGELOG.md that the user edited
            const changelog = readFileSync(changelogPath, 'utf-8')

            // Extract the section for the current version
            const version = context.version
            const regex = new RegExp(`## \\[?${version}\\]?.*?\\n([\\s\\S]*?)(?=\\n## \\[?|$)`)
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
            'echo "✅ Successfully published vscode-v${version} to Marketplace and OpenVSX!"',
        ],
    },
}
