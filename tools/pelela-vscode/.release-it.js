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
    // biome-ignore lint/suspicious/noTemplateCurlyInString: release-it placeholder
    releaseNotes: 'tsx ../../scripts/extract-changelog.ts ${version} ../../CHANGELOG.md',
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
