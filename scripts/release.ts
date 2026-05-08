import { execSync } from 'node:child_process'
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

const main = (): void => {
  validateEnvironment()

  runCommand('pnpm run biome:check', 'Checking linting and formatting')
  runCommand('pnpm run typecheck', 'Running typecheck')
  runCommand('pnpm run test:coverage', 'Running tests with coverage')
  runCommand('pnpm run build', 'Building packages')

  console.log(chalk.green('\n✅ All checks passed!'))
  console.log(chalk.yellow('\nNext steps:'))
  console.log(chalk.cyan('1. pnpm version [patch|minor|major]'))
  console.log(chalk.cyan('2. cd packages/core && npm publish'))
}

main()
