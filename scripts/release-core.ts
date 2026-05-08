import { execSync } from 'node:child_process'
import { stdin as input, stdout as output } from 'node:process'
import readline from 'node:readline/promises'
import chalk from 'chalk'

const runCommand = (command: string, description: string): void => {
  console.log(chalk.blue(`\n🚀 ${description}...`))
  try {
    execSync(command, { stdio: 'inherit' })
  } catch (_error) {
    console.error(chalk.red(`\n❌ Error during: ${description}`))
    process.exit(1)
  }
}

const validateEnvironment = (): void => {
  const nodeVersion = process.version
  if (!nodeVersion.startsWith('v22')) {
    console.error(chalk.red(`\n❌ PelelaJS requires Node.js v22. Current: ${nodeVersion}`))
    process.exit(1)
  }
}

const checkGitStatus = (): void => {
  console.log(chalk.blue('\n🔍 Checking git status...'))

  // Check if working directory is clean
  const status = execSync('git status --porcelain', { encoding: 'utf-8' })
  if (status.trim().length > 0) {
    console.error(
      chalk.red(
        '\n❌ Git working directory is not clean. Please commit or stash changes before releasing.',
      ),
    )
    process.exit(1)
  }

  /*
  // Check if we are on main branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
  if (branch !== 'main') {
    console.error(chalk.red(`\n❌ You are on branch "${branch}". Releases must be made from "main" branch.`))
    process.exit(1)
  }
  */
}

const askVersionType = async (): Promise<string> => {
  const rl = readline.createInterface({ input, output })
  const answer = await rl.question(
    chalk.yellow('\n❓ Select version increment type (patch/minor/major) [patch]: '),
  )
  rl.close()

  const type = answer.trim().toLowerCase() || 'patch'
  if (!['patch', 'minor', 'major'].includes(type)) {
    console.error(chalk.red(`\n❌ Invalid version type: ${type}`))
    process.exit(1)
  }
  return type
}

const main = async (): Promise<void> => {
  validateEnvironment()
  checkGitStatus()

  // 1. Quality checks
  runCommand('pnpm run biome:check', 'Checking linting and formatting')
  runCommand('pnpm run typecheck', 'Running typecheck')
  runCommand('pnpm run test:coverage', 'Running tests with coverage')

  // 2. Versioning
  const versionType = await askVersionType()

  const packagesToUpdate = [
    { name: 'root', path: '.' },
    { name: 'core', path: 'packages/core' },
    { name: 'cli', path: 'tools/pelela-cli' },
  ]

  packagesToUpdate.forEach((pkg) => {
    // We use a different approach to avoid EUSAGE/EACCES issues with pnpm version across directories
    // We'll use a subshell to change directory and run the command
    runCommand(
      `cd ${pkg.path} && pnpm version ${versionType} --no-git-tag-version`,
      `Bumping version (${versionType}) in ${pkg.name} (${pkg.path})`,
    )
  })

  // 3. Build
  runCommand('pnpm run build', 'Building packages')

  // 4. Publish
  runCommand(
    'cd packages/core && pnpm publish --no-git-checks --access public',
    'Publishing to NPM',
  )

  // 5. Git Commit, Tag and Push
  const newVersion = JSON.parse(execSync('cat package.json', { encoding: 'utf-8' })).version
  runCommand('git add .', 'Staging changes')
  runCommand(
    `git commit -m "chore: release v${newVersion}"`,
    `Creating release commit v${newVersion}`,
  )
  runCommand(`git tag v${newVersion}`, `Creating git tag v${newVersion}`)
  runCommand('git push origin main --tags', 'Pushing changes and tags to GitHub')

  console.log(chalk.green(`\n✅ Successfully published, tagged and pushed v${newVersion}!`))
}

main().catch((error) => {
  console.error(chalk.red('\n❌ Unexpected error:'), error)
  process.exit(1)
})
