import chalk from 'chalk'
import { Command } from 'commander'
import { initCommand } from './commands/init'
import { initializeI18n, t } from './utils/i18n'
import { checkNewVersion, getCliVersion } from './utils/version'

const { log, warn } = console

async function main(): Promise<void> {
  await initializeI18n()

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

  program.parse()

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
