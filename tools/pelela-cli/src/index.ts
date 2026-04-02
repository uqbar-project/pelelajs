#!/usr/bin/env node

import chalk from 'chalk'
import { Command } from 'commander'
import { initCommand } from './commands/init'
import { initializeI18n, t } from './utils/i18n'
import { checkNewVersion } from './utils/version'

async function main(): Promise<void> {
  await initializeI18n()

  const program = new Command()

  program.name('pelela').description(t('cli.description')).version('1.0.0')

  program
    .command('init [projectName]')
    .description(t('commands.init.description'))
    .action(async (projectName: unknown) => {
      try {
        const name = typeof projectName === 'string' ? projectName : undefined
        await initCommand({ projectName: name })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(chalk.red.bold(`${t('errors.prefix')} `), chalk.red(errorMessage))
        process.exit(1)
      }
    })

  program.parse()

  checkNewVersion()
    .then((versionInfo) => {
      if (versionInfo.hasUpdate) {
        console.log(
          chalk.yellow.bold(
            `\n${t('messages.newVersionAvailable', { version: versionInfo.latest })}`,
          ),
        )
        console.log(chalk.dim(`  ${t('messages.updateCommand')}\n`))
      }
    })
    .catch(() => {
      // Silently ignore version check failures
    })
}

main().catch((error) => {
  console.error(chalk.red.bold(`${t('errors.prefix')} `), chalk.red(String(error)))
  process.exit(1)
})
