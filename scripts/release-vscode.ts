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

const VALID_VERSION_TYPES = ['patch', 'minor', 'major'] as const
type VersionType = (typeof VALID_VERSION_TYPES)[number]

const VSCODE_EXTENSION_PATH = resolve(__dirname, '..', 'tools', 'pelela-vscode')

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

const validateEnvironment = (): void => {
  const nodeVersion = process.version
  const requiredVersion = '>=22.0.0'
  if (!semver.satisfies(nodeVersion, requiredVersion)) {
    console.error(
      chalk.red(`\n❌ PelelaJS requires Node.js ${requiredVersion}. Current: ${nodeVersion}`),
    )
    process.exit(1)
  }
}

const checkGitStatus = (): void => {
  console.log(chalk.blue('\n🔍 Checking git status...'))

  const status = execSync('git status --porcelain', { encoding: 'utf-8' })
  if (status.trim().length > 0) {
    console.error(
      chalk.red(
        '\n❌ Git working directory is not clean. Please commit or stash changes before releasing.',
      ),
    )
    process.exit(1)
  }

  // TODO: re-enable this check once we have a release workflow
  // const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
  // if (branch !== 'main') {
  //   console.error(
  //     chalk.red(`\n❌ You are on branch "${branch}". Releases must be made from "main" branch.`),
  //   )
  //   process.exit(1)
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

  console.log(chalk.cyan('\n📦 Releasing pelela-vscode extension\n'))

  // 1. Run extension tests
  runCommand('pnpm test', 'Running VSCode extension tests', VSCODE_EXTENSION_PATH)

  // 2. Versioning (independent from NPM packages)
  const versionType = await resolveVersionType()

  runCommand(
    `pnpm version ${versionType} --no-git-tag-version`,
    `Bumping version (${versionType}) in pelela-vscode`,
    VSCODE_EXTENSION_PATH,
  )

  // 3. Build
  runCommand('pnpm run build', 'Building extension', VSCODE_EXTENSION_PATH)

  // 4. Package
  runCommand('pnpm run package', 'Packaging VSIX', VSCODE_EXTENSION_PATH)

  // 5. Publish to VSCode Marketplace
  runCommand(
    'pnpm run publish:marketplace',
    'Publishing to VSCode Marketplace',
    VSCODE_EXTENSION_PATH,
  )

  // 6. Publish to OpenVSX
  const vsixFile = getVsixFilename()
  runCommand(
    `npx -y ovsx publish ${vsixFile}`,
    'Publishing to OpenVSX',
    VSCODE_EXTENSION_PATH,
  )

  // 7. Git Commit, Tag and Push
  const newVersion = readExtensionVersion()
  const tagName = `vscode-v${newVersion}`

  runCommand('git add .', 'Staging changes')
  runCommand(
    `git commit -m "chore: release pelela-vscode ${tagName}"`,
    `Creating release commit ${tagName}`,
  )
  runCommand(`git tag ${tagName}`, `Creating git tag ${tagName}`)
  runCommand('git push origin main --tags', 'Pushing changes and tags to GitHub')

  console.log(
    chalk.green(`\n✅ Successfully published pelela-vscode ${tagName} to Marketplace and OpenVSX!`),
  )
}

const readExtensionVersion = (): string =>
  JSON.parse(readFileSync(resolve(VSCODE_EXTENSION_PATH, 'package.json'), 'utf-8')).version

const getVsixFilename = (): string => {
  const version = readExtensionVersion()
  return `pelela-vscode-${version}.vsix`
}

main().catch((error) => {
  console.error(chalk.red('\n❌ Unexpected error:'), error)
  process.exit(1)
})
