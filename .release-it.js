import { readFileSync } from 'node:fs'

export default {
    git: {
        changelog: 'tsx scripts/generate-summary.ts npm',
        commitMessage: 'chore: release npm-v${version}',
        tagName: 'npm-v${version}',
    },
    github: {
        release: true,
        releaseName: 'npm-v${version}',
        releaseNotes(context) {
            // Read the updated CHANGELOG.md that the user edited
            const changelog = readFileSync('CHANGELOG.md', 'utf-8')

            // Extract the section for the current version
            const version = context.version
            const regex = new RegExp(`## \\[?${version}\\]?.*?\\n([\\s\\S]*?)(?=\\n## \\[?|$)`)
            const match = changelog.match(regex)

            return match ? match[1].trim() : ''
        },
    },
    npm: {
        publish: false,
        version: false,
    },
    hooks: {
        'after:bump': [
            'tsx scripts/open-changelog-editor.ts npm',
            'pnpm --filter pelelajs version ${version} --no-git-tag-version --no-git-checks',
            'cp CHANGELOG.md packages/core/CHANGELOG.md',
            'git add packages/core/CHANGELOG.md',
            'pnpm run build',
        ],
    },
}
