module.exports = {
  git: {
    changelog: 'tsx scripts/generate-summary.ts npm',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
    commitMessage: 'chore: release npm-v${version}',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
    tagName: 'npm-v${version}',
  },
  github: {
    release: true,
    // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
    releaseName: 'npm-v${version}',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
    releaseNotes: 'tsx scripts/extract-changelog.ts ${version}',
  },
  npm: {
    publish: false,
    version: false,
  },
  hooks: {
    'before:release': ['pnpm run biome:check', 'pnpm run typecheck', 'pnpm run test:coverage'],
    'after:bump': [
      'tsx scripts/open-changelog-editor.ts npm',
      // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
      'pnpm --filter pelelajs version ${version} --no-git-tag-version --no-git-checks',
      'cp CHANGELOG.md packages/core/CHANGELOG.md',
      'git add packages/core/CHANGELOG.md',
      'pnpm run build',
    ],
  },
}
