import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { stdin as input, stdout as output } from 'node:process'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import chalk from 'chalk'
import semver from 'semver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootPackageJsonPath = resolve(__dirname, '..', 'package.json')

const VALID_VERSION_TYPES = ['patch', 'minor', 'major'] as const
type VersionType = (typeof VALID_VERSION_TYPES)[number]

interface RootPackageJson {
  engines: { node: string }
  version: string
}

const isValidVersionType = (value: string): value is VersionType =>
  (VALID_VERSION_TYPES as readonly string[]).includes(value)

interface ExecError extends Error {
  status?: number
  stderr?: Buffer | string
}

const runCommand = (command: string, description: string, cwd?: string): void => {
  console.log(chalk.blue(`\n🚀 ${description}...`))
  try {
    execSync(command, { stdio: 'inherit', cwd })
  } catch (err: unknown) {
    const error = err as ExecError
    console.error(chalk.red(`\n❌ Error during: ${description}`))
    if (error.message) console.error(chalk.red(`Message: ${error.message}`))
    if (error.stderr) console.error(chalk.red(`Stderr: ${error.stderr.toString()}`))

    process.exit(error.status || 1)
  }
}

const readRootPackageJson = (): RootPackageJson =>
  JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as RootPackageJson

const validateEnvironment = (): void => {
  const nodeVersion = process.version
  const requiredNodeVersion = readRootPackageJson().engines.node
  if (!semver.satisfies(nodeVersion, requiredNodeVersion)) {
    console.error(
      chalk.red(`\n❌ PelelaJS requires Node.js ${requiredNodeVersion}. Current: ${nodeVersion}`),
    )
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

  // Check if we are on main branch
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
  if (branch !== 'main') {
    console.error(
      chalk.red(`\n❌ You are on branch "${branch}". Releases must be made from "main" branch.`),
    )
    process.exit(1)
  }
}

/**
 * Resolves the version bump type from a CLI argument (CI mode) or
 * from an interactive prompt (local mode). Exits on invalid input.
 */
const resolveVersionType = async (): Promise<VersionType> => {
  const argType = process.argv[2]?.toLowerCase()

  if (argType !== undefined) {
    if (!isValidVersionType(argType)) {
      console.error(
        chalk.red(`\n❌ Invalid version type: "${argType}". Expected: patch | minor | major`),
      )
      process.exit(1)
    }
    console.log(chalk.cyan(`\n📌 Version type from argument: ${argType}`))
    return argType
  }

  const rl = readline.createInterface({ input, output })
  const answer = await rl.question(
    chalk.yellow('\n❓ Select version increment type (patch/minor/major) [patch]: '),
  )
  rl.close()

  const type = answer.trim().toLowerCase() || 'patch'
  if (!isValidVersionType(type)) {
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
  const versionType = await resolveVersionType()

  const packagesToUpdate = [
    { name: 'root', path: '.' },
    { name: 'core', path: 'packages/core' },
    { name: 'plugin', path: 'packages/vite-plugin-pelelajs' },
    { name: 'cli', path: 'tools/pelela-cli' },
  ]

  packagesToUpdate.forEach((pkg) => {
    runCommand(
      `pnpm version ${versionType} --no-git-tag-version`,
      `Bumping version (${versionType}) in ${pkg.name} (${pkg.path})`,
      pkg.path,
    )
  })

  // 3. Build
  runCommand('pnpm run build', 'Building packages')

  // 4. Publish
  runCommand(
    'pnpm publish --no-git-checks --access public',
    'Publishing Core to NPM',
    'packages/core',
  )

  runCommand(
    'pnpm publish --no-git-checks --access public',
    'Publishing Vite Plugin to NPM',
    'packages/vite-plugin-pelelajs',
  )

  // 5. Git Commit, Tag and Push
  const newVersion = readRootPackageJson().version

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
