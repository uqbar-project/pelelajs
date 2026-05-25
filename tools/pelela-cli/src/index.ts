import chalk from 'chalk'
import { Command } from 'commander'
import semver from 'semver'
import { initCommand } from './commands/init'
import { newCommand } from './commands/new'
import { renameCommand } from './commands/rename'
import { initializeI18n, t } from './utils/i18n'
import { getRequiredNodeVersion } from './utils/nodeVersion'
import { checkNewVersion, getCliVersion } from './utils/version'

const { log, warn } = console

function validateNodeVersion(): void {
  const requiredNodeVersion = getRequiredNodeVersion()
  if (!semver.satisfies(process.version, requiredNodeVersion)) {
    warn(chalk.red.bold(`\n${t('errors.nodeVersion', { requiredVersion: requiredNodeVersion })}\n`))
    warn(chalk.red(`${t('errors.currentVersion', { currentVersion: process.version })}\n`))
    process.exit(1)
  }
}

async function main(): Promise<void> {
  await initializeI18n()
  validateNodeVersion()

  const program = new Command()

  program.name('pelela').description(t('cli.description')).version(getCliVersion())

  program
    .command('init [projectName]')
    .description(t('commands.init.description'))
    .action(async (projectName: string | undefined) => {
      try {
        await initCommand({ projectName })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        warn(chalk.red.bold(`${t('errors.prefix')} `), chalk.red(errorMessage))
        process.exit(1)
      }
    })

  program
    .command('new <path/componentName>')
    .description(t('commands.new.description'))
    .option('--no-css', t('commands.new.options.noCss'))
    .action(async (componentName: string, options: { css: boolean }) => {
      try {
        await newCommand({ componentName, css: options.css })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        warn(chalk.red.bold(`${t('errors.prefix')} `), chalk.red(errorMessage))
        process.exit(1)
      }
    })

  program
    .command('rename <oldComponentName> <newComponentName>')
    .description(t('commands.rename.description'))
    .action(async (oldComponentName: string, newComponentName: string) => {
      try {
        await renameCommand({ oldComponentName, newComponentName })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        warn(chalk.red.bold(`${t('errors.prefix')} `), chalk.red(errorMessage))
        process.exit(1)
      }
    })

  await program.parseAsync(process.argv)

  try {
    const versionInfo = await checkNewVersion()
    if (versionInfo.hasUpdate) {
      log(
        chalk.yellow.bold(
          `\n${t('messages.newVersionAvailable', { version: versionInfo.latest })}`,
        ),
      )
      log(chalk.dim(`  ${t('messages.updateCommand')}\n`))
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    warn(chalk.dim(t('messages.versionCheckFailed', { error: errorMessage })))
  }
}

main().catch((error) => {
  warn(chalk.red.bold(`${t('errors.prefix')} `), chalk.red(String(error)))
  process.exit(1)
})
